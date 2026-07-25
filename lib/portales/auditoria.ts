import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { ipDeRequest } from "@/lib/data/auditoria-server";
import type { PortalSlug } from "@/lib/portales/config";
import type { PortalRol } from "@/lib/portales/roles";

/**
 * Bitácora de auditoría de los PORTALES de inversión.
 *
 * Escribe en `portal_eventos_auditoria` (0089): tabla PROPIA, aislada de
 * `eventos_auditoria` (Don Gato Efectivo). Misma garantía tamper-evident —
 * hash-chain encadenado por trigger— pero con cadena independiente POR PORTAL.
 *
 * POR QUÉ SEPARADA (antes reusaba la de Efectivo, y traía tres problemas reales):
 *   1. El admin de Efectivo veía en su bitácora la actividad de inversionistas
 *      que no son sus clientes, con IP y user-agent incluidos.
 *   2. El admin del PORTAL no podía leer la suya: la RLS de aquella tabla es
 *      `es_admin()`, que resuelve por `perfiles.rol` (Efectivo). Era write-only.
 *   3. `eventos_auditoria.actor_id` tiene FK a `perfiles`, donde un miembro de
 *      portal NO existe: el actor no cabía en su columna y viajaba dentro de
 *      `datos`. Acá la FK va a `auth.users`, así que el actor va donde debe y se
 *      puede filtrar por él.
 *
 * El actor sale SIEMPRE del guard del server, nunca del body del navegador.
 *
 * Best-effort: NUNCA lanza — la auditoría no debe tumbar la acción del usuario.
 * Pero tampoco falla muda: si el insert se cae (ej. la 0089 todavía no se corrió)
 * se registra en consola del server. Un log que falla en silencio es peor que no
 * tenerlo, porque da una sensación falsa de trazabilidad.
 */
export async function registrarEventoPortal(e: {
  portal: PortalSlug;
  /** User id del miembro de portal que actúa (del guard, nunca del body). */
  actorId: string | null;
  /** Rol del portal con el que actuó (incluye `empresario`). */
  actorRol?: PortalRol | null;
  /**
   * Nombre del actor AL MOMENTO del hecho (snapshot, 0091). Resolverlo después
   * contra `portal_miembros` solo funciona mientras la membresía exista; guardarlo
   * acá conserva la respuesta a "¿quién fue?" aunque la cuenta se borre.
   */
  actorNombre?: string | null;
  /** Verbo en snake_case, ej. "reserva_creada", "oportunidad_editada". */
  accion: string;
  /** Recurso afectado, ej. "portal_oportunidades", "portal_reservas". */
  entidad: string;
  /** Id de la fila afectada (si aplica). */
  entidadId?: string | null;
  /** Payload por acción. */
  datos?: Record<string, unknown>;
  /** Request del handler — de acá salen IP y user-agent. */
  req?: Request;
}): Promise<void> {
  try {
    const { error } = await createAdminClient()
      .from("portal_eventos_auditoria")
      .insert({
        portal: e.portal,
        actor_id: e.actorId,
        actor_rol: e.actorRol ?? null,
        actor_nombre: e.actorNombre ?? null,
        accion: e.accion,
        entidad: e.entidad,
        entidad_id: e.entidadId ?? null,
        datos: e.datos ?? {},
        ip: ipDeRequest(e.req),
        user_agent: e.req?.headers.get("user-agent") ?? null,
      });
    if (error) {
      console.error("[auditoria portal] no se pudo registrar el evento:", e.accion, error.message);
    }
  } catch (err) {
    console.error("[auditoria portal] excepción al registrar:", e.accion, err);
  }
}
