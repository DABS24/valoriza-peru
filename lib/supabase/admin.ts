/**
 * Cliente Supabase con service_role. SALTA la RLS — poder total sobre la base.
 *
 * ⚠️ USO EXCLUSIVO server-side (Server Actions / Route Handlers) para
 * operaciones privilegiadas del sistema: escribir eventos_auditoria, emitir
 * boleta, insertar notificaciones de sistema, promover roles.
 *
 * NUNCA importar desde un Client Component. La service_role jamás va al browser.
 * `import "server-only"` rompe el BUILD si este módulo se cuela en un bundle de
 * cliente (defensa build-time). El guard de runtime queda como segunda barrera.
 */

import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient() no puede correr en el browser (service_role).");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase admin no configurado (falta SUPABASE_SERVICE_ROLE_KEY).");
  }

  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Cuántos usuarios pide cada página de `listUsers` (máximo que acepta la API). */
const USUARIOS_POR_PAGINA = 200;
/** Tope de páginas: la base de estos portales es chica; no recorremos sin fin. */
const MAX_PAGINAS = 10;

/**
 * Busca en `auth.users` un usuario por correo (case-insensitive) y devuelve su id,
 * o null. Supabase no expone un "getUserByEmail", así que hay que paginar
 * `listUsers` — y esa paginación estaba copiada byte por byte en dos route
 * handlers de alta de cuentas. Vive acá porque necesita service_role igual que el
 * cliente que la usa.
 *
 * El caller decide qué significa el hallazgo: en el alta de miembros, encontrarlo
 * quiere decir REUSAR la cuenta (ya es miembro del otro portal o usuario de
 * Efectivo) y NO mandarle correo de acceso.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buscarUsuarioPorEmail(admin: any, email: string): Promise<string | null> {
  const objetivo = email.toLowerCase();
  for (let page = 1; page <= MAX_PAGINAS; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: USUARIOS_POR_PAGINA,
    });
    if (error || !data?.users?.length) return null;
    const hit = data.users.find((u: { email?: string }) => u.email?.toLowerCase() === objetivo);
    if (hit) return hit.id;
    if (data.users.length < USUARIOS_POR_PAGINA) return null;
  }
  return null;
}
