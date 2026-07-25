/**
 * Helpers PUROS de la cartera del ASESOR (portales de inversión). Sin "server-only"
 * ni Supabase: son derivaciones deterministas (urgencia de una reserva, fecha
 * aproximada de cobro, teléfono para wa.me, estado del proceso). Viven aparte de
 * data.ts para poder testearlos sin tocar la base — mismo criterio que tasas.ts.
 *
 * La AUTORIZACIÓN (acotar todo a la cartera del asesor) vive en data.ts, no acá:
 * estas funciones solo transforman datos que el server ya autorizó.
 */

import { WA_CC } from "@/lib/constants";
import type { EstadoReserva } from "@/lib/portales/data";
import type { PortalMoneda } from "@/lib/portales/config";
import type { EstadoTimeline } from "@/components/portales/TimelineReserva";

/**
 * Cuánto dura el HOLD de una reserva, en horas.
 *
 * ⚠️ La AUTORIDAD es el SQL: `portal_reservar` / `portal_reservar_para` escriben
 * `now() + interval '24 hours'` y `portal_liberar_vencidas` suelta lo vencido. El
 * vencimiento real de cada reserva viaja en `vence_en`, así que el TS jamás lo
 * calcula — esta constante existe para que lo que el código DERIVE del hold (hoy,
 * la relación con el umbral de urgencia) tenga un solo número al lado del otro y
 * no un 24 suelto por ahí. Si cambia el interval del SQL, cambia también acá.
 */
export const HORAS_HOLD_RESERVA = 24;

/** Una reserva que vence en menos de estas horas (o ya venció) es URGENTE (rojo). */
export const HORAS_RESERVA_URGENTE = 6;

const MS_POR_HORA = 3_600_000;

/**
 * ¿La reserva es urgente? true si vence en menos de HORAS_RESERVA_URGENTE o ya
 * venció (el hold está por soltarse y el asesor pierde la oportunidad). El
 * `ahora` se inyecta para tests deterministas; por defecto Date.now().
 */
export function reservaUrgente(venceEn: string, ahora: number = Date.now()): boolean {
  const t = new Date(venceEn).getTime();
  if (!Number.isFinite(t)) return false;
  return t - ahora <= HORAS_RESERVA_URGENTE * MS_POR_HORA;
}

/**
 * ISO de la fecha aproximada de cobro = `financiadaEn` + `plazoMeses`. El repago
 * de una operación financiada cae, tentativamente, un plazo después del desembolso.
 * null si falta el dato (no financiada, sin plazo) → nunca una fecha inventada.
 */
export function fechaCobroAprox(
  financiadaEn: string | null,
  plazoMeses: number | null | undefined,
): string | null {
  if (!financiadaEn || plazoMeses == null || !Number.isFinite(plazoMeses) || plazoMeses <= 0) {
    return null;
  }
  const d = new Date(financiadaEn);
  if (Number.isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + Math.floor(plazoMeses));
  return d.toISOString();
}

/**
 * ISO del LÍMITE de recordatorios vencidos: fin del día de `ahora` (23:59:59.999).
 * Se usa como corte del panel de pendientes, así "para hoy" YA cuenta como
 * pendiente y no aparece recién mañana. `ahora` se inyecta para tests deterministas.
 */
export function limiteRecordatoriosISO(ahora: number = Date.now()): string {
  const d = new Date(ahora);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

/**
 * ¿Este recordatorio ya toca? true si tiene fecha, no está cerrado y esa fecha cae
 * dentro del día de `ahora` o antes. Espejo en cliente del filtro que hace el
 * server (nunca inventa: sin fecha o ya hecha ⇒ false).
 */
export function recordatorioVencido(
  recordarEn: string | null | undefined,
  hecha: boolean,
  ahora: number = Date.now(),
): boolean {
  if (!recordarEn || hecha) return false;
  const t = new Date(recordarEn).getTime();
  if (!Number.isFinite(t)) return false;
  return t <= new Date(limiteRecordatoriosISO(ahora)).getTime();
}

/**
 * Convierte el valor de un `<input type="date">` ("2026-07-26") en un ISO al
 * MEDIODÍA local. Al mediodía ninguna zona horaria razonable corre la fecha un día
 * (el bug clásico de guardar la medianoche UTC y mostrar el día anterior en Lima).
 * null si el texto no es una fecha válida — nunca una fecha inventada.
 */
export function fechaRecordatorioISO(fecha: string | null | undefined): string | null {
  if (!fecha) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  if (Number.isNaN(d.getTime())) return null;
  // Un mes/día fuera de rango (ej. 2026-02-31) desborda: no es la fecha que pidieron.
  if (d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) return null;
  return d.toISOString();
}

// ─────────────────────────────────────────────────────────────────────────────
// TITULAR de una reserva / de una nota (0090)
//
// Desde que el ASESOR puede bloquear a nombre de alguien que todavía no tiene
// cuenta, el titular es de uno de dos tipos: un MIEMBRO del portal (con cuenta) o
// un PROSPECTO. Al convertir un prospecto, su fila conserva las DOS referencias
// (la cuenta nueva + la procedencia), así que hay que resolver cuál manda. Vive
// acá, puro y testeado, porque lo consultan la cola de reservas, las alertas, la
// ficha 360 y la lista de la cartera: si cada una lo decidiera por su cuenta,
// tarde o temprano una enlazaría a la ficha equivocada.
// ─────────────────────────────────────────────────────────────────────────────

/** Los dos tipos de titular que puede tener una reserva o una nota. */
export type TipoTitular = "cliente" | "prospecto";

/** A quién apunta una fila: tipo + id (el id es de la tabla que corresponde al tipo). */
export interface RefTitular {
  tipo: TipoTitular;
  id: string;
}

/**
 * Resuelve a quién pertenece una reserva/nota. La CUENTA manda sobre la
 * procedencia: si ya hay `clienteId`, el titular es el miembro (aunque conserve
 * `prospectoId`, que es de dónde vino). null solo si la fila no tiene ninguno de
 * los dos, lo que la base ya no permite (check `portal_reservas_titular_chk`).
 */
export function refTitular(
  clienteId: string | null | undefined,
  prospectoId: string | null | undefined,
): RefTitular | null {
  if (clienteId) return { tipo: "cliente", id: clienteId };
  if (prospectoId) return { tipo: "prospecto", id: prospectoId };
  return null;
}

/**
 * Nombre a mostrar del titular, buscado en el mapa que corresponde a su tipo. Si
 * falta (fila borrada, o el asesor no alcanza a verlo) devuelve el guion largo que
 * usa el resto del portal: nunca un id crudo en pantalla.
 */
export function nombreTitular(
  ref: RefTitular | null,
  nombresCliente: ReadonlyMap<string, string>,
  nombresProspecto: ReadonlyMap<string, string>,
): string {
  if (!ref) return "—";
  const m = ref.tipo === "cliente" ? nombresCliente : nombresProspecto;
  return m.get(ref.id) ?? "—";
}

/**
 * Ruta de la ficha 360 del titular dentro del portal. Un prospecto y un cliente
 * viven en tablas distintas y en rutas distintas: enlazar al prospecto por la ruta
 * de clientes daría 404 (y al revés, un 404 que parece "no es tuyo"). `base` es
 * `/<ruta del portal>`. null si no hay titular.
 */
export function hrefTitular(base: string, ref: RefTitular | null): string | null {
  if (!ref) return null;
  return ref.tipo === "cliente"
    ? `${base}/asesor/clientes/${ref.id}`
    : `${base}/asesor/prospectos/${ref.id}`;
}

/**
 * Estados de reserva que cuentan como COMPROMETIDO (dinero apartado del cliente):
 * activa (hold vivo) y confirmada (cerrada, pendiente de financiar). Expirada y
 * cancelada NO comprometen nada.
 */
export const ESTADOS_COMPROMETIDOS: readonly EstadoReserva[] = ["activa", "confirmada"];

/** ¿Este estado de reserva compromete dinero del cliente (activa o confirmada)? */
export function esComprometida(estado: EstadoReserva): boolean {
  return ESTADOS_COMPROMETIDOS.includes(estado);
}

/** Largo de un móvil peruano sin código de país. */
const DIGITOS_MOVIL_PE = 9;

/**
 * Normaliza un teléfono peruano a E.164 sin '+' (listo para wa.me). null si no hay
 * dígitos. Un móvil peruano de 9 dígitos recibe el código de país; si ya lo trae se
 * respeta. Único lugar de esta normalización (lo reusa la cartera del asesor y el
 * contacto del cliente con su asesor). El código de país sale de `WA_CC`, el mismo
 * que arma nuestro propio número: un solo "51" en todo el repo.
 */
export function telefonoWa(tel: string | null | undefined): string | null {
  if (!tel) return null;
  const d = tel.replace(/\D/g, "");
  if (!d) return null;
  // Ya trae código país (51 + los 9 del móvil, o más si es fijo/extranjero).
  if (d.startsWith(WA_CC) && d.length >= WA_CC.length + DIGITOS_MOVIL_PE) return d;
  if (d.length === DIGITOS_MOVIL_PE) return `${WA_CC}${d}`;
  return d;
}

/** Una fila de monto a agregar: su moneda, cuánto compromete y un valor extra
 *  (ganancia esperada o comisión estimada, según el caller). */
export interface FilaMoneda {
  moneda: PortalMoneda;
  comprometido: number;
  extra?: number;
}

/** Resultado de agregar montos: SIEMPRE en una sola moneda (la dominante), nunca
 *  sumando PEN con USD. `multiMoneda` avisa que hay montos en otra moneda fuera del
 *  total (para que la UI lo note en vez de mentir con un único símbolo). */
export interface AgregadoMoneda {
  moneda: PortalMoneda;
  comprometido: number;
  extra: number;
  multiMoneda: boolean;
}

/**
 * Agrega montos SIN mezclar monedas: acumula por moneda y devuelve la de MAYOR
 * comprometido (desempate: PEN). Si hay más de una moneda, `multiMoneda=true` para
 * que la UI muestre "+ otras monedas" en vez de un total falso. Cartera vacía → 0 PEN.
 */
export function monedaDominante(filas: readonly FilaMoneda[]): AgregadoMoneda {
  const buckets = new Map<PortalMoneda, { comprometido: number; extra: number }>();
  for (const f of filas) {
    const b = buckets.get(f.moneda) ?? { comprometido: 0, extra: 0 };
    b.comprometido += f.comprometido;
    b.extra += f.extra ?? 0;
    buckets.set(f.moneda, b);
  }
  if (buckets.size === 0) {
    return { moneda: "PEN", comprometido: 0, extra: 0, multiMoneda: false };
  }
  let mejor: PortalMoneda = "PEN";
  let mejorVal = -Infinity;
  for (const [m, b] of buckets) {
    // Mayor comprometido gana; en empate exacto se prefiere PEN (desempate determinista).
    if (b.comprometido > mejorVal || (b.comprometido === mejorVal && m === "PEN")) {
      mejorVal = b.comprometido;
      mejor = m;
    }
  }
  const b = buckets.get(mejor)!;
  return {
    moneda: mejor,
    comprometido: b.comprometido,
    extra: b.extra,
    multiMoneda: buckets.size > 1,
  };
}

/**
 * Paso del proceso (timeline) que corresponde a una reserva, derivado del estado +
 * si su operación ya quedó financiada. Espejo de la lógica del dashboard del
 * cliente, compartido para no duplicarla. Solo aplica a reservas vivas
 * (activa/confirmada); el caller decide si mostrar timeline para expirada/cancelada.
 */
export function timelineDeReserva(
  estado: EstadoReserva,
  financiadaEn: string | null,
): EstadoTimeline {
  if (financiadaEn) return "financiada";
  if (estado === "confirmada") return "confirmada";
  return "reservada";
}
