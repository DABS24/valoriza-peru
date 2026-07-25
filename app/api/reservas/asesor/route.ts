/**
 * BLOQUEAR una oportunidad A NOMBRE DE alguien — acción del ASESOR (0090).
 *
 * POST /api/reservas/asesor
 *   { oportunidadId, titular: {tipo:'cliente'|'prospecto', id} }
 *   { oportunidadId, titular: {tipo:'nuevo', datos:{nombre, telefono, …}} }
 *
 * POR QUÉ EXISTE: el negocio es presencial y el asesor CIERRA POR TELÉFONO — es él
 * quien bloquea la operación, no el inversionista (ENCUADRE_LEGAL.md §2). Hasta
 * ahora ese acto no existía en la app y terminaba en WhatsApp.
 *
 * La transición NO se reimplementa acá: la hace `portal_reservar_para` (0090), que
 * es security-definer y arbitra en la base — claim ATÓMICO sobre 'disponible' y
 * re-verificación de que el titular sea de SU cartera. La reserva que sale es una
 * reserva normal: mismo hold de 24 h, misma cola, mismo confirmar/liberar.
 *
 * SEGURIDAD
 *   · Guard de STAFF acá (403 limpio) + la función SQL como barrera real: el
 *     navegador puede llamar el RPC directo, así que la cartera se verifica en SQL.
 *   · `tipo:'nuevo'` registra el prospecto con la SESIÓN del asesor (RLS), nunca
 *     service_role, y queda en SU cartera porque `asesor_id` sale del guard.
 *   · Si el alta del prospecto sale bien y el bloqueo NO, el prospecto se conserva:
 *     es un contacto real que el asesor acaba de tomar. Se devuelve su id para que
 *     la UI no lo obligue a tipearlo de nuevo.
 */

import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { requirePortalStaffApi } from "@/lib/portales/apiGuards";
import { PORTAL_SLUG } from "@/lib/portales/config";
import { bloqueoAsesorSchema } from "@/lib/portales/schema";
import { crearProspecto } from "@/lib/portales/data";
import { registrarEventoPortal } from "@/lib/portales/auditoria";

const err = (code: string, status = 400) => NextResponse.json({ error: code }, { status });

export async function POST(req: NextRequest) {
  const portal = PORTAL_SLUG;

  const guard = await requirePortalStaffApi(portal);
  if (!guard.ok) return guard.response;

  const parsed = bloqueoAsesorSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return err("body_invalido");
  const { oportunidadId, titular } = parsed.data;

  // ── 1 · Resolver a nombre de quién. "nuevo" da de alta primero. ──
  let clienteId: string | null = null;
  let prospectoId: string | null = null;
  let prospectoCreado = false;

  if (titular.tipo === "cliente") {
    clienteId = titular.id;
  } else if (titular.tipo === "prospecto") {
    prospectoId = titular.id;
  } else {
    const alta = await crearProspecto(portal, guard.userId, titular.datos);
    if ("error" in alta) {
      return err(alta.error, alta.error === "documento_duplicado" ? 409 : 500);
    }
    prospectoId = alta.prospecto.id;
    prospectoCreado = true;
    await registrarEventoPortal({
      portal,
      actorId: guard.userId,
      actorRol: guard.rol,
      actorNombre: guard.nombre,
      accion: "prospecto_creado",
      entidad: "portal_prospectos",
      entidadId: alta.prospecto.id,
      // Sin datos personales en la bitácora: ya viven en su tabla y duplicarlos
      // sería otra copia del mismo dato (§3) en un log que se conserva.
      datos: { con_documento: alta.prospecto.documento != null },
      req,
    });
  }

  // ── 2 · El bloqueo, arbitrado por la base ──
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("portal_reservar_para", {
    p_portal: portal,
    p_op: oportunidadId,
    p_cliente: clienteId,
    p_prospecto: prospectoId,
  });
  if (error) return err("error_reservar", 500);

  const resultado = data as string;

  if (resultado === "ok") {
    await registrarEventoPortal({
      portal,
      actorId: guard.userId,
      actorRol: guard.rol,
      actorNombre: guard.nombre,
      accion: "reserva_creada_por_asesor",
      entidad: "portal_reservas",
      entidadId: oportunidadId,
      datos: {
        oportunidad_id: oportunidadId,
        titular_tipo: clienteId ? "cliente" : "prospecto",
        titular_id: clienteId ?? prospectoId,
        prospecto_creado: prospectoCreado,
      },
      req,
    });
  }

  // resultado ∈ 'ok' | 'no_disponible' | 'sin_acceso' | 'destinatario_invalido'.
  // 200 siempre: la función ya arbitró y la UI muestra el mensaje que toca.
  return NextResponse.json({ resultado, prospectoId, prospectoCreado });
}
