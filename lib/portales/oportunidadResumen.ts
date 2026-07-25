/**
 * Deriva el "modelo de vista" de una oportunidad para la card y el detalle: las 3
 * stats, el subtítulo y la ubicación salen del `portal` config + el jsonb `datos`.
 * Las diferencias entre verticales viven en la config, NO se duplican en la card.
 *
 * Helpers PUROS, sin JSX ni Supabase — por eso viven en lib/ junto a asesor.ts,
 * tasas.ts y admin.ts, y no en components/ (donde estuvieron y donde nadie los
 * testeaba). Los consume tanto la UI (card, ficha) como el PDF de la constancia,
 * que no es un componente: un helper compartido por ambos no es de components/.
 */

import { toMonedaKpi } from "@/lib/formatters";
import { PORTALES, type PortalSlug, type CampoDef } from "@/lib/portales/config";
import { tasasDerivadas, pctTasa } from "@/lib/portales/tasas";
import type { OportunidadLite } from "@/lib/portales/data";

/** Número desde un valor jsonb desconocido (o null). */
function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** String desde un valor jsonb desconocido (o null). */
function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

/** Definición de un campo de la vertical por su key (undefined si no existe). */
export function campoDe(portal: PortalSlug, key: string): CampoDef | undefined {
  return PORTALES[portal].campos.find((c) => c.key === key);
}

/**
 * Número + la UNIDAD que declara la config del campo: 120 con sufijo "m²" → "120 m²".
 * ÚNICO lugar donde se pega la unidad a un número (lo usan la card, la ficha y el
 * PDF de la constancia): la unidad es un dato de la vertical, no texto de pantalla.
 * Una vertical que mida en hectáreas cambia SU config y las tres superficies la
 * siguen; escribirla en la card haría que esa vertical mostrara m² igual.
 */
export function conSufijo(n: number, sufijo?: string): string {
  return sufijo ? `${n} ${sufijo}` : String(n);
}

/** Etiqueta de una opción de un campo select (ej. residencial → "Residencial"). */
export function labelOpcion(portal: PortalSlug, key: string, value: unknown): string | null {
  const campo = campoDe(portal, key);
  if (!campo || campo.tipo !== "select") return str(value);
  const v = str(value);
  return campo.opciones?.find((o) => o.value === v)?.label ?? v;
}

/** Plazo legible: min+max → "2–6 meses", solo uno → "6 meses". */
export function plazoTexto(min: number | null, max: number | null, sufijo: string): string | null {
  if (min != null && max != null && min !== max) return `${min}–${max} ${sufijo}`;
  const v = min ?? max;
  return v != null ? `${v} ${sufijo}` : null;
}

export interface UbicacionSubtitulo {
  ubicacion: string | null;
  subtitulo: string | null;
}

/**
 * Ubicación (distrito, ciudad) + subtítulo factual de la vertical, derivados del
 * `datos` jsonb. Único lugar de esa derivación: lo usan la card del inversionista
 * y la del empresario (mismo dato factual, distinto framing financiero alrededor).
 */
export function ubicacionSubtitulo(
  distrito: string | null,
  ciudad: string | null,
  datos: Record<string, unknown>,
): UbicacionSubtitulo {
  const ubicacion = [distrito, ciudad].filter(Boolean).join(", ") || null;
  const entidad = str(datos.entidad_estatal);
  const tipoContrato = labelOpcion("contratista", "tipo_contrato", datos.tipo_contrato);
  const subtitulo = [entidad, tipoContrato].filter(Boolean).join(" · ") || null;
  return { ubicacion, subtitulo };
}

export interface StatCard {
  label: string;
  value: string;
  /** El valor no debe truncarse (no es KPI de dinero). Ej.: el plazo "2–4 meses". */
  wrap?: boolean;
}

export interface ResumenCard {
  ubicacion: string | null;
  subtitulo: string | null;
  /** Valor porcentual destacado: TEA (rentabilidad efectiva anual) derivada de la tasa mensual. */
  destacadoPct: string | null;
  stats: StatCard[];
}

/** TEA (efectiva anual) derivada de la ganancia mensual, formateada. null si no hay tasa. */
export function teaDe(tasaMensual: number | null): string | null {
  if (tasaMensual == null || !Number.isFinite(tasaMensual)) return null;
  return pctTasa(tasasDerivadas(tasaMensual).teaPct);
}

/**
 * Modelo de vista de la card según el portal. `mesesSufijo` se pasa como texto
 * ("meses") para no hardcodearlo acá; viene del copy del caller.
 */
export function resumenCard(op: OportunidadLite, mesesSufijo: string): ResumenCard {
  const cfg = PORTALES[op.portal];
  const { ubicacion, subtitulo } = ubicacionSubtitulo(op.distrito, op.ciudad, op.datos);
  const destacadoPct = teaDe(op.tasaMensual);

  // contratista
  const plazo = plazoTexto(op.plazoMesesMin, op.plazoMesesMax, mesesSufijo);
  return {
    ubicacion,
    subtitulo,
    destacadoPct,
    stats: [
      {
        label: cfg.card.stat1,
        value: op.montoSolicitado != null ? toMonedaKpi(op.montoSolicitado, op.moneda) : "—",
      },
      { label: cfg.card.stat2, value: plazo ?? "—", wrap: true },
      { label: cfg.card.stat3, value: destacadoPct ?? "—" },
    ],
  };
}

export { num as numDato, str as strDato };
