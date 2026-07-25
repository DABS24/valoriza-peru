/**
 * Formatters · moneda, fechas, DNI. Locale es-PE por defecto.
 */

const moneyFormatter = new Intl.NumberFormat("es-PE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const intFormatter = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 });

const compactFormatter = new Intl.NumberFormat("es-PE", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Formatea un monto en soles: 4000 → "S/ 4,000.00" */
export function toSoles(amount: number, { compact = false }: { compact?: boolean } = {}): string {
  if (Number.isNaN(amount)) return "S/ —";
  const formatted = compact ? compactFormatter.format(amount) : moneyFormatter.format(amount);
  return `S/ ${formatted}`;
}

/** Solo el número, sin prefijo (para JSX donde el "S/" va por separado). */
export function toAmount(amount: number): string {
  if (Number.isNaN(amount)) return "—";
  return moneyFormatter.format(amount);
}

/** Para stats y conteos: 4000 → "4,000" */
export function toInt(value: number): string {
  return intFormatter.format(value);
}

/**
 * Monto para KPIs de dashboard: compacto si es grande (S/ 415.2 k), entero sin
 * decimales si es chico (S/ 4,192). Pensado para no desbordar cards angostas.
 */
export function toSolesKpi(value: number): string {
  if (Number.isNaN(value)) return "S/ —";
  return value >= 10000 ? toSoles(value, { compact: true }) : `S/ ${toInt(value)}`;
}

/** Símbolo por moneda. USD se escribe "US$" para no confundir con S/ (soles). */
const SIMBOLO_MONEDA: Record<string, string> = { PEN: "S/", USD: "US$" };

/**
 * Monto en la moneda dada (PEN o USD). Reusa el MISMO formateador de números que
 * `toSoles` — el único lugar donde vive el formato — y solo cambia el símbolo.
 * Los portales operan en USD/PEN, así que necesitan esto en vez de asumir soles.
 */
export function toMoneda(
  amount: number,
  moneda: string = "PEN",
  { compact = false }: { compact?: boolean } = {},
): string {
  const sim = SIMBOLO_MONEDA[moneda] ?? moneda;
  if (Number.isNaN(amount)) return `${sim} —`;
  const formatted = compact ? compactFormatter.format(amount) : moneyFormatter.format(amount);
  return `${sim} ${formatted}`;
}

/** Monto para KPIs/cards en cualquier moneda: compacto si es grande, entero si es chico. */
export function toMonedaKpi(value: number, moneda: string = "PEN"): string {
  const sim = SIMBOLO_MONEDA[moneda] ?? moneda;
  if (Number.isNaN(value)) return `${sim} —`;
  return value >= 10000 ? toMoneda(value, moneda, { compact: true }) : `${sim} ${toInt(value)}`;
}

/**
 * Calcula la comisión según la tarifa de TARIFAS.
 *
 * ⚠️ SOLO PREVIEW. Desde 0031 la AUTORIDAD del dinero es la función SQL
 * `calc_operacion` (supabase/migrations/0031_*.sql): la fila guardada la calcula
 * el servidor, no el browser. Esta función solo alimenta el preview del slider en
 * app/app/cliente/nueva/page.tsx (UX instantánea). Debe dar el MISMO resultado que
 * calc_operacion para que el preview no mienta; tests/casos-dinero.ts congela el
 * comportamiento (tests/dinero-paridad.test.ts) y rompe si driftea. Si cambias la
 * regla acá, cámbiala también en calc_operacion y en la tabla de casos.
 */
export function calcComision(
  monto: number,
  porcentaje: number,
  minimo: number,
): { comision: number; neto: number } {
  if (monto <= 0 || Number.isNaN(monto)) return { comision: 0, neto: 0 };
  const comision = Math.max(monto * porcentaje, minimo);
  return { comision, neto: monto - comision };
}

/**
 * Comisión de un cobro B2B, DESGLOSADA: tarifa + IGV.
 *
 * A diferencia del producto de personas, al empresario se le cobra 1% + IGV. El
 * impuesto grava NUESTRO servicio, así que se aplica sobre la comisión — nunca
 * sobre el monto que el cliente final transfiere (sobre el monto serían S/540 en
 * un cobro de S/3,000, un disparate).
 *
 * El IGV se redondea POR SEPARADO y después se suma. Si se redondeara solo el
 * total, `base + igv` podría no dar el total y la boleta no cuadraría.
 *
 * ⚠️ Espejo de `calc_cobro` (0055). Es solo PREVIEW: el número que se guarda lo
 * calcula SQL. Si difieren, manda SQL. La paridad se congela en
 * tests/igv-paridad.test.ts.
 */
export function calcComisionCobro(
  monto: number,
  tarifa: number,
  tasaIgv: number,
  /** Piso de la comisión BASE, sin IGV. Espejo de `empresas.comision_minima`
   *  (0064): la recaudación bancaria cobra tarifa fija por operación, así que
   *  sin piso un cobro chico da pérdida. Omitirlo = sin piso. */
  minimo = 0,
): { base: number; igv: number; comision: number; neto: number; aplicaMinimo: boolean } {
  if (!Number.isFinite(monto) || monto <= 0) {
    return { base: 0, igv: 0, comision: 0, neto: 0, aplicaMinimo: false };
  }
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const porPorcentaje = r2(monto * tarifa);
  // Mismo orden que `calc_cobro` en SQL: el piso se aplica a la BASE y el IGV
  // va encima. Si esto y el servidor difirieran, el empresario vería un número
  // en el formulario y otro en su factura.
  const base = Math.max(porPorcentaje, minimo);
  const igv = r2(base * tasaIgv);
  const comision = r2(base + igv);
  return {
    base,
    igv,
    comision,
    neto: r2(monto - comision),
    // Se expone para poder AVISARLE al empresario que está pagando el piso y
    // no el 1%. Cobrar 5.9% sin decirlo es la clase de sorpresa que quema una
    // cuenta.
    aplicaMinimo: minimo > porPorcentaje,
  };
}

/** DNI peruano: 8 dígitos corridos, sin separadores. Limpia cualquier punto o
 *  espacio que venga de datos viejos → "06.720.035" / "06 720 035" → "06720035". */
export function toDni(dni: string): string {
  return dni.replace(/\D/g, "");
}

/** Porcentaje legible: 0.012 → "1.2%" (recibe la fracción, no el valor ya multiplicado). */
export function toPorcentaje(fraccion: number, decimales = 1): string {
  if (Number.isNaN(fraccion)) return "—";
  return `${(fraccion * 100).toFixed(decimales)}%`;
}

/** Fecha + hora local es-PE a partir de un ISO string o Date. */
export function toDateTime(value: string | number | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" });
}

/** Solo fecha (sin hora), corta: "30 jun 2026". Para KPIs donde el datetime desborda. */
export function toDate(value: string | number | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

/** Solo hora local es-PE: "14:30". Para listas donde el datetime completo desborda. */
export function toTime(value: string | number | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
}

/** Tamaño de archivo legible: 1258291 → "1.2 MB", 840000 → "820 KB". */
export function toFileSize(bytes: number): string {
  if (Number.isNaN(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/** Bytes aproximados de un data URL base64 (para mostrar tamaño de archivos ya guardados). */
export function bytesFromDataUrl(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
}
