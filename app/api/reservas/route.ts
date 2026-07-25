/**
 * RESERVAR una oportunidad — CLIENTE (o cualquier miembro) del portal.
 *
 * POST /api/reservas  { oportunidadId }
 *
 * La transición NO se reimplementa en TS: se llama la función SQL security-definer
 * `portal_reservar` (0078), que hace el claim ATÓMICO sobre 'disponible' (dos
 * clientes nunca se quedan con la misma; el segundo recibe 'no_disponible'). El
 * guard exige membresía activa; la función RE-verifica con auth.uid().
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { requirePortalMiembroApi } from "@/lib/portales/apiGuards";
import { PORTAL_SLUG } from "@/lib/portales/config";
import { notificarReservaAlAsesor } from "@/lib/portales/notificaciones";
import { registrarEventoPortal } from "@/lib/portales/auditoria";

const err = (code: string, status = 400) => NextResponse.json({ error: code }, { status });
const bodySchema = z.object({ oportunidadId: z.string().uuid() });

export async function POST(req: NextRequest) {
  const portal = PORTAL_SLUG;

  const guard = await requirePortalMiembroApi(portal);
  if (!guard.ok) return guard.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return err("body_invalido");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("portal_reservar", {
    p_portal: portal,
    p_op: parsed.data.oportunidadId,
  });
  if (error) return err("error_reservar", 500);

  const resultado = data as string;

  // Solo si la reserva se concretó: auditar + avisar al asesor (best-effort, no
  // bloquea la respuesta ni la transacción — la reserva ya está persistida).
  if (resultado === "ok") {
    await registrarEventoPortal({
      portal,
      actorId: guard.userId,
      actorRol: guard.rol,
      actorNombre: guard.nombre,
      accion: "reserva_creada",
      entidad: "portal_reservas",
      entidadId: parsed.data.oportunidadId,
      datos: { oportunidad_id: parsed.data.oportunidadId },
      req,
    });
    await notificarReservaAlAsesor(portal, parsed.data.oportunidadId, guard.userId);
  }

  // data ∈ 'ok' | 'no_disponible' | 'sin_acceso'. Se devuelve tal cual para que el
  // cliente muestre el mensaje correcto (200 siempre; la función ya arbitró).
  return NextResponse.json({ resultado });
}
