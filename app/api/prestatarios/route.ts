/**
 * Crear un PRESTATARIO (contratista) de un PORTAL — STAFF del portal.
 *
 * POST /api/prestatarios  { nombre, ruc?, nivel_riesgo?, scoring_pago?, rating?, notas_internas?, estado }
 *
 * El scoring de pagador lo pone el staff. La escritura va con la SESIÓN (RLS
 * `portal_es_staff` de 0077). Solo tiene sentido en verticales con prestatarios.
 */

import { NextResponse, type NextRequest } from "next/server";

import { requirePortalStaffApi } from "@/lib/portales/apiGuards";
import { PORTAL_SLUG, portalPorSlug } from "@/lib/portales/config";
import { prestatarioBodySchema } from "@/lib/portales/schema";
import { crearPrestatario } from "@/lib/portales/data";
import { registrarEventoPortal } from "@/lib/portales/auditoria";

const err = (code: string, status = 400) => NextResponse.json({ error: code }, { status });

export async function POST(req: NextRequest) {
  const portal = PORTAL_SLUG;
  if (!portalPorSlug(portal)?.prestatarios) return err("no_aplica", 404);

  const guard = await requirePortalStaffApi(portal);
  if (!guard.ok) return guard.response;

  const parsed = prestatarioBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return err("body_invalido");

  const id = await crearPrestatario(portal, guard.userId, parsed.data);
  if (!id) return err("error_crear", 500);

  await registrarEventoPortal({
    portal,
    actorId: guard.userId,
    actorRol: guard.rol,
    actorNombre: guard.nombre,
    accion: "prestatario_creado",
    entidad: "portal_prestatarios",
    entidadId: id,
    datos: { nombre: parsed.data.nombre },
    req,
  });

  return NextResponse.json({ ok: true, id });
}
