/**
 * Doble autenticación (2FA) con app autenticadora — TOTP, vía Supabase MFA.
 *
 * Flujo:
 *   1. inscribirTotp() → crea un factor y devuelve el QR + secreto para escanear.
 *   2. verificarTotp(factorId, code) → confirma el primer código y ACTIVA el 2FA.
 *   3. En cada login, si necesitaChallenge() es true, se pide un código (challenge
 *      + verify) para elevar la sesión a AAL2.
 *
 * TOTP = el código de 6 dígitos que rota cada 30s en Google Authenticator/Authy.
 */

import { createClient } from "@/lib/supabase/client";

/** ¿El usuario ya tiene 2FA (TOTP) activo? Devuelve el factor verificado si sí. */
export async function estadoTotp(): Promise<{ activo: boolean; factorId: string | null }> {
  try {
    const { data } = await createClient().auth.mfa.listFactors();
    const verificado = (data?.totp ?? []).find((f) => f.status === "verified");
    return { activo: !!verificado, factorId: verificado?.id ?? null };
  } catch {
    return { activo: false, factorId: null };
  }
}

/**
 * Inicia el alta de un factor TOTP. Limpia intentos previos sin verificar y
 * devuelve el QR (SVG) + el secreto para escribir a mano en la app autenticadora.
 */
export async function inscribirTotp(): Promise<{ factorId: string; qr: string; secret: string }> {
  const supabase = createClient();
  // Limpiar factores TOTP a medio hacer (sin verificar) de intentos anteriores.
  const { data: list } = await supabase.auth.mfa.listFactors();
  for (const f of list?.totp ?? []) {
    if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
  if (error || !data) throw error ?? new Error("no_enroll");
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

/**
 * Confirma el código del factor recién inscrito → activa el 2FA.
 *
 * Al final avisa al server para que el alta quede en la bitácora (la del portal o
 * la de Efectivo, según la cuenta). Va acá y no en cada pantalla porque el alta la
 * disparan las dos —/app/seguridad y la configuración del portal— y un rastro que
 * hay que acordarse de agregar por pantalla es un rastro que falta en alguna.
 *
 * El aviso es best-effort: si falla, el 2FA igual quedó activo y no se le puede
 * negar eso al usuario. Pero se deja en consola: un registro que falla en silencio
 * da una sensación falsa de trazabilidad. El server igual no le cree al navegador —
 * relee los factores antes de escribir.
 */
export async function verificarTotp(factorId: string, code: string): Promise<void> {
  const supabase = createClient();
  const { data: ch, error: e1 } = await supabase.auth.mfa.challenge({ factorId });
  if (e1 || !ch) throw e1 ?? new Error("no_challenge");
  const { error: e2 } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code });
  if (e2) throw e2;

  try {
    const res = await fetch("/api/auth/2fa-activado", { method: "POST" });
    if (!res.ok) console.error("[mfa] no se pudo registrar la activación:", res.status);
  } catch (err) {
    console.error("[mfa] no se pudo registrar la activación:", err);
  }
}

/**
 * Crea UN challenge para el login y devuelve su id, para reutilizarlo entre
 * reintentos (en vez de crear un challenge nuevo por cada código, lo que podía
 * ensanchar la ventana de fuerza bruta). Válido hasta que expira o acierta.
 */
export async function crearChallenge(factorId: string): Promise<string> {
  const { data, error } = await createClient().auth.mfa.challenge({ factorId });
  if (error || !data) throw error ?? new Error("no_challenge");
  return data.id;
}

/** Verifica un código contra un challenge ya creado (reutilizable). */
export async function verificarChallenge(
  factorId: string,
  challengeId: string,
  code: string,
): Promise<void> {
  const { error } = await createClient().auth.mfa.verify({ factorId, challengeId, code });
  if (error) throw error;
}

/**
 * Desactiva el 2FA. Va por el servidor y exige la contraseña actual.
 *
 * NO usar `mfa.unenroll()` desde el navegador: solo pide la sesión, así que
 * quien robe una sesión abierta apaga el segundo factor de un clic — sin saber
 * la contraseña y sin que el dueño se entere. Ver app/api/cliente/desactivar-2fa.
 */
export async function desactivarTotp(factorId: string, clave: string): Promise<void> {
  const res = await fetch("/api/cliente/desactivar-2fa", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ factorId, clave }),
  });
  if (!res.ok) {
    const code = await res
      .json()
      .then((d) => (d?.error as string) ?? "error")
      .catch(() => "error");
    throw new Error(code);
  }
}

/**
 * ¿La sesión actual necesita completar el segundo factor? True cuando el usuario
 * tiene 2FA activo pero la sesión sigue en AAL1 (recién metió su contraseña).
 */
export async function necesitaChallenge(): Promise<boolean> {
  try {
    const { data } = await createClient().auth.mfa.getAuthenticatorAssuranceLevel();
    return data?.currentLevel === "aal1" && data?.nextLevel === "aal2";
  } catch {
    return false;
  }
}

/** factorId del TOTP verificado (para el challenge de login). */
export async function factorTotpId(): Promise<string | null> {
  const { factorId } = await estadoTotp();
  return factorId;
}
