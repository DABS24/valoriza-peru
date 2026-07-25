/**
 * Guards de acceso a los Route Handlers de los PORTALES. Igual que
 * lib/auth/apiGuards.ts pero portal-aware: el rol sale de `portal_miembros`, no
 * de perfiles. Devuelven una Response JSON con el status correcto (no redirect).
 */

import { NextResponse } from "next/server";

import { createClient, getUser } from "@/lib/supabase/server";
import { esStaffPortal, esAdminPortal, esEmpresario, type PortalRol } from "@/lib/portales/roles";
import type { PortalSlug } from "@/lib/portales/config";

/**
 * Resultado de un guard de API. Incluye `nombre` porque la bitácora lo SELLA en
 * cada evento (0091): así el registro sigue diciendo quién actuó aunque después se
 * borre la cuenta. Sin esto en el guard, los handlers no tenían de dónde sacarlo y
 * el snapshot quedaba siempre vacío — la migración existía y nadie la usaba.
 */
type GuardOk = { ok: true; userId: string; rol: PortalRol; nombre: string | null };
type GuardFail = { ok: false; response: NextResponse };

/**
 * Resuelve la membresía ACTIVA del usuario en el portal (rol y nombre incluidos) o
 * falla. Todo va dentro de un try: un fallo de auth devuelve 401 limpio, nunca 500.
 */
async function resolverMiembro(portal: PortalSlug): Promise<GuardOk | GuardFail> {
  const user = await getUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "sin_sesion" }, { status: 401 }) };
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("portal_miembros")
    .select("rol, estado, nombre")
    .eq("portal", portal)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data || data.estado !== "activo") {
    return { ok: false, response: NextResponse.json({ error: "no_es_miembro" }, { status: 403 }) };
  }
  return {
    ok: true,
    userId: user.id,
    rol: data.rol as PortalRol,
    nombre: (data.nombre as string | null) ?? null,
  };
}

/** Exige sesión + membresía activa (cualquier rol) del portal. */
export async function requirePortalMiembroApi(portal: PortalSlug): Promise<GuardOk | GuardFail> {
  try {
    return await resolverMiembro(portal);
  } catch {
    return { ok: false, response: NextResponse.json({ error: "sin_sesion" }, { status: 401 }) };
  }
}

/** Exige sesión + rol STAFF (asesor/admin) del portal. */
export async function requirePortalStaffApi(portal: PortalSlug): Promise<GuardOk | GuardFail> {
  try {
    const r = await resolverMiembro(portal);
    if (!r.ok) return r;
    if (!esStaffPortal(r.rol)) {
      return { ok: false, response: NextResponse.json({ error: "no_autorizado" }, { status: 403 }) };
    }
    return r;
  } catch {
    return { ok: false, response: NextResponse.json({ error: "sin_sesion" }, { status: 401 }) };
  }
}

/** Exige sesión + rol ADMIN del portal. */
export async function requirePortalAdminApi(portal: PortalSlug): Promise<GuardOk | GuardFail> {
  try {
    const r = await resolverMiembro(portal);
    if (!r.ok) return r;
    if (!esAdminPortal(r.rol)) {
      return { ok: false, response: NextResponse.json({ error: "no_autorizado" }, { status: 403 }) };
    }
    return r;
  } catch {
    return { ok: false, response: NextResponse.json({ error: "sin_sesion" }, { status: 401 }) };
  }
}

/**
 * Exige sesión + rol EMPRESARIO (prestatario con cuenta). Su lado NO tiene RLS
 * propia (hardening 0081): las rutas que pasan esta guard operan con service_role y
 * DEBEN acotar a SU prestatario (data.ts lo resuelve por user_id).
 */
export async function requirePortalEmpresarioApi(portal: PortalSlug): Promise<GuardOk | GuardFail> {
  try {
    const r = await resolverMiembro(portal);
    if (!r.ok) return r;
    if (!esEmpresario(r.rol)) {
      return { ok: false, response: NextResponse.json({ error: "no_autorizado" }, { status: 403 }) };
    }
    return r;
  } catch {
    return { ok: false, response: NextResponse.json({ error: "sin_sesion" }, { status: 401 }) };
  }
}
