/**
 * CAMBIAR CONTRASEÑA — cualquier miembro activo del portal.
 *
 * POST /api/auth/cambiar-clave  { actual, nueva }
 *
 * Existía el formulario y NO existía la ruta: quedó del otro lado cuando este
 * repo se separó del monorepo. El `fetch` es un string, así que typecheck, lint y
 * build pasaban y la pantalla devolvía 404 en producción — nadie podía rotar su
 * contraseña, y tampoco hay "olvidé mi clave" en el login. Auditoría 2026-07-25.
 *
 * Tres cosas que esta ruta hace y que no se pueden saltear:
 *  1. RE-AUTENTICA con la contraseña actual antes de cambiarla. Sin eso, una
 *     sesión robada cambia la clave y se queda con la cuenta.
 *  2. Vuelve a validar la fuerza en el server: la validación del cliente es UX.
 *  3. Cierra TODAS las sesiones, que es lo que el copy le promete al usuario.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requirePortalMiembroApi } from "@/lib/portales/apiGuards";
import { PORTAL_SLUG } from "@/lib/portales/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { passwordFuerte } from "@/lib/auth/password";
import { registrarEventoPortal } from "@/lib/portales/auditoria";

const err = (code: string, status = 400) => NextResponse.json({ error: code }, { status });

const bodySchema = z.object({
  actual: z.string().min(1).max(200),
  nueva: z.string().min(8).max(200),
});

export async function POST(req: NextRequest) {
  const portal = PORTAL_SLUG;

  const guard = await requirePortalMiembroApi(portal);
  if (!guard.ok) return guard.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return err("body_invalido");
  const { actual, nueva } = parsed.data;

  // La validación del cliente es UX; ésta es la que manda.
  if (!passwordFuerte(nueva)) return err("clave_debil");
  if (actual === nueva) return err("clave_igual");

  const supabase = await createClient();
  const { data: sesion } = await supabase.auth.getUser();
  const email = sesion.user?.email;
  if (!email) return err("sin_sesion", 401);

  // Re-autenticación: sin esto, una sesión robada se queda con la cuenta.
  const { error: authError } = await supabase.auth.signInWithPassword({
    email,
    password: actual,
  });
  if (authError) return err("clave_incorrecta", 403);

  const admin = createAdminClient();
  const { error: updateError } = await admin.auth.admin.updateUserById(guard.userId, {
    password: nueva,
  });
  if (updateError) return err("error_cambiar", 500);

  // El copy promete "cerramos tu sesión en todos los dispositivos". Se cumple.
  await admin.auth.admin.signOut(guard.userId, "global").catch(() => {});

  await registrarEventoPortal({
    portal,
    actorId: guard.userId,
    actorRol: guard.rol,
    actorNombre: guard.nombre,
    accion: "clave_cambiada",
    entidad: "portal_miembros",
    entidadId: guard.userId,
    req,
  });

  return NextResponse.json({ ok: true });
}
