/**
 * Helpers PUROS del panel del ADMIN (portales de inversión). Sin "server-only" ni
 * Supabase: son derivaciones deterministas (qué le falta a una operación publicada,
 * cuánto lleva estancado un borrador, conversiones y promedios). Viven aparte de
 * data.ts para poder testearlos sin tocar la base — mismo criterio que asesor.ts.
 *
 * La AUTORIZACIÓN vive en data.ts/guards.ts, no acá: estas funciones solo
 * transforman datos que el server ya autorizó.
 *
 * REGLA DE HONESTIDAD: cuando el dato no alcanza (denominador 0, muestra vacía),
 * estas funciones devuelven `null` — nunca 0, nunca el número más favorable. La UI
 * pinta "—" y el admin sabe que no sabe, en vez de creer que sabe.
 */

import type { PortalEstadoOportunidad, PortalMoneda } from "@/lib/portales/config";

/**
 * Días que un BORRADOR puede quedarse quieto antes de contar como estancado. Un
 * borrador es trabajo empezado y sin terminar: si lleva dos semanas ahí, o se
 * publica o se descarta, pero no se olvida.
 */
export const DIAS_BORRADOR_ESTANCADO = 14;

const MS_POR_DIA = 86_400_000;

/**
 * Estados en los que una oportunidad YA ES VISIBLE para el inversionista. Publicar
 * es el punto de no retorno de la calidad del dato: a partir de acá, lo que falte
 * lo ve un cliente.
 *
 * ÚNICA lista: la usan el filtro del catálogo del cliente (data.ts) y el chequeo
 * de salud del admin. Había una copia con otro nombre (ESTADOS_PUBLICOS) en
 * data.ts, y dos listas que se pueden separar significan que el catálogo llegue a
 * mostrar un estado que el chequeo del admin no audita — o al revés.
 */
export const ESTADOS_VISIBLES: readonly PortalEstadoOportunidad[] = ["disponible", "reservada"];

/** ¿Esta operación ya la ve el inversionista (disponible o reservada)? */
export function esVisible(estado: PortalEstadoOportunidad): boolean {
  return ESTADOS_VISIBLES.includes(estado);
}

/**
 * Cada cosa que le puede faltar a una operación publicada. El orden del arreglo es
 * el orden de gravedad con que se listan (primero lo que rompe el negocio, después
 * lo que rompe la ficha).
 */
export type FaltanteOportunidad =
  | "comision"
  | "tasa"
  | "monto"
  | "plazo"
  | "prestatario"
  | "garantia"
  | "riesgo"
  | "documentos"
  | "fotos";

/** Los datos mínimos de una operación para poder revisar su salud. */
export interface OportunidadRevisable {
  estadoPublicacion: PortalEstadoOportunidad;
  /** Comisión de intermediación (%). Sin esto la operación NO genera ingreso. */
  comisionPct: number | null;
  /** Ganancia mensual (%) que se le ofrece al inversionista. */
  tasaMensual: number | null;
  montoSolicitado: number | null;
  plazoMesesMin: number | null;
  plazoMesesMax: number | null;
  prestatarioId: string | null;
  nivelRiesgo: string | null;
  numGarantias: number;
  numDocs: number;
  numFotos: number;
}

/**
 * Qué le falta a una operación PUBLICADA, en orden de gravedad. Arreglo vacío ⇒
 * ficha completa. En un borrador siempre devuelve vacío: un borrador está a medias
 * por definición y marcarlo en rojo sería ruido (para eso está `borradorEstancado`).
 *
 * Por qué importa: hoy nada impide publicar una operación sin comisión (el negocio
 * regala la intermediación y nadie se entera) ni sin garantía (el inversionista ve
 * una ficha que promete respaldo y no lo muestra). Es el riesgo más caro del
 * catálogo y era invisible.
 */
export function faltantesDeOportunidad(op: OportunidadRevisable): FaltanteOportunidad[] {
  if (!esVisible(op.estadoPublicacion)) return [];
  const faltan: FaltanteOportunidad[] = [];
  // Negocio primero: sin comisión no hay ingreso; sin tasa ni monto la ficha no dice nada.
  if (op.comisionPct == null || op.comisionPct <= 0) faltan.push("comision");
  if (op.tasaMensual == null || op.tasaMensual <= 0) faltan.push("tasa");
  if (op.montoSolicitado == null || op.montoSolicitado <= 0) faltan.push("monto");
  if (op.plazoMesesMin == null && op.plazoMesesMax == null) faltan.push("plazo");
  if (!op.prestatarioId) faltan.push("prestatario");
  // Confianza después: garantía, clasificación y evidencia.
  if (op.numGarantias <= 0) faltan.push("garantia");
  if (!op.nivelRiesgo) faltan.push("riesgo");
  if (op.numDocs <= 0) faltan.push("documentos");
  if (op.numFotos <= 0) faltan.push("fotos");
  return faltan;
}

/**
 * Días enteros transcurridos desde `iso` hasta `ahora`. null si la fecha no es
 * válida — nunca un 0 que se confunda con "recién creado". Negativo se recorta a 0
 * (una fecha futura no lleva días esperando).
 */
export function diasDesde(iso: string | null | undefined, ahora: number = Date.now()): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((ahora - t) / MS_POR_DIA));
}

/**
 * ¿Este borrador lleva demasiado tiempo quieto? Solo aplica a `borrador`: una
 * operación publicada no está estancada, está trabajando. `ahora` se inyecta para
 * tests deterministas.
 */
export function borradorEstancado(
  estado: PortalEstadoOportunidad,
  createdAt: string | null | undefined,
  ahora: number = Date.now(),
): boolean {
  if (estado !== "borrador") return false;
  const d = diasDesde(createdAt, ahora);
  return d != null && d >= DIAS_BORRADOR_ESTANCADO;
}

/**
 * Proporción `parte / total` como fracción 0–1, o **null si el total es 0**. Ese
 * null es lo importante: una conversión sin ninguna reserva no es "0 %", es un dato
 * que todavía no existe, y mostrarlo como 0 % haría creer que el portal convierte
 * mal cuando en realidad nunca se midió. Tampoco se recorta a 1: si la parte supera
 * al total, hay una inconsistencia de datos y conviene verla, no esconderla.
 */
export function proporcion(parte: number, total: number): number | null {
  if (!Number.isFinite(parte) || !Number.isFinite(total) || total <= 0) return null;
  return parte / total;
}

/**
 * Promedio de una muestra, o null si está vacía. Igual que arriba: "todavía no hay
 * ticket promedio" no es "el ticket promedio es 0".
 */
export function promedio(valores: readonly number[]): number | null {
  const utiles = valores.filter((v) => Number.isFinite(v));
  if (utiles.length === 0) return null;
  return utiles.reduce((a, b) => a + b, 0) / utiles.length;
}

/** Una fila de la cartera de un asesor, para poder ordenarlas por carga. */
export interface CargaAsesor {
  asesorId: string;
  nombre: string;
  clientes: number;
  /** Prospectos suyos todavía SIN cuenta (0090). Es carga real —los atiende igual—
   *  pero no son usuarios del portal, así que van en su propia columna. */
  prospectos: number;
  /** Clientes suyos que todavía no reservaron nada. */
  clientesSinActividad: number;
  reservasActivas: number;
  /** Moneda DOMINANTE de SU cartera. El comprometido va solo en esta moneda. */
  moneda: PortalMoneda;
  comprometido: number;
  multiMoneda: boolean;
  financiadas: number;
}

/**
 * Ordena la cartera de asesores por CARGA: primero quien más clientes tiene (es a
 * quien hay que aliviar), desempate por comprometido y por nombre para que el orden
 * sea estable entre renders. Puro: no muta el arreglo que recibe.
 */
export function ordenarPorCarga(filas: readonly CargaAsesor[]): CargaAsesor[] {
  return [...filas].sort((a, b) => {
    if (b.clientes !== a.clientes) return b.clientes - a.clientes;
    if (b.comprometido !== a.comprometido) return b.comprometido - a.comprometido;
    return a.nombre.localeCompare(b.nombre);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Integridad de la bitácora (portal_eventos_auditoria, 0089)
// ─────────────────────────────────────────────────────────────────────────────

/** Un registro de la bitácora, reducido a lo que hace falta para revisar la cadena. */
export interface EslabonAuditoria {
  seq: number | null;
  hash: string | null;
  prevHash: string | null;
}

export interface RevisionCadena {
  /** Enlaces comparados (incluye el del inicio si la muestra llega al primer registro). */
  revisados: number;
  /** `seq` de los registros cuyo enlace NO coincide. Vacío ⇒ todo enlaza. */
  rotos: number[];
  ok: boolean;
}

/**
 * Revisa que los ESLABONES de la bitácora enlacen: cada registro guarda el sello del
 * anterior, así que si alguien borra, inserta o reordena una fila del medio, el
 * enlace deja de coincidir y acá se ve.
 *
 * QUÉ PRUEBA Y QUÉ NO — honestidad antes que un "✓ verificado" vacío:
 *  - Detecta: borrado, inserción y reordenamiento de registros; y también la edición
 *    de un registro si quien la hizo recalculó su sello (el siguiente deja de calzar).
 *  - NO detecta: editar el contenido de una fila DEJANDO su sello viejo. Para eso hay
 *    que recalcular el sello de cada fila con la misma fórmula del trigger, y eso solo
 *    se puede hacer bien DENTRO de la base (una función SQL tipo
 *    `verificar_cadena_auditoria`, que hoy NO existe para los portales). Rehacer la
 *    fórmula en el navegador daría falsas alarmas: depende de cómo Postgres serializa
 *    `jsonb` y `timestamptz`, y además `actor_id` se pone en null cuando se borra la
 *    cuenta (`on delete set null`), lo que cambiaría el sello de eventos legítimos.
 *
 * `filas` viene ordenada de la MÁS ANTIGUA a la más reciente. `incluyeInicio` = la
 * muestra llega al primer registro del portal (ahí el enlace previo debe ser vacío:
 * el génesis de esa cadena).
 */
export function revisarCadena(
  filas: readonly EslabonAuditoria[],
  incluyeInicio: boolean,
): RevisionCadena {
  const rotos: number[] = [];
  let revisados = 0;
  const marcar = (fila: EslabonAuditoria) => rotos.push(fila.seq ?? -1);

  filas.forEach((fila, i) => {
    if (i === 0) {
      if (!incluyeInicio) return; // sin el anterior a la vista, no hay nada que comparar
      revisados += 1;
      // Génesis del portal: el trigger guarda cadena vacía, no null.
      if (fila.prevHash !== "" || !fila.hash) marcar(fila);
      return;
    }
    revisados += 1;
    const anterior = filas[i - 1];
    // Un registro sin sello no es "íntegro por defecto": es un registro que la cadena
    // no cubre, y se cuenta como roto.
    if (!fila.hash || !anterior.hash || fila.prevHash !== anterior.hash) marcar(fila);
  });

  return { revisados, rotos, ok: rotos.length === 0 };
}
