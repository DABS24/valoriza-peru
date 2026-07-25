/**
 * Tope de sesión de 1 hora — capa de UX (cierre suave en el cliente).
 *
 * ⚠️ NO es la barrera de seguridad: el localStorage se puede borrar desde consola
 * y no corre fuera del navegador. El corte REAL lo hacen dos capas server-side:
 *   1. El middleware (cookie httpOnly `dbses`, no reseteable por JS) que mata la
 *      sesión pasada 1 hora en cualquier request a /app.
 *   2. El "time-box" de Supabase (Dashboard → Auth → Sessions), autoritativo.
 * Esto queda solo para el aviso/cierre inmediato en la pestaña abierta.
 */

const KEY = "donbilletes.loginAt";
export const MAX_SESION_MS = 60 * 60 * 1000; // 1 hora

/** Marca el momento del login (al entrar con contraseña o completar el 2FA). */
export function marcarLogin(): void {
  try {
    localStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* almacenamiento no disponible: sin tope, no bloquea el login */
  }
}

/** Limpia la marca (al cerrar sesión). */
export function limpiarLogin(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
}

/**
 * ¿La sesión ya superó 1 hora desde el login? Si no hay marca (sesión anterior
 * a esta función), NO se fuerza el cierre — se capará en el próximo login.
 */
export function sesionExpirada(ahoraMs: number): boolean {
  try {
    const v = localStorage.getItem(KEY);
    if (!v) return false;
    return ahoraMs - Number(v) > MAX_SESION_MS;
  } catch {
    return false;
  }
}
