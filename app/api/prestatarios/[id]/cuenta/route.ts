/**
 * Crear la CUENTA DE ACCESO (empresario) de un PRESTATARIO (contratista) — SOLO
 * ADMIN del portal.
 *
 * POST /api/prestatarios/:id/cuenta  { email, telefono? }
 *
 * Le da al contratista su propio login a un dashboard de solo-ver. Reimplementa la
 * autorización a mano (requirePortalAdminApi) porque usa service_role: crea/reusa
 * el auth user (mismo patrón que /usuarios), inserta la membresía `empresario`, y
 * liga `portal_prestatarios.user_id` con un UPDATE condicional atómico (respeta el
 * índice único `portal_prestatarios_user_idx`: un contratista → una cuenta). Si algo
 * falla después de crear la cuenta nueva, se hace rollback para no dejar huérfanos.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createAdminClient, buscarUsuarioPorEmail } from "@/lib/supabase/admin";
import { requirePortalAdminApi } from "@/lib/portales/apiGuards";
import { PORTAL_SLUG, portalPorSlug } from "@/lib/portales/config";
import { TELEFONO_REGEX } from "@/lib/portales/constants";
import { APP } from "@/lib/constants";
import { correoPortalAcceso } from "@/lib/email/templates";
import { enviarCorreo, remitentePortal } from "@/lib/email/resend";
import { registrarEventoPortal } from "@/lib/portales/auditoria";

const err = (code: string, status = 400) => NextResponse.json({ error: code }, { status });

const bodySchema = z.object({
  email: z.string().trim().email(),
  telefono: z.string().trim().regex(TELEFONO_REGEX).optional().or(z.literal("")),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const portal = PORTAL_SLUG;
  const { id } = await ctx.params;
  if (!portalPorSlug(portal)?.prestatarios) return err("no_aplica", 404);
  if (!z.string().uuid().safeParse(id).success) return err("id_invalido", 404);

  const guard = await requirePortalAdminApi(portal);
  if (!guard.ok) return guard.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return err("body_invalido");
  const email = parsed.data.email.toLowerCase();
  const telefono =
    parsed.data.telefono && parsed.data.telefono.length ? parsed.data.telefono : null;

  const admin = createAdminClient();

  // ── 1 · El prestatario existe, es de este portal y NO tiene cuenta aún ──
  const { data: prest } = await admin
    .from("portal_prestatarios")
    .select("id, nombre, user_id")
    .eq("portal", portal)
    .eq("id", id)
    .maybeSingle();
  if (!prest) return err("no_encontrado", 404);
  if (prest.user_id) return err("ya_tiene_cuenta", 409);

  // ── 2 · Resolver la cuenta de auth (reusar o crear) ──
  let userId: string | null = null;
  let reusado = false;
  const { data: creado, error: eUser } = await admin.auth.admin.createUser({
    email,
    password: `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, ""),
    email_confirm: true,
    user_metadata: { nombres: prest.nombre },
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

  // Limpia la cuenta SOLO si la creamos recién (nunca una reusada).
  const rollbackUser = async () => {
    if (!reusado && userId) await admin.auth.admin.deleteUser(userId).catch(() => {});
  };

  // ── 3 · ¿Ya es miembro de ESTE portal (con cualquier rol)? ──
  const { data: yaMiembro } = await admin
    .from("portal_miembros")
    .select("user_id")
    .eq("portal", portal)
    .eq("user_id", userId)
    .maybeSingle();
  if (yaMiembro) {
    await rollbackUser();
    return err("ya_es_miembro", 409);
  }

  // ── 4 · Membresía empresario ──
  const { error: eMiembro } = await admin.from("portal_miembros").insert({
    portal,
    user_id: userId,
    rol: "empresario",
    nombre: prest.nombre,
    telefono,
    estado: "activo",
    creado_por: guard.userId,
  });
  if (eMiembro) {
    await rollbackUser();
    return err("error_miembro", 500);
  }

  // ── 5 · Ligar el prestatario a la cuenta (UPDATE condicional atómico) ──
  // `and user_id is null` evita el double-claim (dos altas a la vez) y el índice
  // único blinda "una cuenta ↔ un contratista". 0 filas ⇒ otro ganó / ya se ligó.
  const { data: ligado, error: eLink } = await admin
    .from("portal_prestatarios")
    .update({ user_id: userId })
    .eq("portal", portal)
    .eq("id", id)
    .is("user_id", null)
    .select("id");
  if (eLink || !ligado || ligado.length === 0) {
    // Rollback: sacar la membresía recién creada y la cuenta si era nueva.
    await admin.from("portal_miembros").delete().eq("portal", portal).eq("user_id", userId);
    await rollbackUser();
    return err("ya_tiene_cuenta", 409);
  }

  // ── 6 · Correo de acceso (solo para cuentas NUEVAS) ──
  // Marca, remitente y destino del enlace son los del PORTAL: la empresa recibe una
  // invitación de su portal, no de Efectivo, y el enlace la deja en el login del
  // portal (donde su cuenta sí existe).
  let correoEnviado = false;
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
    accion: "empresario_cuenta_creada",
    entidad: "portal_prestatarios",
    entidadId: id,
    datos: { user_id: userId, reusado },
    req,
  });

  return NextResponse.json({ ok: true, userId, reusado, correoEnviado });
}
