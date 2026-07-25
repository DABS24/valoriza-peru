/**
 * Crear una oportunidad de un PORTAL — STAFF del portal.
 *
 * POST /api/oportunidades  { comun, datos, garantias }
 *
 * El `datos` jsonb se re-valida server-side con el Zod de la vertical (el form
 * no es autoridad). La escritura va con la SESIÓN (RLS `portal_es_staff`).
 */

import { NextResponse, type NextRequest } from "next/server";

import { requirePortalStaffApi } from "@/lib/portales/apiGuards";
import { PORTAL_SLUG } from "@/lib/portales/config";
import { oportunidadBodySchema, schemaDatosDe } from "@/lib/portales/schema";
import { crearOportunidad } from "@/lib/portales/data";
import { registrarEventoPortal } from "@/lib/portales/auditoria";

const err = (code: string, status = 400) => NextResponse.json({ error: code }, { status });

export async function POST(req: NextRequest) {
  const portal = PORTAL_SLUG;

  const guard = await requirePortalStaffApi(portal);
  if (!guard.ok) return guard.response;

  const parsed = oportunidadBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return err("body_invalido");

  const datos = schemaDatosDe().safeParse(parsed.data.datos);
  if (!datos.success) return err("datos_invalidos");

  const id = await crearOportunidad(portal, guard.userId, {
    comun: parsed.data.comun,
    datos: datos.data,
    garantias: parsed.data.garantias,
  });
  if (!id) return err("error_crear", 500);

  await registrarEventoPortal({
    portal,
    actorId: guard.userId,
    actorRol: guard.rol,
    actorNombre: guard.nombre,
    accion: "oportunidad_creada",
    entidad: "portal_oportunidades",
    entidadId: id,
    datos: { titulo: parsed.data.comun.titulo, estado: parsed.data.comun.estado_publicacion },
    req,
  });

  return NextResponse.json({ ok: true, id });
}
