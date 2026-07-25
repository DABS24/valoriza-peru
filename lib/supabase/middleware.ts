/**
 * Refresco de sesión Supabase en el edge (middleware). Mantiene vivas las
 * cookies de auth en cada request.
 *
 * Inerte en Fase 1: si no hay env de Supabase, devuelve el response tal cual
 * (el demo no tiene sesión). Se activa solo cuando existan las llaves.
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

/**
 * Refresca la sesión y devuelve si hay usuario (para que el middleware decida el
 * gate de /app). `hayUser` es null cuando no hay env de Supabase (demo sin auth).
 */
export async function updateSession(
  request: NextRequest,
  response: NextResponse,
): Promise<{ response: NextResponse; hayUser: boolean | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return { response, hayUser: null }; // demo sin Supabase

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // getUser() valida el token contra Supabase y, si tocó, reescribe cookies.
  const { data } = await supabase.auth.getUser();
  return { response, hayUser: !!data.user };
}

/** Borra en el response las cookies de auth de Supabase (cierre de sesión duro). */
export function borrarCookiesAuth(request: NextRequest, response: NextResponse): void {
  for (const c of request.cookies.getAll()) {
    if (c.name.startsWith("sb-") && c.name.includes("auth-token")) {
      response.cookies.set(c.name, "", { maxAge: 0, path: "/" });
    }
  }
}
