/**
 * TEMA VISUAL de los PORTALES de inversión — fuente ÚNICA.
 *
 * El portal es una MARCA APARTE de la empresa que lo opera: se
 * ven estilo InversionNPL (azul moderno, mucho blanco, tarjetas muy redondeadas,
 * sombra suave). Para no tocar el look de Efectivo, el tema vive 100% en tokens
 * CSS scopeados: se aplican SOLO dentro del wrapper `.portal-theme` (ver
 * components/portales/PortalTema.tsx). Fuera de ese wrapper estas variables no
 * existen, así que Efectivo nunca las ve.
 *
 * Cómo se conecta:
 *   1. tailwind.config.ts define tokens `portal-*` como `rgb(var(--pt-x)/…)`.
 *   2. Este archivo define el VALOR de cada `--pt-x` (canales R G B) por modo
 *      (claro/oscuro) y el ACENTO por portal.
 *   3. `cssTema()` serializa todo a un bloque CSS que PortalTema inyecta una vez.
 *
 * Para cambiar el acento de un portal o toda la paleta: editar SOLO este archivo.
 */

import type { PortalSlug } from "@/lib/portales/config";

/** Un color en canales "R G B" (formato que consume `rgb(var / <alpha>)`). */
type Canal = string;

/** Tokens base de un modo (todo lo que NO es el acento por-portal). */
interface TemaBase {
  bg: Canal;
  surface: Canal;
  subtle: Canal;
  ink: Canal;
  ink2: Canal;
  muted: Canal;
  line: Canal;
  line2: Canal;
  positive: Canal;
  positiveSoft: Canal;
  warning: Canal;
  warningSoft: Canal;
  danger: Canal;
  dangerSoft: Canal;
}

/** Acento (primario azul) de un portal, por modo. */
interface Acento {
  primary: Canal;
  primaryHover: Canal;
  primarySoft: Canal;
  primaryInk: Canal;
}

// ── Paleta base clara (InversionNPL): fondo azulado muy claro, superficie blanca ──
const BASE_CLARO: TemaBase = {
  bg: "246 248 252", // #F6F8FC
  surface: "255 255 255", // #FFFFFF
  subtle: "239 243 250", // hover / placeholders (azul-gris muy claro)
  ink: "15 30 61", // #0F1E3D navy tinta
  ink2: "51 65 91", // texto secundario
  muted: "91 100 120", // #5B6478 texto tenue
  line: "230 235 243", // #E6EBF3 borde
  line2: "209 217 230", // borde más marcado (inputs)
  positive: "22 163 74", // #16A34A verde dinero
  positiveSoft: "220 252 231",
  // Ámbar = "atención, todavía no es un error" (reserva activa, pendiente por
  // revisar, riesgo medio). Mismo par que positive/danger: tono medio para texto
  // e indicadores sólidos + pálido para el fondo del chip.
  warning: "180 83 9", // #B45309 — 4.5:1 sobre warningSoft, legible en chip chico
  warningSoft: "254 243 199", // #FEF3C7
  danger: "192 83 63", // rojo armonizado
  dangerSoft: "254 226 226",
};

// ── Paleta base oscura ──
const BASE_OSCURO: TemaBase = {
  bg: "11 18 32", // #0B1220
  surface: "17 27 46", // #111B2E
  subtle: "22 34 56",
  ink: "234 240 250", // #EAF0FA
  ink2: "197 208 226",
  muted: "148 163 184",
  line: "34 48 74", // #22304A
  line2: "46 63 96",
  positive: "34 197 94",
  positiveSoft: "20 45 33",
  warning: "251 191 36", // #FBBF24 — sube de tono para leerse sobre fondo oscuro
  warningSoft: "58 43 15",
  danger: "239 120 105",
  dangerSoft: "60 30 30",
};

// ── Acento de la marca (se cambia SOLO acá) ──────────────────────────────────
// ValorizaPeru: TEAL (obra pública / crecimiento).
const ACENTOS: Record<PortalSlug, { claro: Acento; oscuro: Acento }> = {
  contratista: {
    claro: { primary: "13 148 136", primaryHover: "15 118 110", primarySoft: "204 251 241", primaryInk: "17 94 89" },
    oscuro: { primary: "45 212 191", primaryHover: "94 234 212", primarySoft: "19 78 74", primaryInk: "153 246 228" },
  },
};

/** Slugs presentes en el registro (para iterar el CSS por-portal). */
const SLUGS = Object.keys(ACENTOS) as PortalSlug[];

/**
 * Acento claro de un portal en canales 0-1, para consumidores que NO son CSS
 * (hoy: el PDF de la constancia, que se dibuja con pdf-lib). Sale del mismo
 * ACENTOS de arriba: cambiar el color de una marca sigue siendo un solo lugar.
 */
export function acentoPortalRgb(portal: PortalSlug): [number, number, number] {
  const [r, g, b] = ACENTOS[portal].claro.primary.split(" ").map(Number);
  return [r / 255, g / 255, b / 255];
}

/**
 * Acento claro en HEX, para consumidores que necesitan un color literal (hoy: el
 * favicon de cada portal, que se genera fuera del árbol de CSS). Mismo ACENTOS:
 * el color de una marca sigue definiéndose en un solo lugar.
 */
export function acentoPortalHex(portal: PortalSlug): string {
  const canales = ACENTOS[portal].claro.primary.split(" ").map(Number);
  return `#${canales.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** Serializa los tokens base de un modo a líneas `--pt-x: val;`. */
function varsBase(t: TemaBase): string {
  return [
    `--pt-bg:${t.bg}`,
    `--pt-surface:${t.surface}`,
    `--pt-subtle:${t.subtle}`,
    `--pt-ink:${t.ink}`,
    `--pt-ink2:${t.ink2}`,
    `--pt-muted:${t.muted}`,
    `--pt-line:${t.line}`,
    `--pt-line2:${t.line2}`,
    `--pt-positive:${t.positive}`,
    `--pt-positive-soft:${t.positiveSoft}`,
    `--pt-warning:${t.warning}`,
    `--pt-warning-soft:${t.warningSoft}`,
    `--pt-danger:${t.danger}`,
    `--pt-danger-soft:${t.dangerSoft}`,
  ].join(";");
}

/** Serializa el acento de un portal a líneas `--pt-primary…`. */
function varsAcento(a: Acento): string {
  return [
    `--pt-primary:${a.primary}`,
    `--pt-primary-hover:${a.primaryHover}`,
    `--pt-primary-soft:${a.primarySoft}`,
    `--pt-primary-ink:${a.primaryInk}`,
  ].join(";");
}

/** Reglas de acento por portal para un modo (una regla por slug). */
function reglasAcento(prefijo: string, modo: "claro" | "oscuro"): string {
  return SLUGS.map(
    (slug) => `${prefijo}.portal-theme[data-portal="${slug}"]{${varsAcento(ACENTOS[slug][modo])}}`,
  ).join("");
}

/**
 * CSS completo del tema de portal. Es estático (igual para toda la app): el
 * scope lo dan los selectores `.portal-theme` / `[data-portal]`, no el JS. Se
 * inyecta una vez por PortalTema.
 *
 * Incluye un "reset de base" sobre `.portal-theme`: fija fondo, color de texto,
 * color de headings y remapea --font-display/--font-body a Jakarta. Así el
 * subtree entero adopta el tema (incluido el modo oscuro) aunque un componente
 * no tenga migrada cada clase, y sin depender de app/globals.css.
 */
export function cssTema(): string {
  const claro = `.portal-theme{${varsBase(BASE_CLARO)};--font-display:var(--font-portal-sans);--font-body:var(--font-portal-sans);background-color:rgb(var(--pt-bg));color:rgb(var(--pt-ink2));}`;
  const headings = `.portal-theme :is(h1,h2,h3,h4){color:rgb(var(--pt-ink));}`;
  const acentoClaro = reglasAcento("", "claro");
  // Los portales van SIEMPRE en claro (blanco, estilo InversionNPL): NO seguimos
  // `prefers-color-scheme`, aunque el SO esté en oscuro. El modo oscuro queda solo
  // como opt-in explícito vía `:root[data-mode="dark"]` (hoy nadie lo activa).
  const toggle = `:root[data-mode="dark"] .portal-theme{${varsBase(BASE_OSCURO)}}${reglasAcento(':root[data-mode="dark"] ', "oscuro")}`;
  return `${claro}${headings}${acentoClaro}${toggle}`;
}
