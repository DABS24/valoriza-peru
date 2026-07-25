/**
 * Editar un PRESTATARIO (contratista) de un PORTAL — STAFF del portal.
 *
 * PATCH /api/prestatarios/:id  { nombre, ruc?, nivel_riesgo?, scoring_pago?, rating?, notas_internas?, estado }
 *
 * Escritura con la SESIÓN (RLS `portal_es_staff` la gatea sobre el portal correcto).
 */

import { NextResponse, type NextRequest } from "next/server";

import { requirePortalStaffApi } from "@/lib/portales/apiGuards";
import { PORTAL_SLUG, portalPorSlug } from "@/lib/portales/config";
import { prestatarioBodySchema } from "@/lib/portales/schema";
import { actualizarPrestatario } from "@/lib/portales/data";
import { registrarEventoPortal } from "@/lib/portales/auditoria";

const err = (code: string, status = 400) => NextResponse.json({ error: code }, { status });

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const portal = PORTAL_SLUG;
  const { id } = await ctx.params;
  if (!portalPorSlug(portal)?.prestatarios) return err("no_aplica", 404);

  const guard = await requirePortalStaffApi(portal);
  if (!guard.ok) return guard.response;

  const parsed = prestatarioBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return err("body_invalido");

  const ok = await actualizarPrestatario(portal, id, parsed.data);
  if (!ok) return err("error_actualizar", 500);

  await registrarEventoPortal({
    portal,
    actorId: guard.userId,
    actorRol: guard.rol,
    actorNombre: guard.nombre,
    accion: "prestatario_editado",
    entidad: "portal_prestatarios",
    entidadId: id,
    datos: { nombre: parsed.data.nombre, estado: parsed.data.estado },
    req,
  });

  return NextResponse.json({ ok: true });
}
