/**
 * Supabase client servidor (Server Components, Server Actions, Route Handlers).
 * NO conectado en Fase 1. Listo para Fase 3 del ROADMAP.
 *
 * Cacheado por request con React.cache para evitar N llamadas.
 */

import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

import { supabaseAnonKey, supabaseUrl } from "./env";

export const createClient = cache(async () => {
  const cookieStore = await cookies();

  // Verificadas, no afirmadas con `!`. Ver el porqué en `./env.ts`.
  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Component sin permiso para set — manejado por middleware.
        }
      },
    },
  });
});

/** Obtiene el usuario actual o null. Cacheado por request. */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
