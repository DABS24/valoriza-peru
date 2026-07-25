/**
 * CONFIRMAR o LIBERAR una reserva.
 *
 * PATCH /api/reservas/:op  { accion: "confirmar" | "liberar" }
 *
 *   · confirmar → `portal_confirmar_reserva` (SOLO staff): reservada → cerrada.
 *   · liberar   → `portal_liberar_reserva` (staff o el cliente dueño): vuelve al
 *                 pool.
 *
 * La AUTORIZACIÓN fina la hace la función SQL security-definer (0078) con
 * auth.uid() (staff, o dueño para liberar). El guard acá solo exige membresía
 * activa; la función devuelve 'sin_acceso' si el rol no alcanza.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { requirePortalMiembroApi } from "@/lib/portales/apiGuards";
import { PORTAL_SLUG } from "@/lib/portales/config";
import { notificarConfirmacionAlInversionista } from "@/lib/portales/notificaciones";
import { registrarEventoPortal } from "@/lib/portales/auditoria";

const err = (code: string, status = 400) => NextResponse.json({ error: code }, { status });
const bodySchema = z.object({ accion: z.enum(["confirmar", "liberar"]) });

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ op: string }> }) {
  const portal = PORTAL_SLUG;
  const { op } = await ctx.params;
  if (!z.string().uuid().safeParse(op).success) return err("op_invalida", 404);

  const guard = await requirePortalMiembroApi(portal);
  if (!guard.ok) return guard.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return err("body_invalido");

  const fn =
    parsed.data.accion === "confirmar" ? "portal_confirmar_reserva" : "portal_liberar_reserva";

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, { p_portal: portal, p_op: op });
  if (error) return err("error_accion", 500);

  const resultado = data as string;

  // Solo si la transición se aplicó: auditar y, al confirmar, avisar al
  // inversionista (best-effort; la transición ya está persistida server-side).
  if (resultado === "ok") {
    await registrarEventoPortal({
      portal,
      actorId: guard.userId,
      actorRol: guard.rol,
      actorNombre: guard.nombre,
      accion: parsed.data.accion === "confirmar" ? "reserva_confirmada" : "reserva_liberada",
      entidad: "portal_reservas",
      entidadId: op,
      datos: { oportunidad_id: op },
      req,
    });
    if (parsed.data.accion === "confirmar") {
      await notificarConfirmacionAlInversionista(portal, op);
    }
  }

  // data ∈ 'ok' | 'no_reservada' | 'sin_acceso'.
  return NextResponse.json({ resultado });
}
