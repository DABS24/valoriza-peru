/**
 * Supabase client servidor (Server Components, Server Actions, Route Handlers).
 * NO conectado en Fase 1. Listo para Fase 3 del ROADMAP.
 *
 * Cacheado por request con React.cache para evitar N llamadas.
 */

import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>,
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component sin permiso para set — manejado por middleware.
          }
        },
      },
    },
  );
});

/** Obtiene el usuario actual o null. Cacheado por request. */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
