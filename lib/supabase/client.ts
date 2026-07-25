/**
 * Supabase client browser (Client Components).
 * NO conectado en Fase 1. Listo para Fase 3 del ROADMAP.
 *
 * Uso:
 *   import { createClient } from "@/lib/supabase/client";
 *   const supabase = createClient();
 */

import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/**
 * `auth.getUser()` que NO revienta ante un corte de red. getUser() hace un
 * viaje a Supabase para validar la sesión y lanza "Failed to fetch" si la red
 * falla (a diferencia de las queries, que devuelven {data,error} sin tirar).
 * Acá lo atrapamos y devolvemos { user: null }: las lecturas degradan a vacío
 * en silencio en vez de escupir un error rojo en consola. Mantiene la misma
 * forma { user } para que los llamadores no cambien el resto de su código.
 */
export async function safeGetUser(
  supabase: ReturnType<typeof createClient>,
): Promise<{ user: User | null }> {
  try {
    const { data } = await supabase.auth.getUser();
    return { user: data.user };
  } catch {
    return { user: null };
  }
}

/**
 * UID del usuario autenticado LEÍDO DE LA SESIÓN LOCAL (cookie), sin viaje de red.
 *
 * `auth.getUser()` (safeGetUser) valida contra Supabase en cada llamada → un RTT
 * por lectura del browser. Para armar un filtro `.eq("perfil_id", uid)` NO hace
 * falta esa validación: la barrera de seguridad real es la RLS del lado del server
 * (un uid falsificado no le da acceso a filas ajenas). `getSession()` lee el JWT
 * de la cookie local (0 red). Úsalo SOLO para obtener el uid de un filtro de
 * LECTURA; para ESCRITURAS y guards de auth server-side seguir con getUser().
 */
export async function getUid(
  supabase: ReturnType<typeof createClient>,
): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Envuelve una ESCRITURA para que un corte de red no reviente con "Failed to
 * fetch". Las queries de Supabase lanzan si la red falla (no devuelven {error}).
 * Acá atrapamos y devolvemos `fallback` — el MISMO centinela de fallo que la
 * función ya usa (false / null / "error"), así el llamador muestra su toast de
 * error normal. NO silencia el error: lo enruta al camino de fallo existente.
 */
export async function safeWrite<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}
