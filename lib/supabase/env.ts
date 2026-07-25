/**
 * Las variables de Supabase, verificadas.
 *
 * 🔴 Existe por un incidente real (2026-07-25): en producción el login fallaba y
 * el mensaje decía "correo o contraseña incorrectos" con una contraseña que era
 * correcta. La causa final fue otra —la clave pública era de OTRO proyecto
 * Supabase, y el servidor devolvía `401 Invalid API key`— pero el camino hasta
 * encontrarla estuvo lleno de humo justamente porque nada validaba la
 * configuración: cada hipótesis sobre variables faltantes era plausible y no
 * había forma de descartarla desde el código.
 *
 * Para que las claves sean del mismo proyecto: `scripts/verificar-claves.mjs`.
 * Lo de acá es lo otro: que una variable AUSENTE se note al instante.
 *
 * Porque `!` de TypeScript no lo nota:
 *
 *     createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, …)  // gate-ok:env-bang
 *
 * El `!` no comprueba nada — solo le dice al compilador "confía en mí". En
 * ejecución el valor es `undefined`, el cliente se construye igual, y el fallo
 * aparece lejos del origen y disfrazado de otra cosa. Una afirmación no es una
 * validación.
 *
 * Ahora falta una variable ⇒ el error dice CUÁL falta y dónde ponerla.
 *
 * ⚠️ Estas se resuelven en el BUILD, no en ejecución: Next reemplaza cada
 * `process.env.NEXT_PUBLIC_*` por su valor literal al compilar. Por eso hay que
 * leerlas por su nombre completo (nunca `process.env[nombre]`, que no se
 * reemplaza), y por eso cambiarlas en el hosting **exige un deploy nuevo**.
 */

function requerida(nombre: string, valor: string | undefined): string {
  if (valor && valor.trim()) return valor;
  throw new Error(
    `Falta la variable de entorno ${nombre}. ` +
      `Sin ella no se puede hablar con Supabase y todo login falla. ` +
      `Definila en .env.local (desarrollo) y en el hosting (producción), ` +
      `con ese nombre exacto — y volvé a desplegar: las NEXT_PUBLIC_* se ` +
      `incrustan al compilar, no se leen en ejecución.`,
  );
}

export function supabaseUrl(): string {
  return requerida("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function supabaseAnonKey(): string {
  return requerida("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
