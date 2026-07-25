/**
 * LECTURA de la bitácora de un portal desde el BROWSER (`portal_eventos_auditoria`,
 * 0089). El espejo de escritura es `lib/portales/auditoria.ts` (server, service_role).
 *
 * AUTORIZACIÓN: la da la RLS con la sesión del usuario — la policy de esa tabla es
 * `portal_es_admin(portal)`, así que un asesor o un inversionista simplemente no
 * recibe filas. Acá NUNCA se usa service_role: puentearía la única barrera real, y
 * la bitácora tiene IP y user-agent de personas. El `.eq("portal", …)` explícito no
 * sobra: alguien que fuera admin de los DOS portales vería ambas historias mezcladas,
 * y las cadenas de hash son independientes por portal.
 *
 * La tabla no tiene policy de insert/update/delete: es append-only desde el server.
 * Ni siquiera un administrador puede fabricar o borrar un evento.
 */

import { createClient } from "@/lib/supabase/client";
import { revisarCadena, type EslabonAuditoria, type RevisionCadena } from "@/lib/portales/admin";
import type { PortalSlug } from "@/lib/portales/config";

/** Un evento tal como lo pinta la pantalla. */
export interface EventoPortal {
  id: string;
  createdAt: string;
  actorId: string | null;
  actorRol: string | null;
  /** Nombre del actor: el SELLADO en el evento (0091) si está, si no el resuelto
   *  desde `portal_miembros`. null solo si no hay ninguno de los dos. */
  actorNombre: string | null;
  accion: string;
  entidad: string;
  entidadId: string | null;
  datos: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  seq: number | null;
  hash: string | null;
  prevHash: string | null;
}

export interface FiltrosAuditoriaPortal {
  /** Acción exacta (ej. "reserva_creada"). */
  accion?: string | null;
  /** Recurso exacto (ej. "portal_reservas"). */
  entidad?: string | null;
  /** ISO, inclusive. */
  desde?: string | null;
  limit?: number;
  offset?: number;
}

export interface PaginaAuditoriaPortal {
  eventos: EventoPortal[];
  /** Total de filas que matchean el filtro (para paginar de verdad). */
  total: number;
}

const COLS =
  "id, seq, created_at, actor_id, actor_rol, actor_nombre, accion, entidad, entidad_id, datos, ip, user_agent, hash, prev_hash";

/**
 * Cuántos enlaces revisa como máximo la comprobación de integridad. La bitácora
 * crece sin techo: traerla entera algún día sería descargar todo el historial en el
 * navegador. Con el tope se revisan los más recientes y se DICE cuántos (mejor un
 * alcance declarado que un "✓" que no se sabe sobre qué corrió).
 */
export const MAX_ENLACES_REVISADOS = 2000;

function toEvento(r: Record<string, unknown>, nombres: Map<string, string>): EventoPortal {
  const actorId = (r.actor_id as string | null) ?? null;
  return {
    id: r.id as string,
    createdAt: r.created_at as string,
    actorId,
    actorRol: (r.actor_rol as string | null) ?? null,
    // Prioridad al nombre SELLADO en el evento (0091): sobrevive al borrado de la
    // cuenta y está dentro del hash. Resolver contra `portal_miembros` es el
    // respaldo para los eventos anteriores a esa migración.
    actorNombre:
      ((r.actor_nombre as string | null) ?? null) ||
      (actorId ? (nombres.get(actorId) ?? null) : null),
    accion: r.accion as string,
    entidad: r.entidad as string,
    entidadId: (r.entidad_id as string | null) ?? null,
    datos: (r.datos as Record<string, unknown> | null) ?? null,
    ip: (r.ip as string | null) ?? null,
    userAgent: (r.user_agent as string | null) ?? null,
    seq: r.seq != null ? Number(r.seq) : null,
    hash: (r.hash as string | null) ?? null,
    prevHash: (r.prev_hash as string | null) ?? null,
  };
}

/**
 * Página de la bitácora, del evento más reciente al más antiguo. Ordena por `seq`
 * (el orden real de la cadena) y no por fecha: dos eventos del mismo instante
 * quedarían en orden arbitrario y la lista bailaría entre páginas.
 */
export async function listAuditoriaPortal(
  portal: PortalSlug,
  f: FiltrosAuditoriaPortal = {},
): Promise<PaginaAuditoriaPortal> {
  const supabase = createClient();
  const limit = f.limit ?? 50;
  const offset = f.offset ?? 0;

  let q = supabase
    .from("portal_eventos_auditoria")
    .select(COLS, { count: "exact" })
    .eq("portal", portal)
    .order("seq", { ascending: false });

  if (f.accion) q = q.eq("accion", f.accion);
  if (f.entidad) q = q.eq("entidad", f.entidad);
  if (f.desde) q = q.gte("created_at", f.desde);

  const { data, count } = await q.range(offset, offset + limit - 1);
  const filas = (data ?? []) as unknown as Record<string, unknown>[];

  const nombres = await nombresDeMiembros(
    portal,
    filas.map((r) => r.actor_id as string | null),
  );

  return {
    total: count ?? filas.length,
    eventos: filas.map((r) => toEvento(r, nombres)),
  };
}

/**
 * Nombres de los actores (user_id → nombre) desde `portal_miembros`. El staff del
 * portal puede leer sus miembros por RLS. Un id que no aparece es una cuenta que ya
 * no existe: el evento se conserva igual (`on delete set null` en la FK), y la
 * pantalla lo dice en vez de mostrar un identificador crudo.
 */
async function nombresDeMiembros(
  portal: PortalSlug,
  ids: readonly (string | null)[],
): Promise<Map<string, string>> {
  const unicos = [...new Set(ids.filter((v): v is string => !!v))];
  if (unicos.length === 0) return new Map();
  const { data } = await createClient()
    .from("portal_miembros")
    .select("user_id, nombre")
    .eq("portal", portal)
    .in("user_id", unicos);
  return new Map(
    ((data ?? []) as { user_id: string; nombre: string }[]).map((m) => [m.user_id, m.nombre]),
  );
}

export interface IntegridadPortal extends RevisionCadena {
  /** Total de registros de la bitácora del portal. */
  total: number;
  /** La revisión llegó al primer registro del portal (se revisó la cadena entera). */
  completa: boolean;
  /** No se pudo consultar (sin permiso, red caída, tabla ausente). */
  noVerificable: boolean;
}

/**
 * Revisa que la cadena de la bitácora del portal enlace. Trae SOLO las tres columnas
 * del sello (no el contenido de los eventos) de los registros más recientes, hasta el
 * tope, y compara cada eslabón con el anterior. Lo que esto prueba y lo que no está
 * explicado en `revisarCadena` — y se le dice al administrador en pantalla.
 */
export async function verificarCadenaPortal(portal: PortalSlug): Promise<IntegridadPortal> {
  const { data, count, error } = await createClient()
    .from("portal_eventos_auditoria")
    .select("seq, hash, prev_hash", { count: "exact" })
    .eq("portal", portal)
    .order("seq", { ascending: false })
    .limit(MAX_ENLACES_REVISADOS);

  if (error) {
    return { revisados: 0, rotos: [], ok: false, total: 0, completa: false, noVerificable: true };
  }

  const filas = (data ?? []) as unknown as { seq: number | null; hash: string | null; prev_hash: string | null }[];
  const total = count ?? filas.length;
  // La consulta vuelve de la más nueva a la más vieja; la cadena se lee al revés.
  const eslabones: EslabonAuditoria[] = filas
    .map((r) => ({ seq: r.seq != null ? Number(r.seq) : null, hash: r.hash, prevHash: r.prev_hash }))
    .reverse();
  const completa = filas.length >= total;

  return {
    ...revisarCadena(eslabones, completa),
    total,
    completa,
    noVerificable: false,
  };
}
