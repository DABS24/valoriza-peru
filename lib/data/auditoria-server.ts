import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Rol } from "@/lib/auth/roles";

/**
 * Registro de auditoría — ÚNICO punto de escritura de `eventos_auditoria` (SSOT).
 *
 * Antes cada endpoint hacía su propio `.insert({...})` a mano: fácil de olvidar un
 * campo y sin IP/user-agent. Este helper centraliza la escritura y, si le pasás el
 * `req`, captura DE DÓNDE (IP) y CON QUÉ (user-agent) vino la acción — datos que un
 * audit trail bancario exige. El hash-chain (0045/0049) los encadena → inmutables.
 *
 * Corre con service_role (bypassa RLS); usar SOLO en rutas server ya autorizadas.
 * El actor debe venir del guard (getUser/requireAdminApi), NUNCA del body.
 *
 * DIFF antes/después: para acciones de EDICIÓN, pasar en `datos` la convención
 * `{ antes: {...}, despues: {...} }` con los valores viejo/nuevo (no solo el nombre
 * del campo). El drawer de la vista los muestra lado a lado.
 */
export interface RegistrarEventoInput {
  /** Verbo en snake_case, ej. "rol_cambiado", "usuario_baja". */
  accion: string;
  /** Tabla/dominio afectado, ej. "perfiles", "blacklist". */
  entidad: string;
  /** Id de la fila afectada (si aplica). */
  entidadId?: string | null;
  /** Quién actuó (del guard). null = acción de sistema. */
  actorId: string | null;
  /** Rol con el que actuó. */
  actorRol?: Rol | null;
  /** Payload por acción. Para ediciones: { antes, despues }. */
  datos?: Record<string, unknown>;
  /** Request del handler — de acá salen IP y user-agent. */
  req?: Request;
}

/**
 * IP del cliente detrás del proxy. En PRODUCCIÓN Netlify inyecta la IP real en
 * `x-nf-client-connection-ip` (y también en `x-forwarded-for`); en localhost el
 * navegador no pasa por ese proxy, así que ninguno llega y la IP queda NULL. Por
 * eso los eventos creados en dev salen sin IP — es esperado; la IP real se ve en
 * producción. Orden: header propio de Netlify → x-forwarded-for → x-real-ip.
 */
export function ipDeRequest(req?: Request): string | null {
  if (!req) return null;
  const nf = req.headers.get("x-nf-client-connection-ip");
  if (nf) return nf.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  return req.headers.get("x-real-ip");
}

export async function registrarEvento(e: RegistrarEventoInput): Promise<void> {
  await createAdminClient()
    .from("eventos_auditoria")
    .insert({
      actor_id: e.actorId,
      actor_rol: e.actorRol ?? null,
      accion: e.accion,
      entidad: e.entidad,
      entidad_id: e.entidadId ?? null,
      datos: e.datos ?? {},
      ip: ipDeRequest(e.req),
      user_agent: e.req?.headers.get("user-agent") ?? null,
    });
}
