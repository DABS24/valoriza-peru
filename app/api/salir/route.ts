/**
 * Cerrar sesión del portal — SERVER-SIDE.
 *
 * POST /api/salir
 *
 * POR QUÉ EN EL SERVER: el `signOut()` del navegador borra la cookie de sesión
 * desde JS, pero si acto seguido se navega con `location.assign()` la petición
 * puede salir ANTES de que el navegador haya persistido ese borrado. El guard ve
 * la cookie vieja, valida la sesión y devuelve al panel: el usuario cree que
 * cerró sesión y NO cerró. En un portal con datos financieros (y en una
 * computadora compartida) eso es un problema de verdad, no un detalle.
 *
 * Acá el borrado viaja en la RESPUESTA HTTP (Set-Cookie), así que cuando el
 * navegador procesa la respuesta la sesión ya no existe. No hay carrera posible.
 *
 * No exige sesión válida: cerrar sesión siempre debe poder ejecutarse (si ya no
 * hay sesión, el resultado deseado ya se cumplió).
 */

import { NextResponse } from "next/server";

import { SESS_COOKIE } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Aunque falle el signOut remoto, la respuesta igual limpia las cookies de
    // sesión que el helper haya podido tocar. Nunca devolvemos error: dejar al
    // usuario "adentro" por un fallo de red sería lo peor de los dos mundos.
  }
  // Borrar la marca de sesión. Sin esto sobrevivía al signOut, y el siguiente
  // login más de una hora después rebotaba con "tu sesión expiró" apenas entrar
  // — que en un portal por invitación se lee como cuenta bloqueada.
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESS_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
