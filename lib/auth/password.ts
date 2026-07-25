/**
 * Política de contraseña — fuente única. Mínimo 8, con al menos una mayúscula,
 * una minúscula y un número. Se valida igual en el servidor (api/cliente/signup).
 * La usan signup y la pantalla de nueva contraseña (recuperación).
 */
export function passwordFuerte(pw: string): boolean {
  return pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw);
}
