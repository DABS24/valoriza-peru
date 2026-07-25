/**
 * Convertir una SOLICITUD en una OPORTUNIDAD (borrador) — ADMIN del portal.
 *
 * POST /api/solicitudes/:id/convertir
 *
 * Crea una oportunidad prellenada con los datos de la solicitud, marca la solicitud
 * 'convertida' y las liga (ver convertirSolicitud, que hace el claim atómico +
 * rollback anti-orfandad). Devuelve el id de la oportunidad para que el admin la
 * complete (tasa, comisión, garantías) en su formulario de edición.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requirePortalAdminApi } from "@/lib/portales/apiGuards";
import { PORTAL_SLUG, portalPorSlug } from "@/lib/portales/config";
import { convertirSolicitud } from "@/lib/portales/data";
import { registrarEventoPortal } from "@/lib/portales/auditoria";

const err = (code: string, status = 400) => NextResponse.json({ error: code }, { status });

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const portal = PORTAL_SLUG;
  const { id } = await ctx.params;
  if (!portalPorSlug(portal)?.prestatarios) return err("no_aplica", 404);
  if (!z.string().uuid().safeParse(id).success) return err("id_invalida", 404);

  const guard = await requirePortalAdminApi(portal);
  if (!guard.ok) return guard.response;

  const res = await convertirSolicitud(portal, id, guard.userId);
  if (!res) return NextResponse.json({ resultado: "no_aplica" });

  await registrarEventoPortal({
    portal,
    actorId: guard.userId,
    actorRol: guard.rol,
    actorNombre: guard.nombre,
    accion: "solicitud_convertida",
    entidad: "portal_solicitudes",
    entidadId: id,
    datos: { oportunidad_id: res.oportunidadId },
    req,
  });

  return NextResponse.json({ resultado: "ok", oportunidadId: res.oportunidadId });
}
