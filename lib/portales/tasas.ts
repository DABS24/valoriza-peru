/**
 * Modelo de tasa de los PORTALES · fuente única = la GANANCIA MENSUAL (%).
 *
 * El staff ingresa SOLO la tasa mensual. La TNA (tasa nominal anual) y la TEA
 * (tasa efectiva anual) se DERIVAN de ella y NO se guardan (single source of
 * truth): así nunca hay tres campos que se contradigan. Las columnas viejas
 * (rentabilidad_pct/tir_estimada/tasa) quedan deprecadas.
 *
 *   TNA = tasa_mensual × 12                  (nominal: suma simple de 12 meses)
 *   TEA = ((1 + tasa_mensual/100)^12 − 1)×100 (efectiva: capitaliza mes a mes)
 *
 * Se redondea a 2 decimales al MOSTRAR (no al calcular): el redondeo es solo de
 * presentación. Ver el uso en oportunidadResumen.ts (badge = TEA) y FichaDetalle.
 */

export interface TasasDerivadas {
  /** Tasa nominal anual (%). */
  tnaPct: number;
  /** Tasa efectiva anual (%). */
  teaPct: number;
}

/** Redondea a 2 decimales para display. */
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Deriva TNA y TEA de la ganancia mensual (%). Devuelve valores ya redondeados a
 * 2 decimales (listos para mostrar). Ej.: 2 % mensual → TNA 24 %, TEA 26.82 %.
 */
export function tasasDerivadas(tasaMensualPct: number): TasasDerivadas {
  const m = tasaMensualPct / 100;
  const tna = tasaMensualPct * 12;
  const tea = (Math.pow(1 + m, 12) - 1) * 100;
  return { tnaPct: r2(tna), teaPct: r2(tea) };
}

/**
 * ÚNICO formateador de porcentaje de los portales: 26.82 → "26.82%", 24 → "24%".
 * null si no aplica. Lo usan tasa mensual, TNA, TEA y comisión de intermediación:
 * el mismo número tiene que verse IGUAL en la pantalla del staff, la del
 * inversionista y la del empresario. (Existía un segundo formateador a 1 decimal
 * que hacía que 1.75 % apareciera como "1.8 %" justo en la card del empresario,
 * donde ese número es su COSTO.)
 *
 * Ojo: NO confundir con `toPorcentaje` de lib/formatters, que recibe una FRACCIÓN
 * (0.26 → "26 %"). Acá la entrada ya viene en puntos porcentuales.
 */
export function pctTasa(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return `${Number.isInteger(value) ? value : r2(value)}%`;
}

export interface GananciaAlPlazo {
  /** Ganancia del PERÍODO completo (%), no anual. Ej.: 2% mensual × 4 meses = 8%. */
  gananciaPct: number;
  /** Ganancia del período en la moneda del monto (monto × tasaMensual% × meses). */
  gananciaMonto: number;
  /** Monto + ganancia (lo que recibiría al cierre del plazo). */
  total: number;
}

/**
 * Ganancia estimada AL PLAZO por interés simple mensual: la ganancia real que se
 * recibe en `meses`, NO la anualizada. Es el número que evita la confusión de la
 * TEA: nadie gana la TEA en 4 meses. Ej.: S/10,000 al 2% mensual por 4 meses →
 * gananciaPct 8, gananciaMonto 800, total 10,800.
 *
 * Interés simple (no capitaliza): el modelo de estas operaciones paga el interés
 * al vencimiento sobre el capital, no reinvierte mes a mes. Entradas inválidas
 * (monto/tasa/meses no finitos o ≤ 0) devuelven ceros — nunca NaN en pantalla.
 */
export function gananciaAlPlazo(
  monto: number,
  tasaMensualPct: number,
  meses: number,
): GananciaAlPlazo {
  if (
    !Number.isFinite(monto) ||
    !Number.isFinite(tasaMensualPct) ||
    !Number.isFinite(meses) ||
    monto <= 0 ||
    tasaMensualPct < 0 ||
    meses <= 0
  ) {
    return { gananciaPct: 0, gananciaMonto: 0, total: monto > 0 ? monto : 0 };
  }
  const gananciaPct = tasaMensualPct * meses;
  const gananciaMonto = monto * (tasaMensualPct / 100) * meses;
  return { gananciaPct, gananciaMonto, total: monto + gananciaMonto };
}

export interface CoberturaGarantia {
  /** Respaldos descartados por estar en otra moneda que la operación. */
  omitidas?: number;
  /** Cuántas veces el total de garantías cubre el monto (totalGarantias ÷ monto). */
  veces: number;
  /** Suma de los valores estimados de las garantías (en la moneda del monto). */
  totalGarantias: number;
  /** Cantidad de garantías con valor estimado que sumaron a la cobertura. */
  cuenta: number;
}

/** Garantía mínima que necesita coberturaGarantia (solo el valor estimado). */
export interface GarantiaValor {
  valorEstimado: number | null;
  /**
   * 🔴 Obligatoria. `portal_garantias` tiene su PROPIA moneda, independiente de
   * la operación: sumar sin mirarla producía "3.2x tu inversión" mezclando soles
   * con dólares, en el número que la ficha llama el centro de confianza — y que
   * también sale en el PDF de constancia.
   */
  moneda?: string | null;
}

/**
 * Cobertura de las garantías sobre el monto solicitado: cuántas veces la pila de
 * respaldos cubre la inversión. Suma los `valorEstimado` no nulos ÷ monto. Con
 * monto ≤ 0 o sin garantías con valor, `veces` = 0 (el caller decide si mostrarlo).
 */
export function coberturaGarantia(
  garantias: readonly GarantiaValor[],
  monto: number | null | undefined,
  /** Moneda de la OPERACIÓN: es el denominador, así que manda. */
  moneda?: string | null,
): CoberturaGarantia {
  let totalGarantias = 0;
  let cuenta = 0;
  let omitidas = 0;
  for (const g of garantias) {
    if (g.valorEstimado != null && Number.isFinite(g.valorEstimado) && g.valorEstimado > 0) {
      // Nunca se suman monedas distintas. El resto del repo ya lo respeta con
      // `monedaDominante`; este agregado era el único que se lo saltaba.
      if (moneda && g.moneda && g.moneda !== moneda) {
        omitidas += 1;
        continue;
      }
      totalGarantias += g.valorEstimado;
      cuenta += 1;
    }
  }
  const veces =
    monto != null && Number.isFinite(monto) && monto > 0 && totalGarantias > 0
      ? totalGarantias / monto
      : 0;
  return { veces, totalGarantias, cuenta, omitidas };
}

/** Cobertura corta para display: 2.3 → "2.3×", 3 → "3×". null si no aplica (≤0). */
export function coberturaTexto(veces: number): string | null {
  if (!Number.isFinite(veces) || veces <= 0) return null;
  return `${Number.isInteger(veces) ? veces : r2(veces)}×`;
}

// ─────────────────────────────────────────────────────────────────────────────
// COSTO DEL PRESTATARIO (empresario) — el otro lado de la misma operación.
//
// El inversionista ve RENTABILIDAD (gananciaAlPlazo / TEA). El prestatario ve su
// COSTO, que es un modelo distinto (confirmado en una minuta real de mutuo con
// garantía hipotecaria):
//   · Esquema BULLET / interest-only: paga cuotas mensuales de SOLO interés
//     (capital × tasa_mensual%) y devuelve el CAPITAL completo al final.
//   · La comisión de intermediación se DESCUENTA al desembolso: recibe
//     monto × (1 − comisión%) pero devuelve el `monto` completo.
// Nunca se le muestra la TEA (rentabilidad del inversionista): ese framing no es
// suyo. Su número es cuánto recibe, cuánto paga por mes y cuánto cuesta en total.
// ─────────────────────────────────────────────────────────────────────────────

export interface CostoEmpresario {
  /** Capital solicitado (lo que debe devolver al final). */
  monto: number;
  /** % de comisión de intermediación (o 0 si aún no se define). */
  comisionPct: number;
  /** Comisión en dinero = monto × comisión%. Se descuenta al desembolso. */
  comisionMonto: number;
  /** Lo que efectivamente recibe = monto − comisión. */
  recibeNeto: number;
  /** Ganancia/interés mensual (%) que corre sobre el capital. */
  tasaMensualPct: number;
  /** Plazo usado para el cálculo (meses). */
  plazoMeses: number;
  /** Cuota mensual de SOLO interés = monto × tasa_mensual%. */
  cuotaMensualInteres: number;
  /** Interés total del período = cuota mensual × meses. */
  interesTotal: number;
  /** Capital que devuelve al final (= monto). */
  capitalAlFinal: number;
  /** Costo total de la operación = comisión + interés total (NO incluye el capital). */
  costoTotal: number;
}

/** Número finito ≥ 0, o 0. Evita NaN en pantalla ante datos incompletos. */
function pos(n: number | null | undefined): number {
  return Number.isFinite(n) && (n as number) > 0 ? (n as number) : 0;
}

/**
 * Costo del prestatario (empresario) de una operación, esquema bullet/interest-only.
 * Tolera datos incompletos (comisión/tasa/plazo aún sin definir → esos aportes valen
 * 0), así la card muestra lo que ya se sabe sin romperse. `capitalAlFinal` = monto.
 *
 * Ej.: pide 100, comisión 8%, 2% mensual, 4 meses →
 *   comisiónMonto 8 · recibeNeto 92 · cuotaMensual 2 · interésTotal 8 ·
 *   capitalAlFinal 100 · costoTotal 16.
 */
export function costoEmpresario(
  monto: number | null | undefined,
  comisionPct: number | null | undefined,
  tasaMensualPct: number | null | undefined,
  plazoMeses: number | null | undefined,
): CostoEmpresario {
  const m = pos(monto);
  const comision =
    Number.isFinite(comisionPct) && (comisionPct as number) >= 0 ? (comisionPct as number) : 0;
  const tasa =
    Number.isFinite(tasaMensualPct) && (tasaMensualPct as number) >= 0
      ? (tasaMensualPct as number)
      : 0;
  const meses =
    Number.isFinite(plazoMeses) && (plazoMeses as number) > 0
      ? Math.floor(plazoMeses as number)
      : 0;

  const comisionMonto = m * (comision / 100);
  const cuotaMensualInteres = m * (tasa / 100);
  const interesTotal = cuotaMensualInteres * meses;
  return {
    monto: m,
    comisionPct: comision,
    comisionMonto,
    recibeNeto: m - comisionMonto,
    tasaMensualPct: tasa,
    plazoMeses: meses,
    cuotaMensualInteres,
    interesTotal,
    capitalAlFinal: m,
    costoTotal: comisionMonto + interesTotal,
  };
}

export interface CuotaCronograma {
  /** Número de cuota, 1-based. */
  numero: number;
  /** Fecha tentativa de la cuota (ISO). Aproximada: el cronograma real se fija al desembolso. */
  fechaISO: string;
  /** Interés de la cuota (constante en bullet: monto × tasa_mensual%). */
  interes: number;
  /** Capital de la cuota (0 salvo la última, donde se devuelve todo el capital). */
  capital: number;
  /** Total de la cuota = interés + capital. */
  total: number;
}

/**
 * Cronograma TENTATIVO (simulación) de un mutuo bullet/interest-only: `meses` cuotas
 * de solo interés y el capital en la última. Las fechas se aproximan sumando meses a
 * `desde` (default: hoy). Entradas inválidas → []. Es SIMULACIÓN: el cronograma real
 * se define al desembolso (etiquetarlo así en la UI). Determinístico si se pasa `desde`.
 */
/**
 * Suma meses clampeando al último día del mes destino.
 *
 * `setMonth` NO clampea: 31 ene + 1 mes cae en 3 mar. Verificado — un cronograma
 * de 6 cuotas desde el 31 de enero daba DOS cuotas en marzo y NINGUNA en febrero.
 * El comentario anterior decía "setMonth maneja el wrap de año", que es cierto y
 * no era el problema.
 */
export function sumarMeses(base: Date, n: number): Date {
  const d = new Date(base.getTime());
  const dia = d.getDate();
  d.setDate(1); // mover el mes con día 1 evita el desborde
  d.setMonth(d.getMonth() + n);
  const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(dia, ultimo));
  return d;
}

export function cronogramaEmpresario(
  monto: number | null | undefined,
  tasaMensualPct: number | null | undefined,
  meses: number | null | undefined,
  desde: Date = new Date(),
): CuotaCronograma[] {
  const m = pos(monto);
  const n = Number.isFinite(meses) && (meses as number) > 0 ? Math.floor(meses as number) : 0;
  if (m <= 0 || n <= 0) return [];
  const tasa =
    Number.isFinite(tasaMensualPct) && (tasaMensualPct as number) >= 0
      ? (tasaMensualPct as number)
      : 0;
  const interes = m * (tasa / 100);

  const filas: CuotaCronograma[] = [];
  for (let i = 1; i <= n; i++) {
    // Fecha = `desde` + i meses, clampeada al último día del mes destino.
    const f = sumarMeses(desde, i);
    const capital = i === n ? m : 0;
    filas.push({
      numero: i,
      fechaISO: f.toISOString(),
      interes,
      capital,
      total: interes + capital,
    });
  }
  return filas;
}

// ─────────────────────────────────────────────────────────────────────────────
// REFERENCIA para la PRE-CALIFICACIÓN del empresario.
//
// Antes de enviar una solicitud, el empresario quiere saber cuánto recibiría y
// cuánto le costaría. Ese número necesita dos parámetros que fija el STAFF al
// evaluar: el interés mensual y la comisión de intermediación. Todavía no existen
// para una solicitud nueva, así que la única referencia HONESTA es la condición de
// SUS PROPIAS operaciones anteriores (nunca la de otra empresa: no es su dato, y
// tampoco un promedio inventado). Si no tiene historial, la referencia queda en
// null y la UI debe decir "por definir" — jamás asumir 0, porque eso mostraría que
// recibe el 100 % del monto y que la operación no cuesta nada.
// ─────────────────────────────────────────────────────────────────────────────

/** Operación propia, en lo mínimo que necesita la referencia (estructural). */
export interface OperacionReferencia {
  tasaMensual: number | null;
  comisionPct: number | null;
  /** Fecha de creación (ISO). Se usa para tomar la condición más reciente. */
  createdAt: string;
}

export interface ReferenciaEmpresario {
  /** Interés mensual (%) de su operación más reciente que lo tenga, o null. */
  tasaMensual: number | null;
  /** Comisión (%) de su operación más reciente que la tenga, o null. */
  comisionPct: number | null;
  /** Cuántas operaciones propias aportaron algún parámetro (0 ⇒ sin referencia). */
  basadaEnOps: number;
}

const SIN_REFERENCIA: ReferenciaEmpresario = {
  tasaMensual: null,
  comisionPct: null,
  basadaEnOps: 0,
};

/**
 * Referencia de costo a partir de las operaciones propias del empresario: toma, por
 * parámetro, el valor de su operación MÁS RECIENTE que lo tenga definido (ordena por
 * `createdAt` descendente; no confía en el orden de entrada). Un parámetro que nunca
 * se definió queda en null → la UI lo muestra como "por definir".
 *
 * Es una REFERENCIA, no una oferta: las condiciones reales las fija la evaluación.
 */
export function referenciaCostoEmpresario(
  ops: readonly OperacionReferencia[],
): ReferenciaEmpresario {
  if (ops.length === 0) return SIN_REFERENCIA;
  const ordenadas = [...ops].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  let tasaMensual: number | null = null;
  let comisionPct: number | null = null;
  let basadaEnOps = 0;
  for (const op of ordenadas) {
    const tasaOk = op.tasaMensual != null && Number.isFinite(op.tasaMensual) && op.tasaMensual >= 0;
    const comisionOk =
      op.comisionPct != null && Number.isFinite(op.comisionPct) && op.comisionPct >= 0;
    if (!tasaOk && !comisionOk) continue;
    if (tasaMensual == null && tasaOk) tasaMensual = op.tasaMensual;
    if (comisionPct == null && comisionOk) comisionPct = op.comisionPct;
    basadaEnOps += 1;
    if (tasaMensual != null && comisionPct != null) break;
  }
  return { tasaMensual, comisionPct, basadaEnOps };
}
