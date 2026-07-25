/**
 * Alta de miembros de un PORTAL — SOLO ADMIN del portal.
 *
 * POST /api/usuarios  { nombre, email, telefono?, rol, asesorId? }
 *
 * `portal_miembros` NO tiene policy de insert para authenticated (0076: la
 * escritura es SOLO por service_role). Por eso el alta va con el admin client,
 * y REIMPLEMENTAMOS la autorización a mano: requirePortalAdminApi verifica que el
 * que llama sea admin de ESTE portal.
 *
 * El humano puede YA existir en auth (p.ej. es miembro del otro portal o usuario
 * de Efectivo). En ese caso se REUSA su cuenta y solo se agrega la membresía; no
 * se le manda correo (ya tiene acceso). Si es nuevo, se crea con clave aleatoria
 * que nadie ve + correo de recuperación (mismo patrón que /api/admin/empresas).
 *
 * CONVERSIÓN DE PROSPECTO (0090): si viene `prospectoId`, esta alta es el momento
 * en que alguien que ya operó recibe su cuenta —que es la regla del negocio: la
 * cuenta se crea DESPUÉS de la operación—. Sus reservas y sus notas pasan a colgar
 * también de la cuenta nueva, sin copiarse: las mismas filas ganan `cliente_id` y
 * conservan `prospecto_id` como procedencia. Lo hace `portal_convertir_prospecto`,
 * llamada con la SESIÓN del admin (no con service_role: ahí `auth.uid()` sería
 * null y el guard de la función no significaría nada).
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createAdminClient, buscarUsuarioPorEmail } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requirePortalAdminApi } from "@/lib/portales/apiGuards";
import { PORTAL_SLUG, portalPorSlug } from "@/lib/portales/config";
import { TELEFONO_REGEX } from "@/lib/portales/constants";
import { APP } from "@/lib/constants";
import { correoPortalAcceso } from "@/lib/email/templates";
import { enviarCorreo, remitentePortal } from "@/lib/email/resend";
import { registrarEventoPortal } from "@/lib/portales/auditoria";

const err = (code: string, status = 400) => NextResponse.json({ error: code }, { status });

const bodySchema = z.object({
  nombre: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  telefono: z.string().trim().regex(TELEFONO_REGEX).optional().or(z.literal("")),
  rol: z.enum(["cliente", "asesor", "admin"]),
  asesorId: z.string().uuid().optional().or(z.literal("")),
  /** Prospecto al que esta cuenta le da acceso: su historial se le liga (0090). */
  prospectoId: z.string().uuid().optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  const portal = PORTAL_SLUG;

  const guard = await requirePortalAdminApi(portal);
  if (!guard.ok) return guard.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return err("body_invalido");
  const b = parsed.data;
  const email = b.email.toLowerCase();
  const telefono = b.telefono && b.telefono.length ? b.telefono : null;

  const admin = createAdminClient();

  // Si es cliente y trae asesor, el asesor debe ser staff ACTIVO de este portal.
  let asesorId: string | null = null;
  if (b.rol === "cliente" && b.asesorId && b.asesorId.length) {
    const { data: asesor } = await admin
      .from("portal_miembros")
      .select("rol, estado")
      .eq("portal", portal)
      .eq("user_id", b.asesorId)
      .maybeSingle();
    if (!asesor || asesor.estado !== "activo" || !["asesor", "admin"].includes(asesor.rol)) {
      return err("asesor_invalido");
    }
    asesorId = b.asesorId;
  }

  // ── 1 · Resolver la cuenta de auth (reusar o crear) ──
  let userId: string | null = null;
  let correoEnviado = false;
  let reusado = false;

  const { data: creado, error: eUser } = await admin.auth.admin.createUser({
    email,
    password: `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, ""),
    email_confirm: true,
    user_metadata: { nombres: b.nombre },
  });

  if (creado?.user) {
    userId = creado.user.id;
  } else if (/already|registered|exists/i.test(eUser?.message ?? "")) {
    userId = await buscarUsuarioPorEmail(admin, email);
    reusado = true;
    if (!userId) return err("email_ya_existe", 409);
  } else {
    return err("error_usuario", 500);
  }

  // ── 2 · ¿Ya es miembro de ESTE portal? ──
  const { data: yaMiembro } = await admin
    .from("portal_miembros")
    .select("user_id")
    .eq("portal", portal)
    .eq("user_id", userId)
    .maybeSingle();
  if (yaMiembro) return err("ya_es_miembro", 409);

  // ── 3 · Insertar la membresía (service_role) ──
  const { error: eMiembro } = await admin.from("portal_miembros").insert({
    portal,
    user_id: userId,
    rol: b.rol,
    nombre: b.nombre,
    telefono,
    asesor_id: asesorId,
    estado: "activo",
    creado_por: guard.userId,
  });
  if (eMiembro) {
    // Si la cuenta de auth se creó recién (no reusada) y la membresía falla, no
    // dejamos una cuenta huérfana sin ninguna membresía.
    if (!reusado && userId) await admin.auth.admin.deleteUser(userId).catch(() => {});
    return err("error_miembro", 500);
  }

  // ── 3.b · Conversión del prospecto, si esta alta es la de alguien que el asesor
  //          ya trabajaba desde antes. Con la SESIÓN del admin (auth.uid() real).
  //          Best-effort en el sentido de que NO tumba el alta: la cuenta ya está
  //          creada y volver atrás sería peor. Se reporta en la respuesta y en la
  //          bitácora para que el admin sepa si el historial quedó ligado. ──
  let prospectoConvertido: string | null = null;
  if (b.rol === "cliente" && b.prospectoId && b.prospectoId.length) {
    const supabase = await createClient();
    const { data: conv } = await supabase.rpc("portal_convertir_prospecto", {
      p_portal: portal,
      p_prospecto: b.prospectoId,
      p_user: userId,
    });
    prospectoConvertido = (conv as string) === "ok" ? b.prospectoId : null;
  }

  // ── 4 · Correo de acceso (solo para cuentas NUEVAS) ──
  // Todo el ciclo vive dentro del portal: plantilla y remitente con la marca del
  // portal, y el enlace vuelve a SU pantalla de contraseña. Antes esto usaba la
  // plantilla de Efectivo apuntando a /nueva-clave de Efectivo, y el inversionista
  // terminaba en un login donde no tiene perfil: nunca llegaba a su portal.
  if (!reusado) {
    const cfg = portalPorSlug(portal);
    const marca = cfg?.nombreCorto ?? "";
    const { data: link } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${APP.url}/nueva-clave` },
    });
    if (link?.properties?.action_link) {
      const { subject, html, text } = correoPortalAcceso({
        marca,
        url: link.properties.action_link,
      });
      correoEnviado = await enviarCorreo({
        to: email,
        subject,
        html,
        text,
        from: remitentePortal(marca),
      });
    }
  }

  await registrarEventoPortal({
    portal,
    actorId: guard.userId,
    actorRol: guard.rol,
    actorNombre: guard.nombre,
    accion: "usuario_creado",
    entidad: "portal_miembros",
    entidadId: userId,
    datos: { rol: b.rol, reusado, asesor_id: asesorId, prospecto_id: prospectoConvertido },
    req,
  });

  return NextResponse.json({ ok: true, userId, reusado, correoEnviado, prospectoConvertido });
}
