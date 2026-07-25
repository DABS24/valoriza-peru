/**
 * Envío de correo vía Resend (API REST, sin dependencia npm). Solo server-side.
 *
 * `RESEND_FROM_EMAIL` es la variable canónica del remitente (`EMAIL_FROM` se acepta
 * como alias legacy). Mientras no haya dominio propio verificado en Resend, se usa
 * el remitente de prueba de la cuenta; cuando se verifique, va
 * "ValorizaPeru <no-reply@valorizaperu.com>".
 *
 * ⚠️ EL FALLBACK LLEVA LA MARCA DE ESTE PORTAL, no la del producto de donde salió
 * este archivo. Si el entorno se olvida de setear la variable —y en un deploy nuevo
 * es exactamente lo que pasa—, el default no puede firmar los correos de este portal
 * con el nombre de otro negocio: sería la fuga de marca más visible que existe,
 * porque viaja fuera del navegador de quien la recibe.
 */

import "server-only";

import { APP } from "@/lib/constants";

const FROM =
  process.env.RESEND_FROM_EMAIL ?? process.env.EMAIL_FROM ?? `${APP.brand} <onboarding@resend.dev>`;

/** Extrae la dirección de un remitente con formato `Nombre <correo@dominio>`. */
function direccionDe(remitente: string): string {
  return remitente.match(/<([^>]+)>/)?.[1] ?? remitente;
}

/**
 * Remitente de los correos del portal: el nombre visible es la MARCA.
 *
 * La DIRECCIÓN es la verificada en Resend. Mientras el portal no tenga dominio
 * propio verificado, esa dirección es la del dominio heredado de la cuenta de
 * Resend; se apunta a uno propio con `RESEND_FROM_PORTAL` (acepta `correo@dominio`
 * o `Nombre <correo@dominio>` ya armado). Pendiente conocido: verificar el dominio
 * del portal en Resend y setear esa variable.
 */
export function remitentePortal(marca: string): string {
  const propio = process.env.RESEND_FROM_PORTAL;
  if (propio?.includes("<")) return propio;
  return `${marca} <${direccionDe(propio ?? FROM)}>`;
}

/** Envía un correo. Devuelve true si Resend lo aceptó. Nunca lanza. */
export async function enviarCorreo(opts: {
  to: string;
  subject: string;
  html: string;
  /** Versión en texto plano. Mandar multipart (html+text) mejora la entregabilidad. */
  text?: string;
  /** Remitente alterno (ej. `remitentePortal(...)`). Por defecto, el de Efectivo. */
  from?: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false; // sin API key no se envía (build/dev sin correo)
  try {
    const payload: Record<string, unknown> = {
      from: opts.from ?? FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    };
    // Texto plano (mejor puntaje anti-spam): si no viene, no se manda el campo.
    if (opts.text) payload.text = opts.text;
    // reply_to a un correo real y monitoreado (no el no-reply): pequeña señal
    // positiva de reputación. Opcional vía env RESEND_REPLY_TO.
    if (process.env.RESEND_REPLY_TO) payload.reply_to = process.env.RESEND_REPLY_TO;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}
