/**
 * Marcar una oportunidad CERRADA como FINANCIADA — STAFF del portal.
 *
 * PATCH /api/oportunidades/:id/financiar
 *
 * Cierra el ciclo post-reserva: tras confirmar (estado 'cerrada'), el asesor marca
 * cuándo la operación quedó financiada (inversionista → prestatario, fuera de la
 * plataforma). El timeline del inversionista refleja este paso.
 *
 * CONCURRENCIA (dongato-patterns §2): NO es check-then-act. La condición va DENTRO
 * del UPDATE (`estado_publicacion='cerrada' and financiada_en is null`) y se verifica
 * que devolvió fila. La escritura va con la SESIÓN: la RLS `portal_op_staff_actualiza`
 * (0076) exige staff de ESTE portal; el guard solo filtra temprano.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { requirePortalStaffApi } from "@/lib/portales/apiGuards";
import { PORTAL_SLUG } from "@/lib/portales/config";
import { registrarEventoPortal } from "@/lib/portales/auditoria";

const err = (code: string, status = 400) => NextResponse.json({ error: code }, { status });

export async function PATCH(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const portal = PORTAL_SLUG;
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return err("id_invalida", 404);

  const guard = await requirePortalStaffApi(portal);
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  // UPDATE condicional atómico: solo pasa 'cerrada' y aún no financiada. `returning`
  // dice si tocó fila (0 filas ⇒ no estaba cerrada o ya estaba financiada).
  const { data, error } = await supabase
    .from("portal_oportunidades")
    .update({ financiada_en: new Date().toISOString() })
    .eq("portal", portal)
    .eq("id", id)
    .eq("estado_publicacion", "cerrada")
    .is("financiada_en", null)
    .select("id");
  if (error) return err("error_financiar", 500);
  if (!data || data.length === 0) {
    // No estaba cerrada, ya estaba financiada, o no es de este portal (RLS).
    return NextResponse.json({ resultado: "no_aplica" });
  }

  await registrarEventoPortal({
    portal,
    actorId: guard.userId,
    actorRol: guard.rol,
    actorNombre: guard.nombre,
    accion: "oportunidad_financiada",
    entidad: "portal_oportunidades",
    entidadId: id,
    req: _req,
  });

  return NextResponse.json({ resultado: "ok" });
}
