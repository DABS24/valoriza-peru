/**
 * Plantillas HTML de los correos transaccionales. Diseño limpio, table-based
 * (compatible con clientes de correo), con la paleta de marca. TODO el texto
 * visible sale de COPY.correos y el nombre de marca de APP — nunca hardcodeado.
 */

import { APP } from "@/lib/constants";
import { COPY } from "@/lib/copy";

// Paleta Editorial Trust (ver DIRECCION_VISUAL). Inline porque el correo no
// tiene acceso a los tokens de Tailwind.
const NAVY = "#1E3A5F";
const MONEY = "#2E7D52";
const INK = "#181818";
const MUTED = "#6b7280";
// Fondos NEUTROS para el correo (gris clarísimo, no beige — el cream se veía
// "sucio" en pantalla). La marca vive en el header/acentos, no en el fondo.
const BG = "#f3f4f6"; // lienzo alrededor de la tarjeta + footer
const PANEL = "#f6f7f9"; // paneles internos (tarjeta del código)
const LINEA = "#e6e8eb"; // bordes sutiles neutros

/** Escapa texto que va dentro del HTML del correo (ej. el nombre del usuario). */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Cascarón común: header navy con la marca, cuerpo blanco, footer gris.
 *
 * El logo es el MONOGRAMA de la marca (inicial del nombre), igual que el favicon:
 * derivado del nombre, no un archivo aparte que quede viejo al renombrar. El pie
 * dice la marca + el operador legal, y NO lleva WhatsApp ni correo general: a
 * estos correos se responde por el asesor asignado, que es como opera el portal.
 */
function layout(inner: string, marcaPortal?: string): string {
  const marca = marcaPortal ?? APP.brand;
  const logo = `<span style="display:inline-block;width:40px;height:40px;line-height:40px;text-align:center;border-radius:9px;background:#ffffff;color:${NAVY};font-size:20px;font-weight:700;">${esc(
    marca.trim().charAt(0).toUpperCase(),
  )}</span>`;
  const contacto = COPY.correos.portalPie(marca);
  return `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:${BG};font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(30,58,95,0.08);">
  <tr><td style="background:${NAVY};padding:22px 32px;border-bottom:3px solid ${MONEY};">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:12px;vertical-align:middle;">
        ${logo}
      </td>
      <td style="vertical-align:middle;">
        <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.2px;">${esc(marca)}</span>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:32px;">${inner}</td></tr>
  <tr><td style="padding:20px 32px;background:${PANEL};border-top:1px solid ${LINEA};">
    <p style="margin:0 0 6px;color:${NAVY};font-size:12px;line-height:17px;text-align:center;font-weight:600;">${esc(
      contacto,
    )}</p>
    <p style="margin:0;color:${MUTED};font-size:11px;line-height:16px;text-align:center;">${esc(
      marcaPortal ? COPY.correos.portalNoResponder : COPY.correos.footer,
    )}</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}







/**
 * Bloque de contenido de PORTAL: título + saludo opcional + cuerpo + botón + nota
 * de contexto + "ignora". Sin campo de expiración (no son enlaces con vencimiento
 * como los de auth). Reutiliza el look table-based + CSS inline de `bloque`.
 */
function bloquePortal(opts: {
  titulo: string;
  saludo?: string;
  cuerpo: string;
  boton: string;
  url: string;
  nota: string;
  ignora: string;
}): string {
  const saludo = opts.saludo
    ? `<p style="margin:0 0 8px;color:${INK};font-size:15px;line-height:22px;">${esc(opts.saludo)}</p>`
    : "";
  return `
<h1 style="margin:0 0 14px;color:${NAVY};font-size:22px;line-height:26px;">${esc(opts.titulo)}</h1>
${saludo}
<p style="margin:0 0 24px;color:${INK};font-size:15px;line-height:22px;">${esc(opts.cuerpo)}</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
  <td style="border-radius:999px;background:${MONEY};">
    <a href="${opts.url}" style="display:inline-block;padding:14px 34px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:999px;">${esc(opts.boton)}</a>
  </td>
</tr></table>
<p style="margin:24px 0 0;color:${MUTED};font-size:13px;line-height:18px;">${esc(opts.nota)}</p>
<p style="margin:6px 0 0;color:${MUTED};font-size:13px;line-height:18px;">${esc(opts.ignora)}</p>`;
}

function bloquePortalTexto(
  opts: {
    titulo: string;
    saludo?: string;
    cuerpo: string;
    boton: string;
    url: string;
    nota: string;
    ignora: string;
  },
  marca: string,
): string {
  return [
    opts.titulo,
    "",
    ...(opts.saludo ? [opts.saludo, ""] : []),
    opts.cuerpo,
    "",
    `${opts.boton}: ${opts.url}`,
    "",
    opts.nota,
    opts.ignora,
    "",
    "—",
    COPY.correos.portalPie(marca),
    COPY.correos.portalNoResponder,
  ].join("\n");
}

/**
 * PORTAL · correo de ACCESO a una cuenta recién creada por el staff del portal.
 *
 * POR QUÉ EXISTE (no es cosmético): antes se mandaba `correoRecuperacion`, la
 * plantilla de Efectivo, con enlace a `/nueva-clave` de Efectivo. El inversionista
 * nuevo terminaba en el login de Efectivo, donde NO tiene fila en `perfiles` — o
 * sea, rebotaba y nunca llegaba a su portal. El alta quedaba rota de punta a punta.
 */
export function correoPortalAcceso(opts: { marca: string; url: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const T = COPY.correos.portalAcceso;
  const campos = {
    titulo: T.titulo,
    cuerpo: T.cuerpo(opts.marca),
    boton: T.boton,
    url: opts.url,
    nota: T.nota,
    ignora: T.ignora,
  };
  return {
    subject: T.subject(opts.marca),
    html: layout(bloquePortal(campos), opts.marca),
    text: bloquePortalTexto(campos, opts.marca),
  };
}

/**
 * PORTAL · aviso al ASESOR de que un inversionista reservó una oportunidad (tiene
 * 24h para continuar). `marca` = nombre del portal.
 */
export function correoPortalReservaAsesor(opts: {
  marca: string;
  oportunidad: string;
  url: string;
}): { subject: string; html: string; text: string } {
  const T = COPY.correos.portalReservaAsesor;
  const campos = {
    titulo: T.titulo,
    cuerpo: T.cuerpo(opts.oportunidad),
    boton: T.boton,
    url: opts.url,
    nota: T.nota,
    ignora: T.ignora,
  };
  return {
    subject: T.subject(opts.marca),
    html: layout(bloquePortal(campos), opts.marca),
    text: bloquePortalTexto(campos, opts.marca),
  };
}

/**
 * PORTAL · aviso al INVERSIONISTA de que su reserva fue CONFIRMADA por el staff.
 * `marca` = nombre del portal.
 */
export function correoPortalReservaConfirmada(opts: {
  marca: string;
  oportunidad: string;
  url: string;
}): { subject: string; html: string; text: string } {
  const T = COPY.correos.portalReservaConfirmada;
  const campos = {
    titulo: T.titulo,
    cuerpo: T.cuerpo(opts.oportunidad),
    boton: T.boton,
    url: opts.url,
    nota: T.nota,
    ignora: T.ignora,
  };
  return {
    subject: T.subject(opts.marca),
    html: layout(bloquePortal(campos), opts.marca),
    text: bloquePortalTexto(campos, opts.marca),
  };
}

/**
 * PORTAL · aviso al STAFF de que una empresa dejó una nueva solicitud de
 * financiamiento. `marca` = nombre del portal.
 */
export function correoPortalSolicitudNueva(opts: {
  marca: string;
  empresa: string;
  url: string;
}): { subject: string; html: string; text: string } {
  const T = COPY.correos.portalSolicitudNueva;
  const campos = {
    titulo: T.titulo,
    cuerpo: T.cuerpo(opts.empresa),
    boton: T.boton,
    url: opts.url,
    nota: T.nota,
    ignora: T.ignora,
  };
  return {
    subject: T.subject(opts.marca),
    html: layout(bloquePortal(campos), opts.marca),
    text: bloquePortalTexto(campos, opts.marca),
  };
}

/**
 * PORTAL · aviso a la EMPRESA de que su solicitud fue APROBADA o RECHAZADA. Si es
 * rechazo, `motivo` explica por qué. `marca` = nombre del portal.
 */
export function correoPortalSolicitudResuelta(opts: {
  marca: string;
  aprobada: boolean;
  motivo?: string;
  url: string;
}): { subject: string; html: string; text: string } {
  const T = COPY.correos.portalSolicitudResuelta;
  const campos = {
    titulo: opts.aprobada ? T.tituloAprobada : T.tituloRechazada,
    cuerpo: opts.aprobada ? T.cuerpoAprobada : T.cuerpoRechazada(opts.motivo ?? "—"),
    boton: T.boton,
    url: opts.url,
    nota: T.nota,
    ignora: T.ignora,
  };
  return {
    subject: opts.aprobada ? T.subjectAprobada(opts.marca) : T.subjectRechazada(opts.marca),
    html: layout(bloquePortal(campos), opts.marca),
    text: bloquePortalTexto(campos, opts.marca),
  };
}

