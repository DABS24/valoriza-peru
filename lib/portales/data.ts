/**
 * Capa de datos de los PORTALES (server-side).
 *
 * DOS caminos de lectura, a propósito distintos:
 *   · STAFF → con la SESIÓN del usuario (createClient). La RLS `portal_es_staff`
 *     de 0076 es la barrera: un no-staff no ve nada aunque llame la función.
 *   · CLIENTE (catálogo) → con service_role (admin), porque 0076 NO expone
 *     `portal_oportunidades` al cliente por RLS (dejó ese camino para una función
 *     security-definer que no existe todavía). Como el admin bypassa RLS,
 *     REIMPLEMENTAMOS la autorización a mano: se exige membresía activa del
 *     portal (getPortalMiembro), se filtran solo estados públicos
 *     (disponible/reservada) y se OMITE `notas_internas` (solo-staff). Ver el
 *     resumen: si más adelante 0077 agrega la función security-definer, este
 *     camino se reemplaza por ella y se elimina el uso de service_role acá.
 *
 * Columnas ligeras en listados (§6): nunca se traen blobs; las fotos son paths
 * que se firman aparte. Las URLs firmadas se generan server-side (la RLS de
 * storage solo deja firmar al staff; para el cliente firma el admin).
 */

import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPortalMiembro } from "@/lib/portales/guards";
import { signedUrlsPortal } from "@/lib/supabase/storage";
import { gananciaAlPlazo } from "@/lib/portales/tasas";
import {
  fechaCobroAprox,
  telefonoWa,
  esComprometida,
  monedaDominante,
  limiteRecordatoriosISO,
  ESTADOS_COMPROMETIDOS,
  refTitular,
  nombreTitular,
} from "@/lib/portales/asesor";
import type { FilaMoneda, AgregadoMoneda, RefTitular } from "@/lib/portales/asesor";
import {
  promedio,
  proporcion,
  ESTADOS_VISIBLES,
  esVisible,
  faltantesDeOportunidad,
  borradorEstancado,
  diasDesde,
  ordenarPorCarga,
} from "@/lib/portales/admin";
import type { FaltanteOportunidad, CargaAsesor } from "@/lib/portales/admin";
import { portalPorSlug } from "@/lib/portales/config";
import { COPY } from "@/lib/copy";
import type {
  PortalSlug,
  PortalEstadoOportunidad,
  PortalNivelRiesgo,
  PortalMoneda,
} from "@/lib/portales/config";
import { esEmpresario, type PortalRol } from "@/lib/portales/roles";
import type {
  OportunidadComun,
  GarantiaInput,
  PrestatarioBody,
  SolicitudBody,
} from "@/lib/portales/schema";

/** Columnas ligeras para listados/cards. Sin descripcion, notas_internas ni direccion. */
const COLS_LIGHT =
  "id, portal, titulo, distrito, ciudad, moneda, monto_solicitado, plazo_meses_min, plazo_meses_max, tasa_mensual, prestatario_id, nivel_riesgo, rating, estado_publicacion, datos, created_at, reservado_por, reservado_hasta";

/** Columnas ligeras SIN notas_internas — idénticas: el catálogo del cliente reusa esta lista. */
const COLS_LIGHT_PUBLICO = COLS_LIGHT;

/**
 * Resumen del prestatario que se muestra en superficies de CLIENTE y staff:
 * SOLO nombre + posición de la operación. NUNCA scoring_pago ni notas_internas
 * (eso es solo-staff, vive en la sección de gestión, no acá).
 */
export interface PrestatarioResumen {
  id: string;
  nombre: string;
  /** Posición cronológica de ESTA operación entre las del prestatario (1-based). */
  ordinal: number;
  /** Total de operaciones del prestatario. */
  total: number;
  /** Operaciones ya CERRADAS del prestatario (proxy de "completadas"). Público. */
  completadas: number;
}

export interface OportunidadLite {
  id: string;
  portal: PortalSlug;
  titulo: string;
  distrito: string | null;
  ciudad: string | null;
  moneda: PortalMoneda;
  montoSolicitado: number | null;
  plazoMesesMin: number | null;
  plazoMesesMax: number | null;
  /** Ganancia mensual (%). Fuente única de las tasas; TNA/TEA se derivan. */
  tasaMensual: number | null;
  prestatarioId: string | null;
  /** Nombre + posición de la operación del prestatario (o null). Solo datos públicos. */
  prestatario: PrestatarioResumen | null;
  nivelRiesgo: PortalNivelRiesgo | null;
  rating: string | null;
  estadoPublicacion: PortalEstadoOportunidad;
  datos: Record<string, unknown>;
  createdAt: string;
  /** Quién tiene el hold (0078). Se compara con el usuario para saber "reservada por mí". */
  reservadoPor: string | null;
  /** Vencimiento del hold de 24h (para la cuenta regresiva), o null. */
  reservadoHasta: string | null;
  /** URL firmada de la portada (orden 0), o null. */
  portadaUrl: string | null;
  /** Cantidad de fotos de la oportunidad. */
  numFotos: number;
}

export type GarantiaRow = {
  id: string;
  tipo: string;
  titulo: string | null;
  descripcion: string | null;
  valorEstimado: number | null;
  moneda: PortalMoneda;
  orden: number;
};

export type FotoRow = {
  id: string;
  path: string;
  orden: number;
  garantiaId: string | null;
  url: string | null;
};

/**
 * Documento de respaldo (data room). Client-safe: solo metadata visible + URL
 * firmada. NUNCA lleva hash ni datos internos. `tipo` es texto abierto
 * (contrato/tasacion/titulo/carta_fianza/otro); el label lo pone el TS.
 */
export type DocRow = {
  id: string;
  tipo: string;
  nombre: string | null;
  bytes: number | null;
  mime: string | null;
  orden: number;
  url: string | null;
};

export interface OportunidadFull extends OportunidadLite {
  descripcion: string | null;
  direccion: string | null;
  tasa: number | null;
  /** Solo-staff: NUNCA se manda a superficies de cliente. */
  notasInternas: string | null;
  /** Comisión de intermediación (%). En ESTA ficha es solo-staff (gated por
   *  `conNotas`): al inversionista va null. La EMPRESA la ve por su propia
   *  superficie (OportunidadEmpresario), porque es su costo. */
  comisionPct: number | null;
  /** Cuándo el staff marcó la operación como FINANCIADA (cierra el ciclo), o null. */
  financiadaEn: string | null;
  creadoPor: string | null;
  garantias: GarantiaRow[];
  fotos: FotoRow[];
  /** Documentos de respaldo (data room), con URL firmada. */
  docs: DocRow[];
}

export type MiembroRow = {
  portal: PortalSlug;
  userId: string;
  rol: PortalRol;
  nombre: string;
  telefono: string | null;
  asesorId: string | null;
  estado: "activo" | "inactivo";
  createdAt: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

function mapLite(r: Row, portadaUrl: string | null, numFotos: number): OportunidadLite {
  return {
    id: r.id,
    portal: r.portal,
    titulo: r.titulo,
    distrito: r.distrito ?? null,
    ciudad: r.ciudad ?? null,
    moneda: r.moneda,
    montoSolicitado: r.monto_solicitado != null ? Number(r.monto_solicitado) : null,
    plazoMesesMin: r.plazo_meses_min ?? null,
    plazoMesesMax: r.plazo_meses_max ?? null,
    tasaMensual: r.tasa_mensual != null ? Number(r.tasa_mensual) : null,
    prestatarioId: r.prestatario_id ?? null,
    prestatario: null, // se rellena aparte (necesita contexto de todas las ops del prestatario)
    nivelRiesgo: r.nivel_riesgo ?? null,
    rating: r.rating ?? null,
    estadoPublicacion: r.estado_publicacion,
    datos: (r.datos as Record<string, unknown>) ?? {},
    createdAt: r.created_at,
    reservadoPor: r.reservado_por ?? null,
    reservadoHasta: r.reservado_hasta ?? null,
    portadaUrl,
    numFotos,
  };
}

/**
 * Portadas (orden 0, sin garantia) de un set de oportunidades + conteo total.
 * Firma con el client que se le pase (sesión staff o admin para el cliente).
 */
async function portadasDe(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  ids: string[],
): Promise<{
  portada: Map<string, string>;
  conteo: Map<string, number>;
}> {
  const portada = new Map<string, string>();
  const conteo = new Map<string, number>();
  if (ids.length === 0) return { portada, conteo };
  const { data: fotos } = await supabase
    .from("portal_oportunidad_fotos")
    .select("oportunidad_id, path, orden, garantia_id")
    .in("oportunidad_id", ids)
    .order("orden", { ascending: true });
  const portadaPath = new Map<string, string>();
  for (const f of (fotos as Row[]) ?? []) {
    conteo.set(f.oportunidad_id, (conteo.get(f.oportunidad_id) ?? 0) + 1);
    if (f.garantia_id == null && !portadaPath.has(f.oportunidad_id)) {
      portadaPath.set(f.oportunidad_id, f.path);
    }
  }
  const paths = [...portadaPath.values()];
  const firmadas = await signedUrlsPortal(supabase, paths);
  for (const [opId, path] of portadaPath) {
    const url = firmadas[path];
    if (url) portada.set(opId, url);
  }
  return { portada, conteo };
}

/**
 * Resuelve, para un set de oportunidades, el resumen PÚBLICO de su prestatario:
 * nombre + posición cronológica (ordinal) + total de operaciones. NUNCA toca
 * scoring_pago ni notas_internas → seguro para el cliente. El ordinal se calcula
 * sobre TODAS las operaciones del prestatario (no solo las visibles), leyendo
 * columnas mínimas. Firma con el client que se le pase (sesión staff o admin para
 * el cliente): con admin la autorización ya la reimplementó el caller.
 */
async function resumenPrestatarios(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  portal: PortalSlug,
  rows: Row[],
): Promise<Map<string, PrestatarioResumen>> {
  const out = new Map<string, PrestatarioResumen>();
  const ids = [...new Set(rows.map((r) => r.prestatario_id).filter(Boolean))] as string[];
  if (ids.length === 0) return out;

  const [{ data: prest }, { data: allOps }] = await Promise.all([
    supabase.from("portal_prestatarios").select("id, nombre").in("id", ids),
    supabase
      .from("portal_oportunidades")
      .select("id, prestatario_id, estado_publicacion, created_at")
      .eq("portal", portal)
      .in("prestatario_id", ids)
      .order("created_at", { ascending: true }),
  ]);

  const nombre = new Map<string, string>(
    ((prest as Row[]) ?? []).map((p) => [p.id as string, p.nombre as string]),
  );

  // Ordinal cronológico (1-based), total y completadas (cerradas) por prestatario.
  // El track record es PÚBLICO (nº de operaciones y cuántas cerró): no toca scoring
  // ni notas. "Completada" = estado_publicacion 'cerrada' (proxy de financiamiento
  // concretado); es el mismo dato que el empresario ve como "cerradas".
  const total = new Map<string, number>();
  const completadas = new Map<string, number>();
  const ordinalDeOp = new Map<string, number>();
  const cursor = new Map<string, number>();
  // Los borradores no son operaciones reales todavía: no cuentan para el track record
  // ni para el ordinal (inflarían "N operaciones" con cosas no publicadas).
  const opsReales = ((allOps as Row[]) ?? []).filter((o) => o.estado_publicacion !== "borrador");
  for (const o of opsReales) {
    total.set(o.prestatario_id, (total.get(o.prestatario_id) ?? 0) + 1);
    if (o.estado_publicacion === "cerrada")
      completadas.set(o.prestatario_id, (completadas.get(o.prestatario_id) ?? 0) + 1);
  }
  for (const o of opsReales) {
    const n = (cursor.get(o.prestatario_id) ?? 0) + 1;
    cursor.set(o.prestatario_id, n);
    ordinalDeOp.set(o.id, n);
  }

  for (const r of rows) {
    const pid = r.prestatario_id as string | null;
    if (!pid || !nombre.has(pid)) continue;
    out.set(r.id, {
      id: pid,
      nombre: nombre.get(pid)!,
      ordinal: ordinalDeOp.get(r.id) ?? total.get(pid) ?? 1,
      total: total.get(pid) ?? 1,
      completadas: completadas.get(pid) ?? 0,
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// STAFF
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Oportunidad como la ve el STAFF en su listado: la card de siempre + qué datos le
 * faltan si YA está publicada. Ese campo es solo-staff (nunca cruza a `OportunidadLite`
 * del catálogo del cliente): decirle al inversionista "a esta ficha le falta la
 * garantía" sería exactamente lo contrario de lo que se busca — se le arregla, no se
 * le avisa.
 */
export interface OportunidadStaff extends OportunidadLite {
  /** Datos faltantes de una operación publicada. Vacío = ficha completa (o borrador). */
  faltantes: FaltanteOportunidad[];
}

/**
 * Lista oportunidades del portal (STAFF). Columnas ligeras + portada firmada +
 * chequeo de salud de las publicadas. Los conteos de garantías/documentos se piden
 * en la MISMA ronda que la portada (waterfall aplanado) y solo traen la columna de
 * agrupación: nunca blobs ni paths que no se van a firmar.
 */
export async function listarOportunidades(
  portal: PortalSlug,
  opts: { estado?: PortalEstadoOportunidad } = {},
): Promise<OportunidadStaff[]> {
  const supabase = await createClient();
  let q = supabase
    .from("portal_oportunidades")
    .select(`${COLS_LIGHT}, comision_pct`)
    .eq("portal", portal)
    .order("created_at", { ascending: false });
  if (opts.estado) q = q.eq("estado_publicacion", opts.estado);
  const { data } = await q;
  const rows = (data as Row[]) ?? [];
  const ids = rows.map((r) => r.id as string);
  const [{ portada, conteo }, prestatarios, garRes, docRes] = await Promise.all([
    portadasDe(supabase, ids),
    resumenPrestatarios(supabase, portal, rows),
    ids.length
      ? supabase.from("portal_garantias").select("oportunidad_id").in("oportunidad_id", ids)
      : Promise.resolve({ data: [] as Row[] }),
    ids.length
      ? supabase.from("portal_oportunidad_docs").select("oportunidad_id").in("oportunidad_id", ids)
      : Promise.resolve({ data: [] as Row[] }),
  ]);
  const nGar = new Map<string, number>();
  for (const g of (garRes.data as Row[]) ?? [])
    nGar.set(g.oportunidad_id, (nGar.get(g.oportunidad_id) ?? 0) + 1);
  const nDoc = new Map<string, number>();
  for (const d of (docRes.data as Row[]) ?? [])
    nDoc.set(d.oportunidad_id, (nDoc.get(d.oportunidad_id) ?? 0) + 1);

  return rows.map((r) => {
    const numFotos = conteo.get(r.id) ?? 0;
    const lite = mapLite(r, portada.get(r.id) ?? null, numFotos);
    lite.prestatario = prestatarios.get(r.id) ?? null;
    return {
      ...lite,
      faltantes: faltantesDeOportunidad({
        estadoPublicacion: lite.estadoPublicacion,
        comisionPct: r.comision_pct != null ? Number(r.comision_pct) : null,
        tasaMensual: lite.tasaMensual,
        montoSolicitado: lite.montoSolicitado,
        plazoMesesMin: lite.plazoMesesMin,
        plazoMesesMax: lite.plazoMesesMax,
        prestatarioId: lite.prestatarioId,
        nivelRiesgo: lite.nivelRiesgo,
        numGarantias: nGar.get(r.id) ?? 0,
        numDocs: nDoc.get(r.id) ?? 0,
        numFotos,
      }),
    };
  });
}

/** Oportunidad completa (STAFF): incluye notas internas, garantías y fotos. */
export async function getOportunidad(
  portal: PortalSlug,
  id: string,
): Promise<OportunidadFull | null> {
  const supabase = await createClient();
  const { data: op } = await supabase
    .from("portal_oportunidades")
    .select("*")
    .eq("portal", portal)
    .eq("id", id)
    .maybeSingle();
  if (!op) return null;
  return armarFull(supabase, op as Row);
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENTE (catálogo) — service_role + autorización reimplementada a mano
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enmascara el `reservado_por` para superficies de CLIENTE: nunca se filtra el
 * UUID de OTRO inversionista (hallazgo de auditoría). Solo se distingue "mía"
 * (devuelve mi id, para que la UI compute `=== miId`) de "de otro" (sentinela
 * `otro`, que no es un uuid real) o `null` (sin reserva).
 */
function enmascararReservadoPor(reservadoPor: string | null, miId: string): string | null {
  if (!reservadoPor) return null;
  return reservadoPor === miId ? miId : "otro";
}

/**
 * Catálogo para el CLIENTE: solo disponible/reservada, SIN notas_internas.
 * Reimplementa la autorización (exige membresía activa) porque usa service_role.
 */
export async function catalogoParaCliente(portal: PortalSlug): Promise<OportunidadLite[]> {
  const miembro = await getPortalMiembro(portal);
  if (!miembro) return []; // defensa en profundidad (la página ya guarda)
  const admin = createAdminClient();
  const { data } = await admin
    .from("portal_oportunidades")
    .select(COLS_LIGHT_PUBLICO)
    .eq("portal", portal)
    .in("estado_publicacion", [...ESTADOS_VISIBLES])
    .order("created_at", { ascending: false });
  const rows = (data as Row[]) ?? [];
  const [{ portada, conteo }, prestatarios] = await Promise.all([
    portadasDe(
      admin,
      rows.map((r) => r.id),
    ),
    resumenPrestatarios(admin, portal, rows),
  ]);
  return rows.map((r) => {
    const lite = mapLite(r, portada.get(r.id) ?? null, conteo.get(r.id) ?? 0);
    lite.prestatario = prestatarios.get(r.id) ?? null;
    lite.reservadoPor = enmascararReservadoPor(lite.reservadoPor, miembro.userId);
    return lite;
  });
}

/**
 * Ficha de una oportunidad para el CLIENTE. 404 (null) si no existe, no es de su
 * portal, o no está en un estado público. NUNCA devuelve notas_internas.
 */
export async function getOportunidadCliente(
  portal: PortalSlug,
  id: string,
): Promise<OportunidadFull | null> {
  const miembro = await getPortalMiembro(portal);
  if (!miembro) return null;
  const admin = createAdminClient();
  const { data: op } = await admin
    .from("portal_oportunidades")
    // Nota: se seleccionan columnas explícitas para EXCLUIR notas_internas.
    .select(
      "id, portal, titulo, descripcion, direccion, distrito, ciudad, moneda, monto_solicitado, plazo_meses_min, plazo_meses_max, tasa_mensual, prestatario_id, nivel_riesgo, rating, datos, estado_publicacion, creado_por, created_at, reservado_por, reservado_hasta",
    )
    .eq("portal", portal)
    .eq("id", id)
    .in("estado_publicacion", [...ESTADOS_VISIBLES])
    .maybeSingle();
  if (!op) return null;
  const full = await armarFull(admin, op as Row, { conNotas: false });
  full.reservadoPor = enmascararReservadoPor(full.reservadoPor, miembro.userId);
  return full;
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPRESARIO (el prestatario con su propia cuenta) — service_role + autorización
// reimplementada a mano, MISMO patrón que catalogoParaCliente. El empresario NO
// tiene camino RLS a portal_oportunidades (no es staff), y su fila de
// portal_prestatarios trae scoring_pago/notas_internas que NUNCA debe ver: por eso
// se leen SOLO columnas explícitas básicas y se acota `user_id = él` (su prestatario).
// ─────────────────────────────────────────────────────────────────────────────

/** Columnas explícitas para las operaciones del empresario. SIN notas_internas, SIN
 *  nivel_riesgo/rating de la op ni reservado_por (todo eso es interno/inversionista).
 *  SÍ trae comision_pct (el empresario ve SU comisión y SU costo — es su dinero) y
 *  financiada_en (para su timeline). */
const EMPRESA_OP_COLS =
  "id, titulo, distrito, ciudad, moneda, monto_solicitado, plazo_meses_min, plazo_meses_max, tasa_mensual, comision_pct, estado_publicacion, datos, created_at, financiada_en";

/**
 * Operación como la ve el EMPRESARIO (prestatario). A diferencia de OportunidadLite
 * (superficie del inversionista) trae `comisionPct` y `financiadaEn` —SU comisión y
 * el paso de financiamiento— pero NUNCA `reservadoPor` (quién es el inversionista),
 * ni nivel de riesgo, ni rating, ni notas. El framing es de COSTO, no de rentabilidad.
 */
export interface OportunidadEmpresario {
  id: string;
  portal: PortalSlug;
  titulo: string;
  distrito: string | null;
  ciudad: string | null;
  moneda: PortalMoneda;
  montoSolicitado: number | null;
  plazoMesesMin: number | null;
  plazoMesesMax: number | null;
  /** Ganancia/interés mensual (%). Base del costo del prestatario. */
  tasaMensual: number | null;
  /** % de comisión de intermediación. SU dato: la paga la empresa y se descuenta al
   *  desembolso, por eso el empresario SÍ la ve (a diferencia del inversionista). */
  comisionPct: number | null;
  estadoPublicacion: PortalEstadoOportunidad;
  datos: Record<string, unknown>;
  createdAt: string;
  /** Cuándo se marcó FINANCIADA (o null). Para el timeline del empresario. */
  financiadaEn: string | null;
}

function mapEmpresario(r: Row, portal: PortalSlug): OportunidadEmpresario {
  return {
    id: r.id,
    portal,
    titulo: r.titulo,
    distrito: r.distrito ?? null,
    ciudad: r.ciudad ?? null,
    moneda: r.moneda,
    montoSolicitado: r.monto_solicitado != null ? Number(r.monto_solicitado) : null,
    plazoMesesMin: r.plazo_meses_min ?? null,
    plazoMesesMax: r.plazo_meses_max ?? null,
    tasaMensual: r.tasa_mensual != null ? Number(r.tasa_mensual) : null,
    comisionPct: r.comision_pct != null ? Number(r.comision_pct) : null,
    estadoPublicacion: r.estado_publicacion,
    datos: (r.datos as Record<string, unknown>) ?? {},
    createdAt: r.created_at,
    financiadaEn: r.financiada_en ?? null,
  };
}

/**
 * Id del prestatario (empresa) del empresario logueado, o null. Reimplementa la
 * autorización: exige empresario ACTIVO y resuelve por su `user_id` con admin
 * client (su lado no tiene RLS, hardening 0081). Único punto de esa resolución:
 * lo reusan la ficha de empresa, sus operaciones y sus solicitudes.
 */
async function miPrestatarioId(portal: PortalSlug): Promise<string | null> {
  const miembro = await getPortalMiembro(portal);
  if (!miembro || !esEmpresario(miembro.rol)) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("portal_prestatarios")
    .select("id")
    .eq("portal", portal)
    .eq("user_id", miembro.userId)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/** Datos básicos de la empresa del empresario logueado. NUNCA scoring ni notas. */
export interface MiEmpresa {
  id: string;
  nombre: string;
  ruc: string | null;
  numOperaciones: number;
}

/**
 * La empresa (prestatario) del empresario logueado, con columnas EXPLÍCITAS básicas
 * (nombre, ruc, nº de operaciones). Reimplementa la autorización: exige empresario
 * activo y acota al prestatario cuyo `user_id` = él (su propia ficha). NUNCA
 * selecciona scoring_pago, nivel_riesgo ni notas_internas.
 */
export async function getMiEmpresa(portal: PortalSlug): Promise<MiEmpresa | null> {
  const miembro = await getPortalMiembro(portal);
  if (!miembro || !esEmpresario(miembro.rol)) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("portal_prestatarios")
    .select("id, nombre, ruc")
    .eq("portal", portal)
    .eq("user_id", miembro.userId)
    .maybeSingle();
  if (!data) return null;
  const { count } = await admin
    .from("portal_oportunidades")
    .select("id", { count: "exact", head: true })
    .eq("portal", portal)
    .eq("prestatario_id", data.id);
  return {
    id: data.id as string,
    nombre: data.nombre as string,
    ruc: (data.ruc as string | null) ?? null,
    numOperaciones: count ?? 0,
  };
}

/**
 * Las operaciones (oportunidades) de la empresa del empresario, en TODOS los estados
 * (son de él), con columnas explícitas SIN datos internos. Reimplementa la
 * autorización: exige empresario activo y filtra por SU prestatario. El caller
 * agrupa por estado (vigentes = disponible+reservada, cerradas, en evaluación =
 * borrador). Sin portada (no la necesita) → cero firmas de Storage.
 */
export async function oportunidadesDeMiEmpresa(
  portal: PortalSlug,
): Promise<OportunidadEmpresario[]> {
  const prestId = await miPrestatarioId(portal);
  if (!prestId) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("portal_oportunidades")
    .select(EMPRESA_OP_COLS)
    .eq("portal", portal)
    .eq("prestatario_id", prestId)
    .order("created_at", { ascending: false });
  return ((data as Row[]) ?? []).map((r) => mapEmpresario(r, portal));
}

// ─────────────────────────────────────────────────────────────────────────────
// Solicitudes de financiamiento (empresario crea; staff evalúa)
//
// El empresario NO tiene RLS sobre portal_solicitudes (hardening 0081): sus lecturas
// y escrituras van por acá con admin client, REIMPLEMENTANDO la autorización (acotar
// a SU prestatario). El staff sí lee/actualiza por su sesión (RLS portal_es_staff).
// ─────────────────────────────────────────────────────────────────────────────

export type EstadoSolicitud =
  | "en_evaluacion"
  | "aprobada"
  | "rechazada"
  | "convertida"
  /** La retiró la propia empresa (0086). Terminal: no se aprueba ni se convierte. */
  | "retirada";

const SOLICITUD_COLS =
  "id, prestatario_id, monto, moneda, plazo_meses, descripcion, estado, motivo_rechazo, revisado_en, oportunidad_id, created_at";

/** Solicitud como la ve el EMPRESARIO (su propia solicitud, con sus documentos). */
export interface SolicitudEmpresario {
  id: string;
  monto: number | null;
  moneda: PortalMoneda;
  plazoMeses: number | null;
  descripcion: string | null;
  estado: EstadoSolicitud;
  motivoRechazo: string | null;
  createdAt: string;
  revisadoEn: string | null;
  oportunidadId: string | null;
  docs: DocRow[];
}

/** Solicitud como la ve el STAFF: agrega la empresa que la pidió. */
export interface SolicitudStaff extends SolicitudEmpresario {
  prestatarioId: string;
  prestatarioNombre: string;
}

function mapSolicitud(r: Row, docs: DocRow[]): SolicitudEmpresario {
  return {
    id: r.id,
    monto: r.monto != null ? Number(r.monto) : null,
    moneda: r.moneda,
    plazoMeses: r.plazo_meses ?? null,
    descripcion: r.descripcion ?? null,
    estado: r.estado,
    motivoRechazo: r.motivo_rechazo ?? null,
    createdAt: r.created_at,
    revisadoEn: r.revisado_en ?? null,
    oportunidadId: r.oportunidad_id ?? null,
    docs,
  };
}

/**
 * Documentos de un set de solicitudes, agrupados por solicitud_id, con URL firmada.
 * Columnas EXPLÍCITAS (nunca hash). Firma con el client que se le pase.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function docsDeSolicitudes(supabase: any, ids: string[]): Promise<Map<string, DocRow[]>> {
  const out = new Map<string, DocRow[]>();
  if (ids.length === 0) return out;
  const { data } = await supabase
    .from("portal_oportunidad_docs")
    .select("id, solicitud_id, tipo, nombre, path, bytes, mime, orden")
    .in("solicitud_id", ids)
    .order("orden", { ascending: true });
  const rows = (data as Row[]) ?? [];
  const firmadas = await signedUrlsPortal(
    supabase,
    rows.map((d) => d.path),
  );
  for (const d of rows) {
    const doc: DocRow = {
      id: d.id,
      tipo: d.tipo,
      nombre: d.nombre ?? null,
      bytes: d.bytes ?? null,
      mime: d.mime ?? null,
      orden: d.orden,
      url: firmadas[d.path] ?? null,
    };
    const arr = out.get(d.solicitud_id) ?? [];
    arr.push(doc);
    out.set(d.solicitud_id, arr);
  }
  return out;
}

/**
 * Crea una solicitud para la empresa del empresario logueado. Reimplementa la
 * autorización (empresario activo → SU prestatario). Devuelve el id o null. La fila
 * nace en estado 'en_evaluacion'.
 */
export async function crearSolicitud(
  portal: PortalSlug,
  input: SolicitudBody,
): Promise<{ id: string; prestatarioId: string } | null> {
  const prestId = await miPrestatarioId(portal);
  if (!prestId) return null;
  const miembro = await getPortalMiembro(portal);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("portal_solicitudes")
    .insert({
      portal,
      prestatario_id: prestId,
      creado_por: miembro?.userId ?? null,
      monto: input.monto,
      moneda: input.moneda,
      plazo_meses: input.plazo_meses,
      descripcion: input.descripcion?.trim() || null,
      estado: "en_evaluacion",
    })
    .select("id")
    .single();
  if (error || !data) return null;
  return { id: data.id as string, prestatarioId: prestId };
}

/**
 * Las solicitudes de la empresa del empresario logueado, con sus documentos. Acotado
 * a SU prestatario (service_role + columnas explícitas: nunca revisado_por ni datos
 * de staff más allá del motivo de rechazo, que sí es para él).
 */
export async function getMisSolicitudes(portal: PortalSlug): Promise<SolicitudEmpresario[]> {
  const prestId = await miPrestatarioId(portal);
  if (!prestId) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("portal_solicitudes")
    .select(SOLICITUD_COLS)
    .eq("portal", portal)
    .eq("prestatario_id", prestId)
    .order("created_at", { ascending: false });
  const rows = (data as Row[]) ?? [];
  const docs = await docsDeSolicitudes(
    admin,
    rows.map((r) => r.id),
  );
  return rows.map((r) => mapSolicitud(r, docs.get(r.id) ?? []));
}

/**
 * Verifica que una solicitud pertenece al prestatario del empresario logueado (para
 * autorizar subir/borrar documentos). Devuelve el prestatario_id si es suya, o null.
 */
export async function solicitudDeMiEmpresa(
  portal: PortalSlug,
  solicitudId: string,
): Promise<{ prestatarioId: string; estado: EstadoSolicitud } | null> {
  const prestId = await miPrestatarioId(portal);
  if (!prestId) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("portal_solicitudes")
    .select("id, prestatario_id, estado")
    .eq("portal", portal)
    .eq("id", solicitudId)
    .eq("prestatario_id", prestId)
    .maybeSingle();
  if (!data) return null;
  return { prestatarioId: prestId, estado: data.estado as EstadoSolicitud };
}

/**
 * El EMPRESARIO edita SU solicitud (monto, moneda, plazo, descripción) mientras
 * sigue en evaluación. Una vez que el staff la resolvió, es inmutable para él.
 *
 * ANTI-IDOR + CONCURRENCIA (§2): la pertenencia (`prestatario_id` = SU empresa) y
 * el estado van DENTRO del mismo UPDATE, y se verifica la fila devuelta. Nada de
 * "leer, decidir en JS y escribir": entre esos dos pasos el staff pudo aprobarla.
 * El id llega por la URL y NUNCA se confía: si no es suya, el UPDATE toca 0 filas.
 */
export async function editarMiSolicitud(
  portal: PortalSlug,
  solicitudId: string,
  input: SolicitudBody,
): Promise<boolean> {
  const prestId = await miPrestatarioId(portal);
  if (!prestId) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("portal_solicitudes")
    .update({
      monto: input.monto,
      moneda: input.moneda,
      plazo_meses: input.plazo_meses,
      descripcion: input.descripcion?.trim() || null,
    })
    .eq("portal", portal)
    .eq("id", solicitudId)
    .eq("prestatario_id", prestId)
    .eq("estado", "en_evaluacion")
    .select("id");
  return !!data && data.length > 0;
}

/**
 * El EMPRESARIO RETIRA su solicitud: pasa a 'retirada' (0086), estado terminal. No
 * se borra la fila —ni sus documentos— para no perder el rastro de auditoría.
 * Mismas garantías que `editarMiSolicitud`: pertenencia + estado en la MISMA
 * sentencia, y se verifica la fila devuelta (0 filas ⇒ ya no estaba en evaluación).
 */
export async function retirarMiSolicitud(
  portal: PortalSlug,
  solicitudId: string,
): Promise<boolean> {
  const prestId = await miPrestatarioId(portal);
  if (!prestId) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("portal_solicitudes")
    .update({ estado: "retirada" })
    .eq("portal", portal)
    .eq("id", solicitudId)
    .eq("prestatario_id", prestId)
    .eq("estado", "en_evaluacion")
    .select("id");
  return !!data && data.length > 0;
}

/** Solicitudes del portal para el STAFF (con la empresa que las pidió). Por sesión (RLS). */
export async function listarSolicitudesStaff(portal: PortalSlug): Promise<SolicitudStaff[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("portal_solicitudes")
    .select(`${SOLICITUD_COLS}, portal_prestatarios!inner(nombre)`)
    .eq("portal", portal)
    .order("created_at", { ascending: false });
  const rows = (data as Row[]) ?? [];
  const docs = await docsDeSolicitudes(
    supabase,
    rows.map((r) => r.id),
  );
  return rows.map((r) => ({
    ...mapSolicitud(r, docs.get(r.id) ?? []),
    prestatarioId: r.prestatario_id,
    prestatarioNombre: (r.portal_prestatarios?.nombre as string) ?? "—",
  }));
}

/**
 * STAFF resuelve una solicitud: la APRUEBA o la RECHAZA (con motivo). Escritura por
 * SESIÓN (RLS portal_solic_staff_actualiza). CONCURRENCIA (§2): el UPDATE es
 * condicional a estado='en_evaluacion' (no se re-resuelve una ya resuelta) y se
 * verifica la fila devuelta. Devuelve el creado_por para notificar, o null si no
 * aplicaba (ya resuelta / no es de este portal / no autorizado por RLS).
 */
export async function resolverSolicitudStaff(
  portal: PortalSlug,
  solicitudId: string,
  aprobar: boolean,
  userId: string,
  motivo?: string,
): Promise<{ creadoPor: string | null } | null> {
  const supabase = await createClient();
  const patch = aprobar
    ? {
        estado: "aprobada",
        motivo_rechazo: null,
        revisado_por: userId,
        revisado_en: new Date().toISOString(),
      }
    : {
        estado: "rechazada",
        motivo_rechazo: motivo ?? null,
        revisado_por: userId,
        revisado_en: new Date().toISOString(),
      };
  const { data } = await supabase
    .from("portal_solicitudes")
    .update(patch)
    .eq("portal", portal)
    .eq("id", solicitudId)
    .eq("estado", "en_evaluacion")
    .select("id, creado_por");
  if (!data || data.length === 0) return null;
  return { creadoPor: (data[0].creado_por as string | null) ?? null };
}

/**
 * STAFF convierte una solicitud en una OPORTUNIDAD (borrador) prellenada con sus
 * datos, marca la solicitud 'convertida' y la liga. Orden anti-orfandad: primero se
 * crea la oportunidad, luego se hace el claim atómico de la solicitud; si otro la
 * convirtió mientras tanto (0 filas), se borra la oportunidad recién creada (rollback).
 * El resultado es un borrador que el admin completa (tasa, comisión, garantías).
 */
export async function convertirSolicitud(
  portal: PortalSlug,
  solicitudId: string,
  userId: string,
): Promise<{ oportunidadId: string } | null> {
  const supabase = await createClient();
  const { data: sol } = await supabase
    .from("portal_solicitudes")
    .select(
      "id, estado, monto, moneda, plazo_meses, descripcion, prestatario_id, portal_prestatarios!inner(nombre)",
    )
    .eq("portal", portal)
    .eq("id", solicitudId)
    .maybeSingle();
  if (!sol) return null;
  // Solo se convierte lo que sigue vivo. Es una LISTA BLANCA a propósito: con una
  // lista negra ("todo menos convertida/rechazada"), cada estado nuevo nacía
  // convertible por omisión — 'retirada' (0086) habría sido convertible sin querer.
  if (sol.estado !== "en_evaluacion" && sol.estado !== "aprobada") return null;

  const empresaNombre =
    ((sol.portal_prestatarios as { nombre?: string } | null)?.nombre as string) ?? "—";
  const comun: OportunidadComun = {
    titulo: COPY.portales.admin.solicitudes.tituloAuto(empresaNombre),
    descripcion: (sol.descripcion as string | null) ?? "",
    moneda: (sol.moneda as PortalMoneda) ?? "USD",
    monto_solicitado: (sol.monto as number | null) ?? undefined,
    plazo_meses_min: (sol.plazo_meses as number | null) ?? undefined,
    prestatario_id: (sol.prestatario_id as string) ?? "",
    estado_publicacion: "borrador",
  };

  const opId = await crearOportunidad(portal, userId, { comun, datos: {}, garantias: [] });
  if (!opId) return null;

  const { data: upd } = await supabase
    .from("portal_solicitudes")
    .update({
      estado: "convertida",
      oportunidad_id: opId,
      revisado_por: userId,
      revisado_en: new Date().toISOString(),
    })
    .eq("portal", portal)
    .eq("id", solicitudId)
    // Claim atómico con la MISMA lista blanca de arriba (si mientras tanto la
    // empresa la retiró o alguien la convirtió, toca 0 filas y se hace rollback).
    .in("estado", ["en_evaluacion", "aprobada"])
    .is("oportunidad_id", null)
    .select("id");
  if (!upd || upd.length === 0) {
    // Otra request ya la convirtió: deshace la oportunidad huérfana.
    await supabase.from("portal_oportunidades").delete().eq("id", opId);
    return null;
  }
  return { oportunidadId: opId };
}

// ─────────────────────────────────────────────────────────────────────────────
// Miembros
// ─────────────────────────────────────────────────────────────────────────────

/** Todos los miembros del portal (STAFF). */
export async function listarMiembros(portal: PortalSlug): Promise<MiembroRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("portal_miembros")
    .select("portal, user_id, rol, nombre, telefono, asesor_id, estado, created_at")
    .eq("portal", portal)
    .order("created_at", { ascending: true });
  return ((data as Row[]) ?? []).map(mapMiembro);
}

/** Clientes asignados a un asesor (para el dashboard del asesor). */
export async function listarClientesDeAsesor(
  portal: PortalSlug,
  asesorId: string,
): Promise<MiembroRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("portal_miembros")
    .select("portal, user_id, rol, nombre, telefono, asesor_id, estado, created_at")
    .eq("portal", portal)
    .eq("rol", "cliente")
    .eq("asesor_id", asesorId)
    .order("created_at", { ascending: true });
  return ((data as Row[]) ?? []).map(mapMiembro);
}

/** Cliente del asesor + resumen de su actividad (para la lista enriquecida). */
export interface ClienteEnriquecido extends MiembroRow {
  /** Total de reservas del cliente (todos los estados). */
  numReservas: number;
  /** Σ monto de sus reservas activas + confirmadas, SOLO en `moneda` (sin mezclar). */
  montoComprometido: number;
  /** Moneda DOMINANTE de su cartera (la de mayor comprometido). */
  moneda: PortalMoneda;
  /** true si tiene reservas en otra moneda fuera del total. */
  multiMoneda: boolean;
  /** Fecha de su reserva más reciente (ISO), o null si nunca reservó. */
  ultimaActividad: string | null;
}

/**
 * Clientes del asesor ENRIQUECIDOS: nº de reservas, monto comprometido y última
 * actividad, ordenados por actividad más reciente (los sin actividad al final). Con
 * la sesión (RLS staff) y acotado a `asesor_id = él`. Las reservas se leen filtradas
 * por asesor_id (su cartera) y se agregan por cliente; los montos salen de las ops
 * de sus reservas comprometidas (columnas mínimas, nunca notas_internas).
 */
export async function listarClientesDeAsesorEnriquecido(
  portal: PortalSlug,
  asesorId: string,
): Promise<ClienteEnriquecido[]> {
  const supabase = await createClient();
  const [clientes, { data: reservasData }] = await Promise.all([
    listarClientesDeAsesor(portal, asesorId),
    supabase
      .from("portal_reservas")
      .select("cliente_id, oportunidad_id, estado, reservado_en")
      .eq("portal", portal)
      .eq("asesor_id", asesorId)
      // Solo las de titulares CON cuenta: las de prospectos se agregan en su
      // propia lista. Sin este filtro, sus montos caerían en la clave `null` y el
      // conteo de la cartera saldría inflado.
      .not("cliente_id", "is", null),
  ]);
  const reservas = (reservasData as Row[]) ?? [];

  // Ops de reservas COMPROMETIDAS (activa+confirmada) para el monto y la moneda.
  const opIdsCompr = [
    ...new Set(reservas.filter((r) => esComprometida(r.estado)).map((r) => r.oportunidad_id)),
  ];
  const opMonto = new Map<string, number>();
  const opMoneda = new Map<string, PortalMoneda>();
  if (opIdsCompr.length) {
    const { data: ops } = await supabase
      .from("portal_oportunidades")
      .select("id, monto_solicitado, moneda")
      .in("id", opIdsCompr);
    for (const o of (ops as Row[]) ?? []) {
      opMonto.set(o.id, o.monto_solicitado != null ? Number(o.monto_solicitado) : 0);
      if (o.moneda) opMoneda.set(o.id, o.moneda as PortalMoneda);
    }
  }

  // Agregación por cliente. Los montos comprometidos se juntan por moneda (no se
  // suman PEN con USD): cada cliente resuelve a su moneda dominante.
  const numReservas = new Map<string, number>();
  const filasPorCliente = new Map<string, FilaMoneda[]>();
  const ultima = new Map<string, string>();
  for (const r of reservas) {
    const cid = r.cliente_id as string;
    numReservas.set(cid, (numReservas.get(cid) ?? 0) + 1);
    if (esComprometida(r.estado)) {
      const filas = filasPorCliente.get(cid) ?? [];
      filas.push({
        moneda: opMoneda.get(r.oportunidad_id) ?? "PEN",
        comprometido: opMonto.get(r.oportunidad_id) ?? 0,
      });
      filasPorCliente.set(cid, filas);
    }
    const prev = ultima.get(cid);
    if (!prev || (r.reservado_en as string) > prev) ultima.set(cid, r.reservado_en as string);
  }

  const enriquecidos: ClienteEnriquecido[] = clientes.map((c) => {
    const agg = monedaDominante(filasPorCliente.get(c.userId) ?? []);
    return {
      ...c,
      numReservas: numReservas.get(c.userId) ?? 0,
      montoComprometido: agg.comprometido,
      moneda: agg.moneda,
      multiMoneda: agg.multiMoneda,
      ultimaActividad: ultima.get(c.userId) ?? null,
    };
  });

  // Orden: última actividad descendente; los sin actividad, al final (por antigüedad).
  enriquecidos.sort((a, b) => {
    if (a.ultimaActividad && b.ultimaActividad)
      return b.ultimaActividad.localeCompare(a.ultimaActividad);
    if (a.ultimaActividad) return -1;
    if (b.ultimaActividad) return 1;
    return a.createdAt.localeCompare(b.createdAt);
  });
  return enriquecidos;
}

function mapMiembro(r: Row): MiembroRow {
  return {
    portal: r.portal,
    userId: r.user_id,
    rol: r.rol,
    nombre: r.nombre,
    telefono: r.telefono ?? null,
    asesorId: r.asesor_id ?? null,
    estado: r.estado,
    createdAt: r.created_at,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Escrituras de oportunidades (STAFF) — con la sesión: la RLS `portal_es_staff`
// (0076) es la barrera. El route ya guardó; esto es defensa en profundidad.
// ─────────────────────────────────────────────────────────────────────────────

/** Convierte "" / undefined a null y números vacíos a null para persistir limpio. */
function limpio<T>(v: T | "" | undefined): T | null {
  return v === "" || v === undefined ? null : v;
}

/** Columnas comunes → fila de la tabla (comparte create y update). */
function filaComun(c: OportunidadComun, datos: Record<string, unknown>) {
  return {
    titulo: c.titulo,
    descripcion: limpio(c.descripcion),
    direccion: limpio(c.direccion),
    distrito: limpio(c.distrito),
    ciudad: limpio(c.ciudad),
    moneda: c.moneda,
    monto_solicitado: limpio(c.monto_solicitado),
    plazo_meses_min: limpio(c.plazo_meses_min),
    plazo_meses_max: limpio(c.plazo_meses_max),
    tasa_mensual: limpio(c.tasa_mensual),
    comision_pct: limpio(c.comision_pct),
    prestatario_id: limpio(c.prestatario_id),
    nivel_riesgo: limpio(c.nivel_riesgo),
    rating: limpio(c.rating),
    notas_internas: limpio(c.notas_internas),
    datos,
    estado_publicacion: c.estado_publicacion,
  };
}

/** Reemplaza las garantías de una oportunidad (borrar todas + reinsertar). */
/**
 * Reemplaza las garantías de una oportunidad (borrar + insertar).
 *
 * Devuelve `true` solo si TODO salió bien. Antes descartaba los dos resultados y
 * el caller respondía "guardado ✓" pase lo que pase: si el insert fallaba después
 * de que el delete ya había corrido, la operación quedaba **sin garantías** y
 * nadie se enteraba. En un producto de inversión la garantía ES el respaldo de la
 * operación — perderla en silencio no es un detalle cosmético.
 *
 * (No es transaccional: PostgREST no da transacción entre dos llamadas. Lo que sí
 * hace es AVISAR, para que el caller no reporte un éxito que no ocurrió.)
 */
async function reemplazarGarantias(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  portal: PortalSlug,
  oportunidadId: string,
  garantias: GarantiaInput[],
): Promise<boolean> {
  const { error: eDel } = await supabase
    .from("portal_garantias")
    .delete()
    .eq("oportunidad_id", oportunidadId);
  if (eDel) {
    console.error("[portales] no se pudieron borrar las garantías:", oportunidadId, eDel.message);
    return false;
  }
  if (garantias.length === 0) return true;

  const { error: eIns } = await supabase.from("portal_garantias").insert(
    garantias.map((g, i) => ({
      oportunidad_id: oportunidadId,
      portal,
      tipo: g.tipo,
      titulo: limpio(g.titulo),
      descripcion: limpio(g.descripcion),
      valor_estimado: limpio(g.valor_estimado),
      moneda: g.moneda,
      orden: i,
    })),
  );
  if (eIns) {
    // El delete ya corrió: la operación quedó sin garantías. Es lo peor que puede
    // pasar acá, así que tiene que quedar registrado y llegar al caller.
    console.error(
      "[portales] la operación quedó SIN GARANTÍAS tras un insert fallido:",
      oportunidadId,
      eIns.message,
    );
    return false;
  }
  return true;
}

/** Crea una oportunidad + sus garantías. Devuelve el id o null si falló. */
export async function crearOportunidad(
  portal: PortalSlug,
  creadoPor: string,
  input: { comun: OportunidadComun; datos: Record<string, unknown>; garantias: GarantiaInput[] },
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portal_oportunidades")
    .insert({ portal, creado_por: creadoPor, ...filaComun(input.comun, input.datos) })
    .select("id")
    .single();
  if (error || !data) return null;
  // Si las garantías no entraron, la operación existe pero SIN respaldo. No se
  // devuelve el id como si todo hubiera salido bien: el caller tiene que enterarse.
  const conGarantias = await reemplazarGarantias(
    supabase,
    portal,
    data.id as string,
    input.garantias,
  );
  if (!conGarantias) return null;
  return data.id as string;
}

/**
 * Actualiza una oportunidad + reemplaza sus garantías.
 *
 * Devuelve `true`, o un código de error para que la UI explique QUÉ pasó.
 *
 * Guard del modelo bilateral: no se puede devolver a `disponible` una oportunidad
 * que tiene una reserva VIVA. Si se pudiera, la reserva anterior quedaría activa y
 * un segundo inversionista reservaría encima: dos contrapartes sobre el mismo
 * contrato. El invariante duro vive en la base (índice único, 0088); esto es la
 * capa que le dice al staff por qué no lo dejamos, en vez de un error opaco.
 * Para republicar, primero hay que cerrar la reserva vigente.
 */
export async function actualizarOportunidad(
  portal: PortalSlug,
  id: string,
  input: { comun: OportunidadComun; datos: Record<string, unknown>; garantias: GarantiaInput[] },
): Promise<true | "reserva_viva" | "error"> {
  const supabase = await createClient();

  // Republicar exige que no haya contraparte vigente.
  //
  // ⚠️ DEUDA CONOCIDA — esto es check-then-act, el patrón que el estándar evita.
  // No se resolvió acá porque la condición vive en OTRA tabla (`portal_reservas`) y
  // PostgREST no admite subconsultas en un filtro: hacerlo atómico exige una función
  // SQL propia, que es el arreglo correcto cuando toque.
  //
  // Por qué es tolerable mientras tanto: el invariante DURO no depende de esto. El
  // índice único de 0088 impide una segunda reserva viva pase lo que pase. Si alguien
  // republica en la ventana entre el SELECT y el UPDATE, no se corrompe nada — el
  // siguiente inversionista recibe un error feo en vez del "no disponible" limpio.
  // O sea: degrada el mensaje, no la integridad.
  if (input.comun.estado_publicacion === "disponible") {
    const { count } = await supabase
      .from("portal_reservas")
      .select("id", { head: true, count: "exact" })
      .eq("portal", portal)
      .eq("oportunidad_id", id)
      .in("estado", ESTADOS_COMPROMETIDOS);
    if ((count ?? 0) > 0) return "reserva_viva";
  }

  const { error } = await supabase
    .from("portal_oportunidades")
    .update(filaComun(input.comun, input.datos))
    .eq("portal", portal)
    .eq("id", id);
  if (error) return "error";
  if (!(await reemplazarGarantias(supabase, portal, id, input.garantias))) return "error";
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: arma la vista full (garantías + fotos firmadas)
// ─────────────────────────────────────────────────────────────────────────────

async function armarFull(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  op: Row,
  opts: { conNotas?: boolean } = {},
): Promise<OportunidadFull> {
  const [{ data: gars }, { data: fotos }, { data: docs }] = await Promise.all([
    supabase
      .from("portal_garantias")
      .select("id, tipo, titulo, descripcion, valor_estimado, moneda, orden")
      .eq("oportunidad_id", op.id)
      .order("orden", { ascending: true }),
    supabase
      .from("portal_oportunidad_fotos")
      .select("id, path, orden, garantia_id")
      .eq("oportunidad_id", op.id)
      .order("orden", { ascending: true }),
    // Documentos del data room. Columnas EXPLÍCITAS: nunca hash. Se firman igual
    // que las fotos (staff con sesión; cliente con admin, ambos bypass por firma).
    supabase
      .from("portal_oportunidad_docs")
      .select("id, tipo, nombre, path, bytes, mime, orden")
      .eq("oportunidad_id", op.id)
      .order("orden", { ascending: true }),
  ]);

  const fotoRows = (fotos as Row[]) ?? [];
  const docRows = (docs as Row[]) ?? [];
  const firmadas = await signedUrlsPortal(supabase, [
    ...fotoRows.map((f) => f.path),
    ...docRows.map((d) => d.path),
  ]);

  const numFotos = fotoRows.length;
  const portadaUrl =
    fotoRows.find((f) => f.garantia_id == null)?.path != null
      ? (firmadas[fotoRows.find((f) => f.garantia_id == null)!.path] ?? null)
      : null;

  const lite = mapLite(op, portadaUrl, numFotos);
  const prestatarios = await resumenPrestatarios(supabase, op.portal as PortalSlug, [op]);
  lite.prestatario = prestatarios.get(op.id) ?? null;
  return {
    ...lite,
    descripcion: op.descripcion ?? null,
    direccion: op.direccion ?? null,
    tasa: op.tasa != null ? Number(op.tasa) : null,
    notasInternas: opts.conNotas === false ? null : (op.notas_internas ?? null),
    // Comisión: dato del STAFF (y, por su propia superficie, de la EMPRESA que la
    // paga). En la ficha del INVERSIONISTA va null, igual que notasInternas.
    comisionPct:
      opts.conNotas === false ? null : op.comision_pct != null ? Number(op.comision_pct) : null,
    financiadaEn: op.financiada_en ?? null,
    creadoPor: op.creado_por ?? null,
    garantias: ((gars as Row[]) ?? []).map((g) => ({
      id: g.id,
      tipo: g.tipo,
      titulo: g.titulo ?? null,
      descripcion: g.descripcion ?? null,
      valorEstimado: g.valor_estimado != null ? Number(g.valor_estimado) : null,
      moneda: g.moneda,
      orden: g.orden,
    })),
    fotos: fotoRows.map((f) => ({
      id: f.id,
      path: f.path,
      orden: f.orden,
      garantiaId: f.garantia_id ?? null,
      url: firmadas[f.path] ?? null,
    })),
    docs: docRows.map((d) => ({
      id: d.id,
      tipo: d.tipo,
      nombre: d.nombre ?? null,
      bytes: d.bytes != null ? Number(d.bytes) : null,
      mime: d.mime ?? null,
      orden: d.orden,
      url: firmadas[d.path] ?? null,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PRESTATARIOS (contratistas) — STAFF. Con la SESIÓN: la RLS `portal_es_staff`
// de 0077 es la barrera (el scoring/notas NO tienen otro camino de lectura).
// ─────────────────────────────────────────────────────────────────────────────

export interface PrestatarioLite {
  id: string;
  portal: PortalSlug;
  nombre: string;
  ruc: string | null;
  nivelRiesgo: PortalNivelRiesgo | null;
  scoringPago: number | null;
  rating: string | null;
  /** Solo-staff: NUNCA se manda a superficies de cliente (esta lista es admin-only). */
  notasInternas: string | null;
  estado: "activo" | "inactivo";
  createdAt: string;
  /** Nº de operaciones (oportunidades) ligadas a este prestatario. */
  numOperaciones: number;
  /** ¿Ya tiene cuenta de acceso (empresario)? Derivado de user_id; el id NO se expone. */
  tieneCuenta: boolean;
}

/** Opción liviana para selectores (solo activos). */
export interface PrestatarioOpcion {
  id: string;
  nombre: string;
}

function mapPrestatario(r: Row, numOperaciones: number): PrestatarioLite {
  return {
    id: r.id,
    portal: r.portal,
    nombre: r.nombre,
    ruc: r.ruc ?? null,
    nivelRiesgo: r.nivel_riesgo ?? null,
    scoringPago: r.scoring_pago != null ? Number(r.scoring_pago) : null,
    rating: r.rating ?? null,
    notasInternas: r.notas_internas ?? null,
    estado: r.estado,
    createdAt: r.created_at,
    numOperaciones,
    tieneCuenta: r.user_id != null,
  };
}

/**
 * Prestatarios del portal (STAFF) + conteo de operaciones de cada uno. Incluye
 * notas_internas: la tabla es acotada (pocos contratistas) y 100 % staff, y así el
 * form de edición no las pierde. NUNCA se expone al cliente (no hay camino RLS).
 */
export async function listarPrestatarios(portal: PortalSlug): Promise<PrestatarioLite[]> {
  const supabase = await createClient();
  const [{ data: prest }, { data: ops }] = await Promise.all([
    supabase
      .from("portal_prestatarios")
      .select(
        "id, portal, nombre, ruc, nivel_riesgo, scoring_pago, rating, notas_internas, estado, created_at, user_id",
      )
      .eq("portal", portal)
      .order("created_at", { ascending: false }),
    supabase
      .from("portal_oportunidades")
      .select("prestatario_id")
      .eq("portal", portal)
      .not("prestatario_id", "is", null),
  ]);
  const conteo = new Map<string, number>();
  for (const o of (ops as Row[]) ?? [])
    conteo.set(o.prestatario_id, (conteo.get(o.prestatario_id) ?? 0) + 1);
  return ((prest as Row[]) ?? []).map((r) => mapPrestatario(r, conteo.get(r.id) ?? 0));
}

/** Prestatario completo (STAFF): incluye notas internas y conteo de operaciones. */
export async function getPrestatario(
  portal: PortalSlug,
  id: string,
): Promise<PrestatarioLite | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("portal_prestatarios")
    .select(
      "id, portal, nombre, ruc, nivel_riesgo, scoring_pago, rating, notas_internas, estado, created_at",
    )
    .eq("portal", portal)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const { count } = await supabase
    .from("portal_oportunidades")
    .select("id", { count: "exact", head: true })
    .eq("portal", portal)
    .eq("prestatario_id", id);
  return mapPrestatario(data as Row, count ?? 0);
}

/** Opciones (id, nombre) de prestatarios ACTIVOS para el selector del form. */
export async function listarPrestatariosOpciones(portal: PortalSlug): Promise<PrestatarioOpcion[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("portal_prestatarios")
    .select("id, nombre")
    .eq("portal", portal)
    .eq("estado", "activo")
    .order("nombre", { ascending: true });
  return ((data as Row[]) ?? []).map((r) => ({ id: r.id, nombre: r.nombre }));
}

/** Convierte el body Zod a una fila de portal_prestatarios (limpia vacíos a null). */
function filaPrestatario(b: PrestatarioBody) {
  return {
    nombre: b.nombre,
    ruc: limpio(b.ruc),
    nivel_riesgo: limpio(b.nivel_riesgo),
    scoring_pago: b.scoring_pago ?? null,
    rating: limpio(b.rating),
    notas_internas: limpio(b.notas_internas),
    estado: b.estado,
  };
}

/** Crea un prestatario. Devuelve el id o null si falló. */
export async function crearPrestatario(
  portal: PortalSlug,
  creadoPor: string,
  input: PrestatarioBody,
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portal_prestatarios")
    .insert({ portal, creado_por: creadoPor, ...filaPrestatario(input) })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id as string;
}

/** Actualiza un prestatario. Devuelve ok. */
export async function actualizarPrestatario(
  portal: PortalSlug,
  id: string,
  input: PrestatarioBody,
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("portal_prestatarios")
    .update(filaPrestatario(input))
    .eq("portal", portal)
    .eq("id", id);
  return !error;
}

// ─────────────────────────────────────────────────────────────────────────────
// KPIs del portal (STAFF) — para el tablero del admin. Columnas mínimas, un solo
// Promise.all (waterfall aplanado).
// ─────────────────────────────────────────────────────────────────────────────

export interface KpisPortal {
  /** Moneda DOMINANTE del portal (la de mayor monto agregado). TODOS los montos de
   *  abajo van SOLO en esta moneda: nunca se suman PEN con USD. */
  moneda: PortalMoneda;
  /** true si hay operaciones en otra moneda fuera de los totales (la UI lo declara). */
  multiMoneda: boolean;
  ops: {
    total: number;
    borrador: number;
    disponible: number;
    reservada: number;
    cerrada: number;
  };
  /** Suma de monto_solicitado por estado, SOLO en `moneda`. */
  montoDisponible: number;
  montoReservado: number;
  montoCerrado: number;
  /**
   * Comisión de intermediación ESTIMADA (Σ monto_solicitado × comision_pct/100)
   * de las operaciones reservadas + cerradas (las que ya tienen inversionista y
   * generan ingreso). Intel INTERNA del admin; nunca se muestra fuera del tablero.
   */
  comisionEstimada: number;
  /**
   * Comisión de las operaciones YA FINANCIADAS. A diferencia de `comisionEstimada`
   * (que incluye reservas que todavía pueden caerse), esta es la parte que ya se
   * ganó. Se reportan las DOS a propósito: mostrar solo la estimada sería quedarse
   * con el número más favorable.
   */
  comisionFinanciada: number;
  /** Operaciones con `financiada_en` (desembolso REAL, no solo estado 'cerrada'). */
  financiadas: number;
  /** Σ monto de las financiadas, SOLO en `moneda`. Es el capital colocado de verdad. */
  montoFinanciado: number;
  /** Ticket promedio de las financiadas. null si todavía no hay ninguna (no es 0). */
  ticketPromedio: number | null;
  /** Reservas registradas en el portal (todos los estados). Denominador del embudo. */
  reservasTotales: number;
  /** Reservas cuyo hold de 24 h venció sin cerrarse. */
  reservasExpiradas: number;
  /** Reservas que terminaron en una operación financiada. */
  reservasFinanciadas: number;
  /** Conversión reserva→financiada (fracción 0–1). null si nunca hubo una reserva. */
  conversionReservas: number | null;
  miembros: { clientes: number; asesores: number; admins: number };
  /** Solo verticales con prestatarios; null si no aplica. */
  prestatarios: number | null;
}

/**
 * KPIs del tablero del admin. Todo con la sesión (RLS staff), un solo Promise.all
 * por nivel (waterfall aplanado) y columnas mínimas.
 *
 * ⚠️ MONEDAS: antes esto sumaba TODOS los montos sin mirar la moneda y etiquetaba el
 * total con la del primer registro (la op más reciente) — un portal con una op en
 * USD y otra en PEN mostraba un número que no existe, con el símbolo del azar. Ahora
 * se elige la moneda DOMINANTE con `monedaDominante` (el mismo helper que ya usaba el
 * asesor) y se agregan SOLO las filas de esa moneda; `multiMoneda` avisa que hay
 * montos fuera del total. Los conteos (que no son dinero) sí abarcan todo el portal.
 *
 * Las métricas sin muestra (ticket promedio, conversión) devuelven null → la UI pinta
 * "—". Un 0 ahí se leería como un resultado malo en vez de como "todavía no se midió".
 */
export async function kpisPortal(portal: PortalSlug): Promise<KpisPortal> {
  const supabase = await createClient();
  const cfg = portalPorSlug(portal);
  const usaPrestatarios = !!cfg?.prestatarios;

  const [opsRes, miembrosRes, prestRes, reservasRes] = await Promise.all([
    supabase
      .from("portal_oportunidades")
      .select("id, estado_publicacion, monto_solicitado, moneda, comision_pct, financiada_en")
      .eq("portal", portal),
    supabase.from("portal_miembros").select("rol").eq("portal", portal).eq("estado", "activo"),
    usaPrestatarios
      ? supabase
          .from("portal_prestatarios")
          .select("id", { count: "exact", head: true })
          .eq("portal", portal)
      : Promise.resolve({ count: null as number | null }),
    supabase.from("portal_reservas").select("oportunidad_id, estado").eq("portal", portal),
  ]);

  const opRows = (opsRes.data as Row[]) ?? [];

  // Moneda dominante = la de mayor monto agregado. Reusa el helper del asesor para
  // que la regla de "no mezclar monedas" viva en UN solo lugar del repo.
  const agg = monedaDominante(
    opRows.map((o) => ({
      moneda: (o.moneda as PortalMoneda) ?? "PEN",
      comprometido: o.monto_solicitado != null ? Number(o.monto_solicitado) : 0,
    })),
  );
  const moneda = agg.moneda;

  const ops = { total: opRows.length, borrador: 0, disponible: 0, reservada: 0, cerrada: 0 };
  let montoDisponible = 0;
  let montoReservado = 0;
  let montoCerrado = 0;
  let comisionEstimada = 0;
  let comisionFinanciada = 0;
  let financiadas = 0;
  let montoFinanciado = 0;
  const montosFinanciados: number[] = [];
  /** oportunidad_id → ¿ya está financiada? (para el embudo de reservas). */
  const opFinanciada = new Map<string, boolean>();

  for (const o of opRows) {
    const est = o.estado_publicacion as keyof typeof ops;
    if (est in ops && est !== "total") ops[est] += 1;
    const esFinanciada = o.financiada_en != null;
    opFinanciada.set(o.id as string, esFinanciada);
    // Los conteos abarcan todo el portal; el DINERO solo la moneda dominante.
    if (((o.moneda as PortalMoneda) ?? "PEN") !== moneda) {
      if (esFinanciada) financiadas += 1;
      continue;
    }
    const monto = o.monto_solicitado != null ? Number(o.monto_solicitado) : 0;
    const comPct = o.comision_pct != null ? Number(o.comision_pct) : 0;
    const comision = (monto * comPct) / 100;
    if (o.estado_publicacion === "disponible") montoDisponible += monto;
    else if (o.estado_publicacion === "reservada") montoReservado += monto;
    else if (o.estado_publicacion === "cerrada") montoCerrado += monto;
    // Ingreso estimado: solo ops con inversionista (reservadas + cerradas). Las
    // financiadas siguen siendo estado_publicacion='cerrada', así que ya cuentan.
    if (o.estado_publicacion === "reservada" || o.estado_publicacion === "cerrada") {
      comisionEstimada += comision;
    }
    if (esFinanciada) {
      financiadas += 1;
      montoFinanciado += monto;
      comisionFinanciada += comision;
      montosFinanciados.push(monto);
    }
  }

  // Los pendientes derivados de miembros (clientes sin asesor) NO se cuentan acá:
  // los resuelve `alertasAdmin`, que además necesita la lista con nombres. Un mismo
  // dato derivado en dos funciones es un SSOT roto esperando a divergir.
  const miembros = { clientes: 0, asesores: 0, admins: 0 };
  for (const m of (miembrosRes.data as Row[]) ?? []) {
    if (m.rol === "cliente") miembros.clientes += 1;
    else if (m.rol === "asesor") miembros.asesores += 1;
    else if (m.rol === "admin") miembros.admins += 1;
  }

  // Embudo de reservas: cuántas terminaron en un desembolso real.
  //
  // ⚠️ Una reserva convierte solo si ELLA llegó a 'confirmada' Y su operación quedó
  // financiada. No basta con que la op esté financiada: si A la reservó y la dejó
  // vencer y después B la cerró, la reserva de A NO convirtió — contarla inflaría la
  // conversión justo con los casos que se cayeron.
  const reservaRows = (reservasRes.data as Row[]) ?? [];
  let reservasExpiradas = 0;
  let reservasFinanciadas = 0;
  for (const r of reservaRows) {
    if (r.estado === "expirada") reservasExpiradas += 1;
    if (r.estado === "confirmada" && opFinanciada.get(r.oportunidad_id as string)) {
      reservasFinanciadas += 1;
    }
  }

  return {
    moneda,
    multiMoneda: agg.multiMoneda,
    ops,
    montoDisponible,
    montoReservado,
    montoCerrado,
    comisionEstimada,
    comisionFinanciada,
    financiadas,
    montoFinanciado,
    ticketPromedio: promedio(montosFinanciados),
    reservasTotales: reservaRows.length,
    reservasExpiradas,
    reservasFinanciadas,
    conversionReservas: proporcion(reservasFinanciadas, reservaRows.length),
    miembros,
    prestatarios: usaPrestatarios ? ((prestRes as { count: number | null }).count ?? 0) : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RESERVAS (0078) — Historial del cliente + cola del asesor.
//
// Las TRANSICIONES (reservar/confirmar/liberar) NO se tocan acá: son funciones
// SQL security-definer atómicas (0078) que se llaman por rpc desde los routes. Acá
// solo se LEE la bitácora `portal_reservas`.
// ─────────────────────────────────────────────────────────────────────────────

export type EstadoReserva = "activa" | "confirmada" | "expirada" | "cancelada";

export interface ReservaCliente {
  id: string;
  oportunidadId: string;
  oportunidadTitulo: string;
  estado: EstadoReserva;
  reservadoEn: string;
  venceEn: string;
  resueltoEn: string | null;
  /** Cuándo la op quedó FINANCIADA (cierra el ciclo), o null. Deriva el paso del timeline. */
  financiadaEn: string | null;
}

/**
 * Reservas del CLIENTE (su Historial). El cliente NO lee `portal_oportunidades`
 * por RLS, así que el título se resuelve con admin client REIMPLEMENTANDO la
 * autorización: SOLO sus propias filas (cliente_id = usuario). La RLS de
 * `portal_reservas` ya deja al cliente leer las suyas, pero el join a la op exige
 * el admin; se acota a cliente_id para no exponer nada ajeno.
 */
export async function listarReservasCliente(portal: PortalSlug): Promise<ReservaCliente[]> {
  const miembro = await getPortalMiembro(portal);
  if (!miembro) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("portal_reservas")
    .select("id, oportunidad_id, estado, reservado_en, vence_en, resuelto_en")
    .eq("portal", portal)
    .eq("cliente_id", miembro.userId)
    .order("created_at", { ascending: false });
  const rows = (data as Row[]) ?? [];
  const opIds = [...new Set(rows.map((r) => r.oportunidad_id))];
  const titulos = new Map<string, string>();
  const financiada = new Map<string, string | null>();
  if (opIds.length) {
    const { data: ops } = await admin
      .from("portal_oportunidades")
      .select("id, titulo, financiada_en")
      .in("id", opIds);
    for (const o of (ops as Row[]) ?? []) {
      titulos.set(o.id, o.titulo);
      financiada.set(o.id, (o.financiada_en as string | null) ?? null);
    }
  }
  return rows.map((r) => ({
    id: r.id,
    oportunidadId: r.oportunidad_id,
    oportunidadTitulo: titulos.get(r.oportunidad_id) ?? "—",
    estado: r.estado,
    reservadoEn: r.reservado_en,
    venceEn: r.vence_en,
    resueltoEn: r.resuelto_en ?? null,
    financiadaEn: financiada.get(r.oportunidad_id) ?? null,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// MI CARTERA (inversionista) — comprometido, ganancia esperada y calendario de
// cobros. Mismo patrón que listarReservasCliente: admin client REIMPLEMENTANDO la
// autorización (SOLO sus reservas activas+confirmadas), columnas explícitas de la
// op (NUNCA notas_internas ni scoring). Todo lo derivado (ganancia, fecha de cobro)
// se calcula acá con los helpers server-authoritative, no en el browser.
// ─────────────────────────────────────────────────────────────────────────────

export interface CarteraItem {
  reservaId: string;
  oportunidadId: string;
  titulo: string;
  estado: EstadoReserva;
  moneda: PortalMoneda;
  /** Monto solicitado de la op = proxy de lo comprometido (la reserva no lleva monto). */
  monto: number | null;
  /** Ganancia estimada al plazo (interés simple sobre el monto). */
  gananciaEstimada: number;
  /** Fecha aproximada de cobro (ISO): reserva + plazo estimado, o null si no hay plazo. */
  cobroAprox: string | null;
}

export interface CarteraCliente {
  /** Moneda DOMINANTE de su cartera (la de mayor comprometido). Los totales van
   *  solo en esta moneda: nunca se suman PEN con USD. */
  moneda: PortalMoneda;
  /** Σ monto de las reservas activas+confirmadas, SOLO en `moneda`. */
  totalComprometido: number;
  /** Σ ganancia estimada al plazo, SOLO en `moneda`. */
  gananciaEsperada: number;
  /** true si tiene reservas en otra moneda fuera del total (la UI lo debe notar). */
  multiMoneda: boolean;
  numOperaciones: number;
  items: CarteraItem[];
}

/**
 * "Mi cartera" del inversionista: sus reservas activas+confirmadas con el monto
 * comprometido, la ganancia esperada al plazo y la fecha aproximada de cobro. El
 * cliente NO lee `portal_oportunidades` por RLS → admin client acotado a SUS
 * reservas (cliente_id = él); solo columnas públicas de la op. Vacío si no hay
 * miembro (defensa en profundidad).
 */
export async function carteraCliente(portal: PortalSlug): Promise<CarteraCliente> {
  const vacio: CarteraCliente = {
    moneda: "PEN",
    totalComprometido: 0,
    gananciaEsperada: 0,
    multiMoneda: false,
    numOperaciones: 0,
    items: [],
  };
  const miembro = await getPortalMiembro(portal);
  if (!miembro) return vacio;
  const admin = createAdminClient();
  const { data: reservas } = await admin
    .from("portal_reservas")
    .select("id, oportunidad_id, estado, reservado_en")
    .eq("portal", portal)
    .eq("cliente_id", miembro.userId)
    .in("estado", ["activa", "confirmada"])
    .order("reservado_en", { ascending: false });
  const rows = (reservas as Row[]) ?? [];
  if (rows.length === 0) return vacio;

  const opIds = [...new Set(rows.map((r) => r.oportunidad_id))];
  const ops = new Map<string, Row>();
  if (opIds.length) {
    const { data } = await admin
      .from("portal_oportunidades")
      // Columnas EXPLÍCITAS públicas: nunca notas_internas.
      .select(
        "id, titulo, moneda, monto_solicitado, tasa_mensual, plazo_meses_min, plazo_meses_max",
      )
      .in("id", opIds);
    for (const o of (data as Row[]) ?? []) ops.set(o.id, o);
  }

  const items: CarteraItem[] = [];
  // Se agrega por moneda, igual que la cartera del asesor y los KPIs del admin.
  // Antes sumaba todo junto y rotulaba el total con la moneda de la PRIMERA
  // reserva: un inversionista con una op en USD y otra en PEN veía un número que
  // mezclaba ambas — y su asesor, mirando al mismo cliente, veía el total correcto.
  const filas: FilaMoneda[] = [];

  for (const r of rows) {
    const op = ops.get(r.oportunidad_id);
    if (!op) continue;
    const monto = op.monto_solicitado != null ? Number(op.monto_solicitado) : null;
    const tasa = op.tasa_mensual != null ? Number(op.tasa_mensual) : null;
    const plazo = (op.plazo_meses_min ?? op.plazo_meses_max) as number | null;
    const opMoneda = (op.moneda as PortalMoneda) ?? "PEN";
    const g =
      monto != null && tasa != null && plazo != null
        ? gananciaAlPlazo(monto, tasa, plazo)
        : { gananciaMonto: 0 };
    filas.push({ moneda: opMoneda, comprometido: monto ?? 0, extra: g.gananciaMonto });
    items.push({
      reservaId: r.id,
      oportunidadId: r.oportunidad_id,
      titulo: (op.titulo as string) ?? "—",
      estado: r.estado as EstadoReserva,
      moneda: opMoneda,
      monto,
      gananciaEstimada: g.gananciaMonto,
      // Misma derivación que usa el asesor para "próximos cobros": un solo helper
      // puro y testeado, en vez de repetir el cálculo de fecha acá.
      cobroAprox: plazo != null ? fechaCobroAprox(r.reservado_en as string, plazo) : null,
    });
  }

  const agg = monedaDominante(filas);

  return {
    moneda: agg.moneda,
    totalComprometido: agg.comprometido,
    gananciaEsperada: agg.extra,
    multiMoneda: agg.multiMoneda,
    numOperaciones: items.length,
    items,
  };
}

export interface ReservaStaff {
  id: string;
  oportunidadId: string;
  oportunidadTitulo: string;
  clienteNombre: string;
  /** A quién pertenece: miembro con cuenta o prospecto (0090). null solo si la fila
   *  quedó sin titular, cosa que la base ya no permite. */
  titular: RefTitular | null;
  asesorId: string | null;
  estado: EstadoReserva;
  reservadoEn: string;
  venceEn: string;
  /** Cuándo la op quedó FINANCIADA, o null. Solo relevante en la cola de confirmadas. */
  financiadaEn: string | null;
}

/**
 * Cola de reservas para el STAFF. Con la SESIÓN: la RLS `portal_reservas_staff_lee`
 * deja al staff leer todas. Por defecto solo las ACTIVAS (pendientes de confirmar).
 * `soloMias` filtra a las de sus clientes (asesor_id = él). Join ligero a título de
 * la op y nombre del titular (columnas mínimas, todo con la sesión).
 *
 * El titular puede ser un miembro o un PROSPECTO (bloqueo del asesor, 0090), así
 * que el nombre se resuelve en los dos mapas: si solo se mirara `portal_miembros`,
 * las reservas que abre el asesor —que son la mayoría en el flujo real— saldrían
 * en la cola sin nombre.
 */
export async function listarReservasStaff(
  portal: PortalSlug,
  opts: { soloMias?: boolean; asesorId?: string; estado?: EstadoReserva } = {},
): Promise<ReservaStaff[]> {
  const supabase = await createClient();
  let q = supabase
    .from("portal_reservas")
    .select(
      "id, oportunidad_id, cliente_id, prospecto_id, asesor_id, estado, reservado_en, vence_en",
    )
    .eq("portal", portal)
    .eq("estado", opts.estado ?? "activa")
    .order("vence_en", { ascending: true });
  if (opts.soloMias && opts.asesorId) q = q.eq("asesor_id", opts.asesorId);
  const { data } = await q;
  const rows = (data as Row[]) ?? [];
  const refs = rows.map((r) => refTitular(r.cliente_id, r.prospecto_id));
  const opIds = [...new Set(rows.map((r) => r.oportunidad_id))];
  const [opsRes, nombres] = await Promise.all([
    opIds.length
      ? supabase.from("portal_oportunidades").select("id, titulo, financiada_en").in("id", opIds)
      : Promise.resolve({ data: [] as Row[] }),
    nombresDeTitulares(supabase, portal, refs),
  ]);
  const titulos = new Map<string, string>();
  const financiada = new Map<string, string | null>();
  for (const o of (opsRes.data as Row[]) ?? []) {
    titulos.set(o.id, o.titulo);
    financiada.set(o.id, (o.financiada_en as string | null) ?? null);
  }
  return rows.map((r, i) => ({
    id: r.id,
    oportunidadId: r.oportunidad_id,
    oportunidadTitulo: titulos.get(r.oportunidad_id) ?? "—",
    clienteNombre: nombreTitular(refs[i], nombres.clientes, nombres.prospectos),
    titular: refs[i],
    asesorId: r.asesor_id ?? null,
    estado: r.estado,
    reservadoEn: r.reservado_en,
    venceEn: r.vence_en,
    financiadaEn: financiada.get(r.oportunidad_id) ?? null,
  }));
}

export interface KpisAsesor {
  clientes: number;
  /** Registrados por él y todavía SIN cuenta (0090). Se cuentan aparte a propósito:
   *  sumarlos a `clientes` inflaría el número de usuarios del portal con gente que
   *  no puede iniciar sesión. */
  prospectos: number;
  reservasPendientes: number;
  disponibles: number;
  /** Moneda DOMINANTE de su cartera (la de mayor comprometido). Los totales van solo
   *  en esta moneda: nunca se suman PEN con USD. */
  moneda: PortalMoneda;
  /** Σ monto_solicitado de las reservas activas + confirmadas, SOLO en `moneda`. */
  comprometido: number;
  /** Comisión estimada = Σ monto × comision_pct/100, SOLO en `moneda` (intel interna). */
  comisionEstimada: number;
  /** true si hay operaciones en otra moneda fuera del total (la UI lo debe notar). */
  multiMoneda: boolean;
  /** Operaciones de su cartera ya FINANCIADAS (financiada_en no nulo). */
  cerradas: number;
}

/**
 * KPIs del dashboard del asesor, incluidos los de DINERO de SU cartera. Todo con la
 * sesión (RLS staff) y acotado a `asesor_id = él`. Los conteos van en un Promise.all;
 * los montos se derivan de sus reservas comprometidas (activas+confirmadas) unidas a
 * sus operaciones (monto, comisión, financiamiento). La comisión la ven el staff (RLS
 * de portal_oportunidades) y la propia EMPRESA en su panel (server, columnas
 * explícitas: COLS_EMPRESARIO) — nunca el inversionista.
 */
export async function kpisAsesor(portal: PortalSlug, asesorId: string): Promise<KpisAsesor> {
  const supabase = await createClient();
  const [cliRes, prosRes, resRes, dispRes, comprRes] = await Promise.all([
    supabase
      .from("portal_miembros")
      .select("user_id", { count: "exact", head: true })
      .eq("portal", portal)
      .eq("rol", "cliente")
      .eq("asesor_id", asesorId)
      .eq("estado", "activo"),
    // Prospectos vivos (sin convertir): los convertidos ya se cuentan como clientes.
    supabase
      .from("portal_prospectos")
      .select("id", { count: "exact", head: true })
      .eq("portal", portal)
      .eq("asesor_id", asesorId)
      .is("convertido_user_id", null),
    supabase
      .from("portal_reservas")
      .select("id", { count: "exact", head: true })
      .eq("portal", portal)
      .eq("estado", "activa")
      .eq("asesor_id", asesorId),
    supabase
      .from("portal_oportunidades")
      .select("id", { count: "exact", head: true })
      .eq("portal", portal)
      .eq("estado_publicacion", "disponible"),
    supabase
      .from("portal_reservas")
      .select("oportunidad_id")
      .eq("portal", portal)
      .eq("asesor_id", asesorId)
      .in("estado", ["activa", "confirmada"]),
  ]);

  const opIds = [...new Set(((comprRes.data as Row[]) ?? []).map((r) => r.oportunidad_id))];
  const filas: FilaMoneda[] = [];
  let cerradas = 0;
  if (opIds.length) {
    const { data: ops } = await supabase
      .from("portal_oportunidades")
      .select("id, moneda, monto_solicitado, comision_pct, financiada_en")
      .in("id", opIds);
    for (const o of (ops as Row[]) ?? []) {
      const monto = o.monto_solicitado != null ? Number(o.monto_solicitado) : 0;
      const comPct = o.comision_pct != null ? Number(o.comision_pct) : 0;
      filas.push({
        moneda: (o.moneda as PortalMoneda) ?? "PEN",
        comprometido: monto,
        extra: (monto * comPct) / 100,
      });
      if (o.financiada_en != null) cerradas += 1;
    }
  }
  // No mezclar monedas: total en la moneda dominante, con aviso si hay otra.
  const agg = monedaDominante(filas);

  return {
    clientes: cliRes.count ?? 0,
    prospectos: prosRes.count ?? 0,
    reservasPendientes: resRes.count ?? 0,
    disponibles: dispRes.count ?? 0,
    moneda: agg.moneda,
    comprometido: agg.comprometido,
    comisionEstimada: agg.extra,
    multiMoneda: agg.multiMoneda,
    cerradas,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ALERTAS del asesor — lo URGENTE de SU cartera (reservas por vencer + próximos
// cobros). Todo con la SESIÓN (RLS staff) y ACOTADO a `asesor_id = él`: nunca ve
// reservas de la cartera de otro asesor. Un solo Promise.all por ronda.
// ─────────────────────────────────────────────────────────────────────────────

/** Reserva activa de la cartera del asesor que se acerca a vencer (hold 24h). */
export interface AlertaReserva {
  reservaId: string;
  oportunidadId: string;
  oportunidadTitulo: string;
  clienteNombre: string;
  /** Miembro con cuenta o prospecto (0090): decide a qué ficha enlaza el panel. */
  titular: RefTitular | null;
  /** Vencimiento del hold (ISO). La urgencia (<6h) la deriva el cliente con reservaUrgente. */
  venceEn: string;
}

/** Cobro próximo: operación financiada de un cliente cuyo repago se acerca. */
export interface AlertaCobro {
  reservaId: string;
  oportunidadId: string;
  oportunidadTitulo: string;
  clienteNombre: string;
  /** Miembro con cuenta o prospecto (0090). */
  titular: RefTitular | null;
  moneda: PortalMoneda;
  /** Monto estimado a cobrar = capital + ganancia al plazo (interés simple). */
  montoEstimado: number;
  /** Fecha aproximada del repago (ISO) = financiada_en + plazo. */
  cobroAprox: string;
}

/** Recordatorio PROPIO del asesor que ya toca (nota con recordar_en <= hoy, sin cerrar). */
export interface AlertaRecordatorio {
  notaId: string;
  /** Sujeto de la nota (cliente o prospecto): el panel enlaza a su ficha 360. */
  titular: RefTitular | null;
  clienteNombre: string;
  texto: string;
  /** Fecha de la próxima acción (ISO). */
  recordarEn: string;
}

export interface AlertasAsesor {
  porVencer: AlertaReserva[];
  proximosCobros: AlertaCobro[];
  /** Notas propias con próxima acción vencida y sin cerrar (la libreta cobrando). */
  recordatorios: AlertaRecordatorio[];
  /**
   * Solicitudes de financiamiento del portal en `en_evaluacion`. Es un pendiente
   * del EQUIPO, no de su cartera: quien las resuelve es un admin del portal.
   * 0 en verticales sin prestatarios (ahí no existe el flujo).
   */
  solicitudesSinRevisar: number;
}

/**
 * Alertas de la cartera del asesor: reservas ACTIVAS por vencer (ordenadas por
 * vencimiento ascendente), PRÓXIMOS COBROS (operaciones financiadas de sus
 * clientes, ordenadas por fecha de cobro), sus RECORDATORIOS vencidos (libreta,
 * 0086) y las SOLICITUDES sin revisar del portal. Con la sesión (RLS staff) y
 * filtrado a `asesor_id = asesorId` / `autor_id = asesorId` en el origen: la
 * barrera es la cláusula, no la UI. Las solicitudes son la única cifra del
 * EQUIPO (no de su cartera) y se declara como tal en la UI. Los derivados (fecha
 * de cobro, monto estimado) se calculan acá server-side. Una sola ronda por nivel.
 */
export async function alertasAsesor(portal: PortalSlug, asesorId: string): Promise<AlertasAsesor> {
  const supabase = await createClient();
  // El flujo de solicitudes solo existe en verticales con prestatarios: en las
  // demás ni se consulta (evita una query que siempre daría 0).
  const haySolicitudes = !!portalPorSlug(portal)?.prestatarios;
  const [activasRes, confirmadasRes, notasRes, solicRes] = await Promise.all([
    supabase
      .from("portal_reservas")
      .select("id, oportunidad_id, cliente_id, prospecto_id, vence_en")
      .eq("portal", portal)
      .eq("asesor_id", asesorId)
      .eq("estado", "activa")
      .order("vence_en", { ascending: true }),
    supabase
      .from("portal_reservas")
      .select("id, oportunidad_id, cliente_id, prospecto_id")
      .eq("portal", portal)
      .eq("asesor_id", asesorId)
      .eq("estado", "confirmada"),
    // Recordatorios PROPIOS que ya tocan: hasta el fin del día de hoy y sin cerrar.
    supabase
      .from("portal_notas")
      .select("id, cliente_id, prospecto_id, texto, recordar_en")
      .eq("portal", portal)
      .eq("autor_id", asesorId)
      .eq("hecha", false)
      .not("recordar_en", "is", null)
      .lte("recordar_en", limiteRecordatoriosISO())
      .order("recordar_en", { ascending: true }),
    haySolicitudes
      ? supabase
          .from("portal_solicitudes")
          .select("id", { count: "exact", head: true })
          .eq("portal", portal)
          .eq("estado", "en_evaluacion")
      : Promise.resolve({ count: 0 }),
  ]);
  const activas = (activasRes.data as Row[]) ?? [];
  const confirmadas = (confirmadasRes.data as Row[]) ?? [];
  const notasVencidas = (notasRes.data as Row[]) ?? [];

  const opIds = [...new Set([...activas, ...confirmadas].map((r) => r.oportunidad_id))];
  // El titular de cada fila (reserva o nota) puede ser miembro o prospecto: se
  // resuelve una sola vez y se reusa por índice, sin volver a decidirlo por caso.
  const refActivas = activas.map((r) => refTitular(r.cliente_id, r.prospecto_id));
  const refConfirmadas = confirmadas.map((r) => refTitular(r.cliente_id, r.prospecto_id));
  const refNotas = notasVencidas.map((n) => refTitular(n.cliente_id, n.prospecto_id));
  const [opsRes, nombres] = await Promise.all([
    opIds.length
      ? supabase
          .from("portal_oportunidades")
          .select(
            "id, titulo, moneda, monto_solicitado, tasa_mensual, plazo_meses_min, plazo_meses_max, financiada_en",
          )
          .in("id", opIds)
      : Promise.resolve({ data: [] as Row[] }),
    nombresDeTitulares(supabase, portal, [...refActivas, ...refConfirmadas, ...refNotas]),
  ]);
  const ops = new Map<string, Row>();
  for (const o of (opsRes.data as Row[]) ?? []) ops.set(o.id, o);
  const nombreDe = (ref: RefTitular | null) =>
    nombreTitular(ref, nombres.clientes, nombres.prospectos);

  const porVencer: AlertaReserva[] = activas.map((r, i) => ({
    reservaId: r.id,
    oportunidadId: r.oportunidad_id,
    oportunidadTitulo: ops.get(r.oportunidad_id)?.titulo ?? "—",
    clienteNombre: nombreDe(refActivas[i]),
    titular: refActivas[i],
    venceEn: r.vence_en,
  }));

  const proximosCobros: AlertaCobro[] = [];
  confirmadas.forEach((r, i) => {
    const op = ops.get(r.oportunidad_id);
    if (!op || op.financiada_en == null) return;
    const plazo = (op.plazo_meses_min ?? op.plazo_meses_max) as number | null;
    const cobro = fechaCobroAprox(op.financiada_en as string, plazo);
    if (!cobro) return;
    const monto = op.monto_solicitado != null ? Number(op.monto_solicitado) : 0;
    const tasa = op.tasa_mensual != null ? Number(op.tasa_mensual) : 0;
    const total = plazo != null ? gananciaAlPlazo(monto, tasa, plazo).total : monto;
    proximosCobros.push({
      reservaId: r.id,
      oportunidadId: r.oportunidad_id,
      oportunidadTitulo: (op.titulo as string) ?? "—",
      clienteNombre: nombreDe(refConfirmadas[i]),
      titular: refConfirmadas[i],
      moneda: (op.moneda as PortalMoneda) ?? "PEN",
      montoEstimado: total,
      cobroAprox: cobro,
    });
  });
  proximosCobros.sort((a, b) => a.cobroAprox.localeCompare(b.cobroAprox));

  const recordatorios: AlertaRecordatorio[] = notasVencidas.map((n, i) => ({
    notaId: n.id as string,
    titular: refNotas[i],
    clienteNombre: nombreDe(refNotas[i]),
    texto: n.texto as string,
    recordarEn: n.recordar_en as string,
  }));

  return {
    porVencer,
    proximosCobros,
    recordatorios,
    solicitudesSinRevisar: solicRes.count ?? 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COLA DE TRABAJO del ADMIN — lo que le toca a ÉL, no a un asesor. Espejo de
// alertasAsesor pero con el alcance del portal completo: solicitudes sin resolver,
// reservas que nadie está gestionando, catálogo publicado con datos faltantes,
// borradores olvidados y clientes que no tiene asignado ningún asesor.
//
// Todo con la SESIÓN (RLS staff), columnas mínimas y una ronda por nivel. La
// autorización de que quien pregunta es ADMIN la pone la página (requirePortalAdmin);
// acá la barrera adicional es la RLS de staff.
// ─────────────────────────────────────────────────────────────────────────────

/** Operación YA PUBLICADA a la que le falta un dato clave (riesgo de negocio). */
export interface OportunidadIncompleta {
  id: string;
  titulo: string;
  estadoPublicacion: PortalEstadoOportunidad;
  /** Qué le falta, en orden de gravedad (ver faltantesDeOportunidad). */
  faltantes: FaltanteOportunidad[];
}

/** Borrador que lleva demasiado tiempo sin publicarse ni descartarse. */
export interface BorradorOlvidado {
  id: string;
  titulo: string;
  createdAt: string;
  /** Días que lleva quieto (derivado server-side, determinista). */
  dias: number;
}

/** Inversionista activo que no tiene asesor asignado: no lo acompaña nadie. */
export interface ClienteHuerfano {
  userId: string;
  nombre: string;
  createdAt: string;
}

export interface AlertasAdmin {
  /** Solicitudes de financiamiento en evaluación (las resuelve un admin). */
  solicitudesSinRevisar: number;
  /** Reservas ACTIVAS de todo el portal, ordenadas por vencimiento. */
  reservasPorVencer: AlertaReserva[];
  /** De esas, las que no tienen asesor asignado: nadie las está gestionando. */
  reservasSinAsesor: number;
  /** Operaciones visibles al inversionista con datos faltantes. */
  publicadasIncompletas: OportunidadIncompleta[];
  /** Borradores estancados (≥ DIAS_BORRADOR_ESTANCADO). */
  borradoresOlvidados: BorradorOlvidado[];
  /** Inversionistas activos sin asesor. */
  clientesSinAsesor: ClienteHuerfano[];
}

/**
 * Pendientes del ADMIN. El hallazgo que motiva esta función: el asesor SÍ tenía un
 * panel de pendientes y el admin no tenía ninguno — su inicio era un tablero de
 * conteos estático. Las solicitudes que solo él puede resolver aparecían en el panel
 * del asesor (que no puede resolverlas) y no en el suyo.
 *
 * La salud del catálogo es el pendiente más caro: hoy nada impide publicar una
 * operación sin comisión (el negocio regala la intermediación) o sin garantía (la
 * ficha promete respaldo y no lo muestra). El criterio de "qué falta" vive en el
 * helper puro `faltantesDeOportunidad` (testeado), no acá.
 */
export async function alertasAdmin(portal: PortalSlug): Promise<AlertasAdmin> {
  const supabase = await createClient();
  const haySolicitudes = !!portalPorSlug(portal)?.prestatarios;

  const [opsRes, activasRes, clientesRes, solicRes] = await Promise.all([
    supabase
      .from("portal_oportunidades")
      .select(
        "id, titulo, estado_publicacion, comision_pct, tasa_mensual, monto_solicitado, plazo_meses_min, plazo_meses_max, prestatario_id, nivel_riesgo, created_at",
      )
      .eq("portal", portal)
      .neq("estado_publicacion", "cerrada"),
    supabase
      .from("portal_reservas")
      .select("id, oportunidad_id, cliente_id, prospecto_id, asesor_id, vence_en")
      .eq("portal", portal)
      .eq("estado", "activa")
      .order("vence_en", { ascending: true }),
    supabase
      .from("portal_miembros")
      .select("user_id, nombre, created_at")
      .eq("portal", portal)
      .eq("rol", "cliente")
      .eq("estado", "activo")
      .is("asesor_id", null)
      .order("created_at", { ascending: true }),
    haySolicitudes
      ? supabase
          .from("portal_solicitudes")
          .select("id", { count: "exact", head: true })
          .eq("portal", portal)
          .eq("estado", "en_evaluacion")
      : Promise.resolve({ count: 0 }),
  ]);

  const opRows = (opsRes.data as Row[]) ?? [];
  const activas = (activasRes.data as Row[]) ?? [];

  // Conteos de garantías/fotos/documentos SOLO de las operaciones ya visibles: es lo
  // único que necesita el chequeo de salud, y así no se traen filas de borradores.
  const idsVisibles = opRows
    .filter((o) => esVisible(o.estado_publicacion))
    .map((o) => o.id as string);
  const [garRes, fotoRes, docRes] = await Promise.all([
    idsVisibles.length
      ? supabase.from("portal_garantias").select("oportunidad_id").in("oportunidad_id", idsVisibles)
      : Promise.resolve({ data: [] as Row[] }),
    idsVisibles.length
      ? supabase
          .from("portal_oportunidad_fotos")
          .select("oportunidad_id")
          .in("oportunidad_id", idsVisibles)
      : Promise.resolve({ data: [] as Row[] }),
    idsVisibles.length
      ? supabase
          .from("portal_oportunidad_docs")
          .select("oportunidad_id")
          .in("oportunidad_id", idsVisibles)
      : Promise.resolve({ data: [] as Row[] }),
  ]);

  const contar = (rows: Row[] | null | undefined): Map<string, number> => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) {
      const k = r.oportunidad_id as string;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  };
  const nGar = contar(garRes.data as Row[]);
  const nFoto = contar(fotoRes.data as Row[]);
  const nDoc = contar(docRes.data as Row[]);

  const ahora = Date.now();
  const publicadasIncompletas: OportunidadIncompleta[] = [];
  const borradoresOlvidados: BorradorOlvidado[] = [];
  for (const o of opRows) {
    const estado = o.estado_publicacion as PortalEstadoOportunidad;
    if (esVisible(estado)) {
      const faltantes = faltantesDeOportunidad({
        estadoPublicacion: estado,
        comisionPct: o.comision_pct != null ? Number(o.comision_pct) : null,
        tasaMensual: o.tasa_mensual != null ? Number(o.tasa_mensual) : null,
        montoSolicitado: o.monto_solicitado != null ? Number(o.monto_solicitado) : null,
        plazoMesesMin: o.plazo_meses_min ?? null,
        plazoMesesMax: o.plazo_meses_max ?? null,
        prestatarioId: o.prestatario_id ?? null,
        nivelRiesgo: o.nivel_riesgo ?? null,
        numGarantias: nGar.get(o.id) ?? 0,
        numFotos: nFoto.get(o.id) ?? 0,
        numDocs: nDoc.get(o.id) ?? 0,
      });
      if (faltantes.length > 0) {
        publicadasIncompletas.push({
          id: o.id,
          titulo: (o.titulo as string) ?? "—",
          estadoPublicacion: estado,
          faltantes,
        });
      }
    } else if (borradorEstancado(estado, o.created_at as string, ahora)) {
      borradoresOlvidados.push({
        id: o.id,
        titulo: (o.titulo as string) ?? "—",
        createdAt: o.created_at as string,
        dias: diasDesde(o.created_at as string, ahora) ?? 0,
      });
    }
  }
  // Lo más incompleto primero: es lo que más urge sacar de la vitrina.
  publicadasIncompletas.sort((a, b) => b.faltantes.length - a.faltantes.length);
  borradoresOlvidados.sort((a, b) => b.dias - a.dias);

  // Títulos y nombres de las reservas activas (columnas mínimas, con la sesión).
  // El titular puede ser un prospecto: el admin del portal los lee todos por RLS.
  const opIds = [...new Set(activas.map((r) => r.oportunidad_id as string))];
  const refsActivas = activas.map((r) => refTitular(r.cliente_id, r.prospecto_id));
  const [titRes, nombres] = await Promise.all([
    opIds.length
      ? supabase.from("portal_oportunidades").select("id, titulo").in("id", opIds)
      : Promise.resolve({ data: [] as Row[] }),
    nombresDeTitulares(supabase, portal, refsActivas),
  ]);
  const titulos = new Map<string, string>();
  for (const o of (titRes.data as Row[]) ?? []) titulos.set(o.id, o.titulo);

  return {
    solicitudesSinRevisar: (solicRes as { count: number | null }).count ?? 0,
    reservasPorVencer: activas.map((r, i) => ({
      reservaId: r.id,
      oportunidadId: r.oportunidad_id,
      oportunidadTitulo: titulos.get(r.oportunidad_id) ?? "—",
      clienteNombre: nombreTitular(refsActivas[i], nombres.clientes, nombres.prospectos),
      titular: refsActivas[i],
      venceEn: r.vence_en,
    })),
    reservasSinAsesor: activas.filter((r) => !r.asesor_id).length,
    publicadasIncompletas,
    borradoresOlvidados,
    clientesSinAsesor: ((clientesRes.data as Row[]) ?? []).map((m) => ({
      userId: m.user_id,
      nombre: m.nombre,
      createdAt: m.created_at,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CARTERA DE ASESORES (ADMIN) — cómo rinde cada asesor, para poder repartir carga.
// `kpisAsesor` ya existía pero SOLO para uno mismo: el admin no podía comparar
// carteras ni saber si un asesor tiene 40 clientes y otro 2. Todo con la SESIÓN
// (RLS staff) y en una sola ronda; el reparto por moneda usa `monedaDominante`.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rendimiento de todos los asesores del portal, ordenado por CARGA (más clientes
 * primero: es a quien hay que aliviar). Los montos NO mezclan monedas: cada asesor
 * resuelve a su moneda dominante y `multiMoneda` avisa si tiene operaciones fuera
 * de ese total. Un asesor sin clientes aparece igual, en 0 — es información útil
 * (tiene capacidad libre), no un dato faltante.
 */
export async function carteraAsesores(portal: PortalSlug): Promise<CargaAsesor[]> {
  const supabase = await createClient();
  const [miembrosRes, reservasRes, prospectosRes] = await Promise.all([
    supabase
      .from("portal_miembros")
      .select("user_id, nombre, rol, asesor_id")
      .eq("portal", portal)
      .eq("estado", "activo"),
    supabase
      .from("portal_reservas")
      .select("cliente_id, prospecto_id, asesor_id, oportunidad_id, estado")
      .eq("portal", portal)
      .not("asesor_id", "is", null),
    // Prospectos vivos por asesor: parte real de su carga aunque no tengan cuenta.
    supabase
      .from("portal_prospectos")
      .select("id, asesor_id")
      .eq("portal", portal)
      .is("convertido_user_id", null),
  ]);

  const miembros = (miembrosRes.data as Row[]) ?? [];
  const reservas = (reservasRes.data as Row[]) ?? [];
  const prospectosPorAsesor = new Map<string, number>();
  for (const p of (prospectosRes.data as Row[]) ?? []) {
    const a = p.asesor_id as string;
    prospectosPorAsesor.set(a, (prospectosPorAsesor.get(a) ?? 0) + 1);
  }

  // Montos/moneda/financiamiento de las ops involucradas (columnas mínimas).
  const opIds = [...new Set(reservas.map((r) => r.oportunidad_id as string))];
  const opInfo = new Map<string, { moneda: PortalMoneda; monto: number; financiada: boolean }>();
  if (opIds.length) {
    const { data: ops } = await supabase
      .from("portal_oportunidades")
      .select("id, moneda, monto_solicitado, financiada_en")
      .in("id", opIds);
    for (const o of (ops as Row[]) ?? []) {
      opInfo.set(o.id as string, {
        moneda: (o.moneda as PortalMoneda) ?? "PEN",
        monto: o.monto_solicitado != null ? Number(o.monto_solicitado) : 0,
        financiada: o.financiada_en != null,
      });
    }
  }

  const asesores = miembros.filter((m) => m.rol === "asesor" || m.rol === "admin");
  // Clientes por asesor y qué clientes tienen al menos una reserva (cualquier estado).
  const clientesDe = new Map<string, string[]>();
  for (const m of miembros) {
    if (m.rol !== "cliente" || !m.asesor_id) continue;
    const arr = clientesDe.get(m.asesor_id as string) ?? [];
    arr.push(m.user_id as string);
    clientesDe.set(m.asesor_id as string, arr);
  }
  // Solo cuentan las reservas de miembros: las de prospectos no pertenecen a
  // ningún cliente de la lista, y meterlas acá haría que un cliente "sin
  // actividad" pareciera activo por una reserva que no es suya.
  const clientesConActividad = new Set(
    reservas.filter((r) => r.cliente_id).map((r) => r.cliente_id as string),
  );

  const filas: CargaAsesor[] = asesores.map((a) => {
    const id = a.user_id as string;
    const mias = reservas.filter((r) => r.asesor_id === id);
    // Comprometido = reservas activas + confirmadas (mismo criterio que el asesor).
    const montos: FilaMoneda[] = [];
    let financiadas = 0;
    for (const r of mias) {
      const info = opInfo.get(r.oportunidad_id as string);
      if (!info) continue;
      if (esComprometida(r.estado as EstadoReserva)) {
        montos.push({ moneda: info.moneda, comprometido: info.monto });
      }
      if (info.financiada) financiadas += 1;
    }
    const agg = monedaDominante(montos);
    const cartera = clientesDe.get(id) ?? [];
    return {
      asesorId: id,
      nombre: (a.nombre as string) ?? "—",
      clientes: cartera.length,
      prospectos: prospectosPorAsesor.get(id) ?? 0,
      clientesSinActividad: cartera.filter((c) => !clientesConActividad.has(c)).length,
      reservasActivas: mias.filter((r) => r.estado === "activa").length,
      moneda: agg.moneda,
      comprometido: agg.comprometido,
      multiMoneda: agg.multiMoneda,
      financiadas,
    };
  });

  return ordenarPorCarga(filas);
}

// ─────────────────────────────────────────────────────────────────────────────
// FICHA 360 de un cliente de la cartera del asesor. La AUTORIZACIÓN es la clave:
// solo se resuelve si el cliente es SUYO (asesor_id = él); si no, null → la página
// hace notFound(). Todo con la SESIÓN (RLS staff). No expone datos internos del
// inversionista más allá de su cartera (nunca scoring ni notas de operaciones).
// ─────────────────────────────────────────────────────────────────────────────

/** Una reserva del cliente en su ficha (con monto y ganancia estimados). */
export interface FichaReserva {
  reservaId: string;
  oportunidadId: string;
  titulo: string;
  estado: EstadoReserva;
  moneda: PortalMoneda;
  /** Monto solicitado de la op (proxy de lo comprometido en esta reserva). */
  monto: number | null;
  /** Ganancia estimada al plazo (interés simple), 0 si faltan datos. */
  gananciaEstimada: number;
  reservadoEn: string;
  venceEn: string;
  /** Cuándo la op quedó financiada (deriva el paso del timeline), o null. */
  financiadaEn: string | null;
}

/**
 * Fila de `portal_miembros` de un cliente, SOLO si pertenece a la cartera del
 * asesor. ÚNICO lugar donde se decide "este cliente es suyo": la ficha 360 y las
 * notas pasan las dos por acá, así la regla de cartera no se escribe dos veces (y
 * no se puede relajar en un camino y no en el otro). null ⇒ el caller responde
 * 404/403. Con la SESIÓN (RLS staff), nunca service_role.
 */
async function clienteDeMiCartera(
  portal: PortalSlug,
  asesorId: string,
  clienteId: string,
  cols: string = "user_id",
): Promise<Row | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("portal_miembros")
    .select(cols)
    .eq("portal", portal)
    .eq("user_id", clienteId)
    .eq("rol", "cliente")
    .eq("asesor_id", asesorId) // ← la barrera: solo un cliente de SU cartera
    .maybeSingle();
  return (data as Row | null) ?? null;
}

/**
 * ¿Este cliente es de la cartera del asesor? Anti-IDOR de las rutas de notas: el
 * `cliente_id` llega en el body y NO es autorización — sin este chequeo, un UUID
 * válido de un cliente de otro asesor dejaría escribir (y leer) su libreta.
 */
export async function esClienteDeAsesor(
  portal: PortalSlug,
  asesorId: string,
  clienteId: string,
): Promise<boolean> {
  return (await clienteDeMiCartera(portal, asesorId, clienteId)) != null;
}

/**
 * La OTRA mitad de la misma regla: fila de `portal_prospectos` SOLO si el
 * prospecto es de la cartera del asesor. Vive pegada a `clienteDeMiCartera` a
 * propósito — son los dos tipos de titular y la regla de cartera tiene que
 * leerse de un solo vistazo; si una se relajara, la otra lo delataría.
 *
 * Un prospecto YA CONVERTIDO se sigue pudiendo leer (su ficha es historia), pero
 * ya no se puede bloquear a su nombre: eso lo corta `portal_reservar_para` en SQL.
 * Con la SESIÓN (RLS: staff + su cartera, o admin), nunca service_role.
 */
async function prospectoDeMiCartera(
  portal: PortalSlug,
  asesorId: string,
  prospectoId: string,
  cols: string = "id",
): Promise<Row | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("portal_prospectos")
    .select(cols)
    .eq("portal", portal)
    .eq("id", prospectoId)
    .eq("asesor_id", asesorId) // ← la barrera: solo un prospecto de SU cartera
    .maybeSingle();
  return (data as Row | null) ?? null;
}

/**
 * ¿Este prospecto es de la cartera del asesor? Anti-IDOR de las rutas que reciben
 * un `prospecto_id` del navegador (notas, bloqueo a su nombre): el uuid NO
 * autoriza. Espejo exacto de `esClienteDeAsesor`.
 */
export async function esProspectoDeAsesor(
  portal: PortalSlug,
  asesorId: string,
  prospectoId: string,
): Promise<boolean> {
  return (await prospectoDeMiCartera(portal, asesorId, prospectoId)) != null;
}

export interface ClienteFicha {
  cliente: {
    userId: string;
    nombre: string;
    /** Teléfono tal cual (para mostrar), o null. */
    telefono: string | null;
    /** Teléfono normalizado a E.164 sin '+' (para wa.me/llamar), o null. */
    telefonoWa: string | null;
    createdAt: string;
  };
  /** Moneda DOMINANTE (la de mayor comprometido). Los totales van solo en esta
   *  moneda: nunca se suman PEN con USD. */
  moneda: PortalMoneda;
  /** Σ monto de reservas activas + confirmadas, SOLO en `moneda`. */
  totalComprometido: number;
  /** Σ ganancia estimada al plazo de las reservas comprometidas, SOLO en `moneda`. */
  gananciaEsperada: number;
  /** true si hay reservas en otra moneda fuera del total (la UI lo debe notar). */
  multiMoneda: boolean;
  numReservas: number;
  reservas: FichaReserva[];
  /** Libreta interna del staff sobre este cliente (0086). Nunca la ve el inversionista. */
  notas: NotaCliente[];
}

/**
 * Ficha 360 de un cliente, SOLO si pertenece a la cartera del asesor. Verifica
 * `asesor_id = asesorId` (defensa contra IDOR: un UUID válido de otro cliente NO
 * abre nada) y devuelve null en caso contrario → la página responde 404. Con la
 * sesión (RLS staff): lee su membresía, sus reservas (todos los estados) y las ops
 * ligadas (columnas públicas, nunca notas_internas). Ganancia/comprometido se
 * calculan server-side con los helpers autoritativos.
 */
/**
 * Reservas de un titular + sus agregados, para la ficha 360. Compartido por las
 * DOS fichas (miembro con cuenta y prospecto sin cuenta): la ficha es la misma
 * cosa y lo único que cambia es por qué columna se filtra. Si cada una lo
 * calculara por su lado, el día que cambie la fórmula de la ganancia una de las
 * dos quedaría mintiendo.
 *
 * Con la SESIÓN (RLS staff) y columnas EXPLÍCITAS públicas de la operación: nunca
 * `notas_internas`. La AUTORIZACIÓN (que el titular sea de su cartera) ya la hizo
 * el caller — acá no se decide acceso.
 */
async function reservasDeTitular(
  portal: PortalSlug,
  columna: "cliente_id" | "prospecto_id",
  valor: string,
): Promise<{ reservas: FichaReserva[]; agg: AgregadoMoneda }> {
  const supabase = await createClient();
  const { data: reservasData } = await supabase
    .from("portal_reservas")
    .select("id, oportunidad_id, estado, reservado_en, vence_en")
    .eq("portal", portal)
    .eq(columna, valor)
    .order("reservado_en", { ascending: false });
  const reservaRows = (reservasData as Row[]) ?? [];

  const opIds = [...new Set(reservaRows.map((r) => r.oportunidad_id))];
  const ops = new Map<string, Row>();
  if (opIds.length) {
    const { data } = await supabase
      .from("portal_oportunidades")
      // Columnas EXPLÍCITAS públicas: nunca notas_internas.
      .select(
        "id, titulo, moneda, monto_solicitado, tasa_mensual, plazo_meses_min, plazo_meses_max, financiada_en",
      )
      .in("id", opIds);
    for (const o of (data as Row[]) ?? []) ops.set(o.id, o);
  }

  const reservas: FichaReserva[] = [];
  const filasComprometidas: FilaMoneda[] = [];
  for (const r of reservaRows) {
    const op = ops.get(r.oportunidad_id);
    const monto = op?.monto_solicitado != null ? Number(op.monto_solicitado) : null;
    const tasa = op?.tasa_mensual != null ? Number(op.tasa_mensual) : null;
    const plazo = (op?.plazo_meses_min ?? op?.plazo_meses_max) as number | null;
    const opMoneda = (op?.moneda as PortalMoneda) ?? "PEN";
    const g =
      monto != null && tasa != null && plazo != null
        ? gananciaAlPlazo(monto, tasa, plazo).gananciaMonto
        : 0;
    const estado = r.estado as EstadoReserva;
    // No mezclar monedas: cada reserva comprometida entra a su bucket de moneda.
    if (esComprometida(estado)) {
      filasComprometidas.push({ moneda: opMoneda, comprometido: monto ?? 0, extra: g });
    }
    reservas.push({
      reservaId: r.id,
      oportunidadId: r.oportunidad_id,
      titulo: (op?.titulo as string) ?? "—",
      estado,
      moneda: opMoneda,
      monto,
      gananciaEstimada: g,
      reservadoEn: r.reservado_en,
      venceEn: r.vence_en,
      financiadaEn: (op?.financiada_en as string | null) ?? null,
    });
  }

  return { reservas, agg: monedaDominante(filasComprometidas) };
}

export async function getClienteDeAsesor(
  portal: PortalSlug,
  asesorId: string,
  clienteId: string,
): Promise<ClienteFicha | null> {
  const m = await clienteDeMiCartera(
    portal,
    asesorId,
    clienteId,
    "user_id, nombre, telefono, created_at",
  );
  if (!m) return null;

  const supabase = await createClient();
  // Reservas y libreta no dependen entre sí (§6): una sola ronda.
  // Tras convertir un prospecto, sus reservas y notas llevan TAMBIÉN este
  // `cliente_id` (0090): el historial que armó el asesor antes de la cuenta
  // aparece acá sin duplicarse ni copiarse.
  const [{ reservas, agg }, notasRes] = await Promise.all([
    reservasDeTitular(portal, "cliente_id", clienteId),
    supabase
      .from("portal_notas")
      .select(NOTA_COLS)
      .eq("portal", portal)
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: false }),
  ]);
  const notas = ((notasRes.data as Row[]) ?? []).map((n) => mapNota(n, asesorId));

  return {
    cliente: {
      userId: m.user_id as string,
      nombre: m.nombre as string,
      telefono: (m.telefono as string | null) ?? null,
      telefonoWa: telefonoWa((m.telefono as string | null) ?? null),
      createdAt: m.created_at as string,
    },
    moneda: agg.moneda,
    totalComprometido: agg.comprometido,
    gananciaEsperada: agg.extra,
    multiMoneda: agg.multiMoneda,
    numReservas: reservas.length,
    reservas,
    notas,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PROSPECTOS (0090) — el inversionista que TODAVÍA no tiene cuenta.
//
// Existe porque el negocio es presencial: el asesor cierra por teléfono y bloquea
// la operación a nombre de alguien que recién tendrá cuenta cuando ya haya
// operado (ENCUADRE_LEGAL.md §2). No es un miembro del portal: no entra, no ve
// nada, no tiene rol. Es un registro INTERNO del staff.
//
// SEGURIDAD, mismo orden que las notas:
//   1) RLS: staff del portal Y de su cartera (o admin). El inversionista jamás.
//   2) CARTERA: todo lo que recibe un `prospectoId` del navegador pasa por
//      `prospectoDeMiCartera` — el uuid no autoriza (anti-IDOR).
// Nada de acá usa service_role.
// ─────────────────────────────────────────────────────────────────────────────

/** Columnas de un prospecto. Explícitas: nunca `select('*')`. */
const PROSPECTO_COLS =
  "id, nombre, telefono, tipo_documento, documento, asesor_id, convertido_user_id, created_at";

/** Un prospecto tal como lo ve el staff. */
export type ProspectoRow = {
  id: string;
  nombre: string;
  telefono: string;
  /** Teléfono normalizado a E.164 sin '+' (para wa.me/llamar). */
  telefonoWa: string | null;
  tipoDocumento: string | null;
  documento: string | null;
  asesorId: string;
  /** true si ya se le creó cuenta: desde entonces se opera por su membresía. */
  convertido: boolean;
  /** Cuenta a la que quedó ligado, o null. */
  convertidoUserId: string | null;
  createdAt: string;
};

function mapProspecto(r: Row): ProspectoRow {
  const tel = (r.telefono as string) ?? "";
  return {
    id: r.id as string,
    nombre: r.nombre as string,
    telefono: tel,
    telefonoWa: telefonoWa(tel),
    tipoDocumento: (r.tipo_documento as string | null) ?? null,
    documento: (r.documento as string | null) ?? null,
    asesorId: r.asesor_id as string,
    convertido: r.convertido_user_id != null,
    convertidoUserId: (r.convertido_user_id as string | null) ?? null,
    createdAt: r.created_at as string,
  };
}

/** Datos con los que el asesor registra a alguien que todavía no tiene cuenta. */
export interface ProspectoInput {
  nombre: string;
  telefono: string;
  tipo_documento?: string | null;
  documento?: string | null;
}

/** Motivo por el que no se pudo registrar (la UI lo traduce; el caller da el status). */
export type ErrorProspecto = "documento_duplicado" | "error";

/**
 * Registra un prospecto en la cartera del asesor. `asesor_id` sale del GUARD, no
 * del navegador: quien lo crea es su dueño (y la policy de insert lo ancla con
 * `asesor_id = auth.uid()`). Con la SESIÓN, nunca service_role.
 *
 * El documento es opcional pero ÚNICO por portal: dos asesores registrando al
 * mismo humano serían dos historiales del mismo DNI y al convertir no habría forma
 * de saber cuál es el bueno. El 23505 de Postgres se traduce a un motivo, no a un
 * 500 opaco.
 */
export async function crearProspecto(
  portal: PortalSlug,
  asesorId: string,
  b: ProspectoInput,
): Promise<{ prospecto: ProspectoRow } | { error: ErrorProspecto }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portal_prospectos")
    .insert({
      portal,
      nombre: b.nombre.trim(),
      telefono: b.telefono.trim(),
      tipo_documento: limpio(b.tipo_documento),
      documento: limpio(b.documento?.trim()),
      asesor_id: asesorId,
      creado_por: asesorId,
    })
    .select(PROSPECTO_COLS)
    .single();
  if (error || !data) {
    return { error: error?.code === "23505" ? "documento_duplicado" : "error" };
  }
  return { prospecto: mapProspecto(data as Row) };
}

/** Prospecto de la cartera + resumen de su actividad (espejo de ClienteEnriquecido). */
export interface ProspectoEnriquecido extends ProspectoRow {
  numReservas: number;
  /** Σ monto de sus reservas activas + confirmadas, SOLO en `moneda`. */
  montoComprometido: number;
  moneda: PortalMoneda;
  multiMoneda: boolean;
  ultimaActividad: string | null;
}

/**
 * Prospectos de la cartera del asesor, enriquecidos igual que sus clientes y
 * ordenados por actividad más reciente. Los CONVERTIDOS se omiten por defecto: ya
 * son clientes y aparecen en la otra lista — mostrarlos en las dos sería la misma
 * persona contada dos veces.
 */
export async function listarProspectosDeAsesor(
  portal: PortalSlug,
  asesorId: string,
  opts: { incluirConvertidos?: boolean } = {},
): Promise<ProspectoEnriquecido[]> {
  const supabase = await createClient();
  let q = supabase
    .from("portal_prospectos")
    .select(PROSPECTO_COLS)
    .eq("portal", portal)
    .eq("asesor_id", asesorId)
    .order("created_at", { ascending: false });
  if (!opts.incluirConvertidos) q = q.is("convertido_user_id", null);

  const [{ data: prospData }, { data: reservasData }] = await Promise.all([
    q,
    supabase
      .from("portal_reservas")
      .select("prospecto_id, oportunidad_id, estado, reservado_en")
      .eq("portal", portal)
      .eq("asesor_id", asesorId)
      .not("prospecto_id", "is", null),
  ]);
  const prospectos = ((prospData as Row[]) ?? []).map(mapProspecto);
  if (prospectos.length === 0) return [];
  const reservas = (reservasData as Row[]) ?? [];

  // Montos de las ops de sus reservas COMPROMETIDAS (columnas mínimas, §6).
  const opIds = [
    ...new Set(reservas.filter((r) => esComprometida(r.estado)).map((r) => r.oportunidad_id)),
  ];
  const opMonto = new Map<string, number>();
  const opMoneda = new Map<string, PortalMoneda>();
  if (opIds.length) {
    const { data: ops } = await supabase
      .from("portal_oportunidades")
      .select("id, monto_solicitado, moneda")
      .in("id", opIds);
    for (const o of (ops as Row[]) ?? []) {
      opMonto.set(o.id, o.monto_solicitado != null ? Number(o.monto_solicitado) : 0);
      if (o.moneda) opMoneda.set(o.id, o.moneda as PortalMoneda);
    }
  }

  const numReservas = new Map<string, number>();
  const filasPorProspecto = new Map<string, FilaMoneda[]>();
  const ultima = new Map<string, string>();
  for (const r of reservas) {
    const pid = r.prospecto_id as string;
    numReservas.set(pid, (numReservas.get(pid) ?? 0) + 1);
    if (esComprometida(r.estado)) {
      const filas = filasPorProspecto.get(pid) ?? [];
      filas.push({
        moneda: opMoneda.get(r.oportunidad_id) ?? "PEN",
        comprometido: opMonto.get(r.oportunidad_id) ?? 0,
      });
      filasPorProspecto.set(pid, filas);
    }
    const prev = ultima.get(pid);
    if (!prev || (r.reservado_en as string) > prev) ultima.set(pid, r.reservado_en as string);
  }

  return prospectos
    .map((p) => {
      const agg = monedaDominante(filasPorProspecto.get(p.id) ?? []);
      return {
        ...p,
        numReservas: numReservas.get(p.id) ?? 0,
        montoComprometido: agg.comprometido,
        moneda: agg.moneda,
        multiMoneda: agg.multiMoneda,
        ultimaActividad: ultima.get(p.id) ?? null,
      };
    })
    .sort((a, b) => {
      if (a.ultimaActividad && b.ultimaActividad) {
        return b.ultimaActividad.localeCompare(a.ultimaActividad);
      }
      if (a.ultimaActividad) return -1;
      if (b.ultimaActividad) return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
}

/** Ficha 360 de un prospecto: misma información que la de un cliente, sin cuenta. */
export interface ProspectoFicha {
  prospecto: ProspectoRow;
  moneda: PortalMoneda;
  totalComprometido: number;
  gananciaEsperada: number;
  multiMoneda: boolean;
  numReservas: number;
  reservas: FichaReserva[];
  notas: NotaCliente[];
}

/**
 * Ficha 360 de un prospecto de SU cartera. null si no es suyo → la página hace
 * notFound() (anti-IDOR: un uuid válido de otro asesor NO abre nada). Reusa
 * `reservasDeTitular`, así la ficha del prospecto y la del cliente no pueden
 * divergir en cómo calculan comprometido y ganancia.
 */
export async function getProspectoDeAsesor(
  portal: PortalSlug,
  asesorId: string,
  prospectoId: string,
): Promise<ProspectoFicha | null> {
  const p = await prospectoDeMiCartera(portal, asesorId, prospectoId, PROSPECTO_COLS);
  if (!p) return null;

  const supabase = await createClient();
  const [{ reservas, agg }, notasRes] = await Promise.all([
    reservasDeTitular(portal, "prospecto_id", prospectoId),
    supabase
      .from("portal_notas")
      .select(NOTA_COLS)
      .eq("portal", portal)
      .eq("prospecto_id", prospectoId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    prospecto: mapProspecto(p),
    moneda: agg.moneda,
    totalComprometido: agg.comprometido,
    gananciaEsperada: agg.extra,
    multiMoneda: agg.multiMoneda,
    numReservas: reservas.length,
    reservas,
    notas: ((notasRes.data as Row[]) ?? []).map((n) => mapNota(n, asesorId)),
  };
}

/**
 * Prospectos del portal todavía SIN cuenta, para el alta de usuarios del ADMIN:
 * es el único lugar donde la conversión puede ocurrir (la cuenta la crea él). Trae
 * lo mínimo para reconocer a la persona y precargar el formulario. La RLS ya acota
 * —un asesor solo vería los suyos—, pero esta lista se usa desde una página que
 * exige admin, así que ve los de todo el portal.
 */
export async function prospectosSinCuenta(portal: PortalSlug): Promise<ProspectoRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("portal_prospectos")
    .select(PROSPECTO_COLS)
    .eq("portal", portal)
    .is("convertido_user_id", null)
    .order("created_at", { ascending: false });
  return ((data as Row[]) ?? []).map(mapProspecto);
}

/** Una opción del selector "¿a nombre de quién?" al bloquear una operación. */
export interface OpcionTitular {
  tipo: "cliente" | "prospecto";
  id: string;
  nombre: string;
  telefono: string | null;
  /** true si ya tiene cuenta en el portal (para explicarlo en el selector). */
  conCuenta: boolean;
}

/**
 * A nombre de quién puede bloquear este asesor: sus clientes con cuenta + sus
 * prospectos sin convertir. Es SOLO la lista del selector — no autoriza nada: el
 * bloqueo lo vuelve a verificar `portal_reservar_para` en SQL contra la cartera.
 * Una sola ronda para las dos consultas (§6).
 */
export async function titularesDeAsesor(
  portal: PortalSlug,
  asesorId: string,
): Promise<OpcionTitular[]> {
  const supabase = await createClient();
  const [clientesRes, prospectosRes] = await Promise.all([
    supabase
      .from("portal_miembros")
      .select("user_id, nombre, telefono")
      .eq("portal", portal)
      .eq("rol", "cliente")
      .eq("asesor_id", asesorId)
      .eq("estado", "activo")
      .order("nombre", { ascending: true }),
    supabase
      .from("portal_prospectos")
      .select("id, nombre, telefono")
      .eq("portal", portal)
      .eq("asesor_id", asesorId)
      .is("convertido_user_id", null)
      .order("nombre", { ascending: true }),
  ]);

  const clientes: OpcionTitular[] = ((clientesRes.data as Row[]) ?? []).map((m) => ({
    tipo: "cliente" as const,
    id: m.user_id as string,
    nombre: m.nombre as string,
    telefono: (m.telefono as string | null) ?? null,
    conCuenta: true,
  }));
  const prospectos: OpcionTitular[] = ((prospectosRes.data as Row[]) ?? []).map((p) => ({
    tipo: "prospecto" as const,
    id: p.id as string,
    nombre: p.nombre as string,
    telefono: (p.telefono as string | null) ?? null,
    conCuenta: false,
  }));
  return [...clientes, ...prospectos];
}

/**
 * Nombres de los titulares de un conjunto de reservas, resueltos en los DOS
 * mapas (miembros y prospectos) en una sola ronda. Lo usan la cola del staff y
 * los paneles de alertas: sin esto, una reserva bloqueada por el asesor aparecería
 * sin nombre — o peor, con el nombre de otro.
 */
async function nombresDeTitulares(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  portal: PortalSlug,
  refs: readonly (RefTitular | null)[],
): Promise<{ clientes: Map<string, string>; prospectos: Map<string, string> }> {
  const cliIds = [...new Set(refs.filter((r) => r?.tipo === "cliente").map((r) => r!.id))];
  const proIds = [...new Set(refs.filter((r) => r?.tipo === "prospecto").map((r) => r!.id))];
  const [cliRes, proRes] = await Promise.all([
    cliIds.length
      ? supabase
          .from("portal_miembros")
          .select("user_id, nombre")
          .eq("portal", portal)
          .in("user_id", cliIds)
      : Promise.resolve({ data: [] as Row[] }),
    proIds.length
      ? supabase
          .from("portal_prospectos")
          .select("id, nombre")
          .eq("portal", portal)
          .in("id", proIds)
      : Promise.resolve({ data: [] as Row[] }),
  ]);
  const clientes = new Map<string, string>();
  for (const m of (cliRes.data as Row[]) ?? []) clientes.set(m.user_id, m.nombre);
  const prospectos = new Map<string, string>();
  for (const p of (proRes.data as Row[]) ?? []) prospectos.set(p.id, p.nombre);
  return { clientes, prospectos };
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTAS del asesor (0086) — la libreta INTERNA sobre un cliente de su cartera.
//
// SEGURIDAD, en dos capas y en este orden:
//   1) RLS staff-only (`portal_es_staff`): el inversionista NUNCA lee estas filas
//      por ningún camino. Nada acá usa service_role.
//   2) CARTERA: leer/escribir sobre un sujeto exige `clienteDeMiCartera` o
//      `prospectoDeMiCartera` — el id que llega del navegador no autoriza nada
//      (anti-IDOR). Cerrar, reabrir o borrar una nota exige además ser SU autor
//      (`autor_id = él`), que es lo mismo que enforza la policy de UPDATE/DELETE.
//
// Desde 0090 el sujeto de una nota puede ser un cliente con cuenta o un prospecto:
// el asesor necesita anotar el seguimiento ANTES de que exista la cuenta, que es
// justo cuando más se conversa.
// ─────────────────────────────────────────────────────────────────────────────

/** Columnas de una nota. Explícitas: nunca `select('*')`. */
const NOTA_COLS = "id, texto, recordar_en, hecha, autor_id, created_at";

/** Una nota de la libreta, tal como la ve el asesor en la ficha del cliente. */
export interface NotaCliente {
  id: string;
  texto: string;
  /** Próxima acción (ISO) o null si es una nota suelta. */
  recordarEn: string | null;
  hecha: boolean;
  createdAt: string;
  /** true si la escribió quien está mirando: solo él la cierra o la borra. */
  mia: boolean;
}

/** Fila → NotaCliente. `mia` se deriva del autor contra quien está mirando. */
function mapNota(r: Row, userId: string): NotaCliente {
  return {
    id: r.id as string,
    texto: r.texto as string,
    recordarEn: (r.recordar_en as string | null) ?? null,
    hecha: Boolean(r.hecha),
    createdAt: r.created_at as string,
    mia: (r.autor_id as string | null) === userId,
  };
}

/**
 * Crea una nota sobre un sujeto de la cartera del asesor —cliente con cuenta o
 * prospecto—. Verifica la PERTENENCIA antes de escribir (el id del body no
 * autoriza) y fija `autor_id` desde el guard, nunca desde el navegador. Devuelve
 * la nota creada, o null si el sujeto no es suyo / la RLS rechazó: el caller
 * responde 403 uniforme, sin filtrar si el sujeto existe.
 */
export async function crearNota(
  portal: PortalSlug,
  asesorId: string,
  sujeto: RefTitular,
  texto: string,
  recordarEn: string | null,
): Promise<NotaCliente | null> {
  const esSuyo =
    sujeto.tipo === "cliente"
      ? await esClienteDeAsesor(portal, asesorId, sujeto.id)
      : await esProspectoDeAsesor(portal, asesorId, sujeto.id);
  if (!esSuyo) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("portal_notas")
    .insert({
      portal,
      cliente_id: sujeto.tipo === "cliente" ? sujeto.id : null,
      prospecto_id: sujeto.tipo === "prospecto" ? sujeto.id : null,
      autor_id: asesorId,
      texto: texto.trim(),
      recordar_en: recordarEn,
    })
    .select(NOTA_COLS)
    .single();
  if (!data) return null;
  return mapNota(data as Row, asesorId);
}

/**
 * Cierra o reabre la próxima acción de una nota PROPIA. El UPDATE lleva el dueño
 * dentro de la cláusula (`autor_id = él`) y se verifica la fila devuelta: no hay
 * check-then-act ni forma de tocar la nota de otro asesor. false ⇒ no aplicaba.
 */
export async function marcarNotaHecha(
  portal: PortalSlug,
  asesorId: string,
  notaId: string,
  hecha: boolean,
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("portal_notas")
    .update({ hecha })
    .eq("portal", portal)
    .eq("id", notaId)
    .eq("autor_id", asesorId)
    .select("id");
  return !!data && data.length > 0;
}

/** Borra una nota PROPIA (misma acotación por autor que marcarNotaHecha). */
export async function borrarNotaCliente(
  portal: PortalSlug,
  asesorId: string,
  notaId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("portal_notas")
    .delete()
    .eq("portal", portal)
    .eq("id", notaId)
    .eq("autor_id", asesorId)
    .select("id");
  return !!data && data.length > 0;
}

/**
 * Conteo ligero de oportunidades disponibles, para el dashboard del cliente. El
 * cliente no lee `portal_oportunidades` por RLS → admin client con autorización
 * reimplementada (exige membresía activa). head:true = solo el count, sin filas.
 */
export async function contarDisponiblesCliente(portal: PortalSlug): Promise<number> {
  const miembro = await getPortalMiembro(portal);
  if (!miembro) return 0;
  const admin = createAdminClient();
  const { count } = await admin
    .from("portal_oportunidades")
    .select("id", { count: "exact", head: true })
    .eq("portal", portal)
    .eq("estado_publicacion", "disponible");
  return count ?? 0;
}

export interface MiAsesor {
  nombre: string;
  /** Teléfono normalizado a E.164 sin '+' (listo para wa.me), o null. */
  telefono: string | null;
}

/**
 * Datos MÍNIMOS del asesor asignado al cliente, para escribirle por WhatsApp.
 * El cliente NO puede leer la fila del asesor por RLS (staff-only), así que se
 * resuelve con admin client pidiendo SOLO nombre+telefono (nunca scoring ni nada
 * más) y REIMPLEMENTANDO la autorización: se parte del asesor_id de la PROPIA
 * membresía del cliente (que sí lee) y se exige que el asesor sea staff activo del
 * portal. null si el cliente no tiene asesor o el asesor no aplica → el caller cae
 * al contacto general de Don Gato.
 */
export async function getMiAsesor(portal: PortalSlug): Promise<MiAsesor | null> {
  const miembro = await getPortalMiembro(portal);
  if (!miembro?.asesorId) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("portal_miembros")
    .select("nombre, telefono, rol, estado")
    .eq("portal", portal)
    .eq("user_id", miembro.asesorId)
    .maybeSingle();
  if (!data || data.estado !== "activo" || !["asesor", "admin"].includes(data.rol as string))
    return null;
  return {
    nombre: data.nombre as string,
    telefono: telefonoWa((data.telefono as string | null) ?? null),
  };
}
