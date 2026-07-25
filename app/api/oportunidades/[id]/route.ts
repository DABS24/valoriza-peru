/**
 * Editar una oportunidad de un PORTAL — STAFF del portal.
 *
 * PATCH /api/oportunidades/:id  { comun, datos, garantias }
 *
 * Re-valida `datos` con el Zod de la vertical. Escritura con la SESIÓN (RLS
 * `portal_es_staff` la gatea sobre el portal correcto).
 */

import { NextResponse, type NextRequest } from "next/server";

import { requirePortalStaffApi } from "@/lib/portales/apiGuards";
import { PORTAL_SLUG } from "@/lib/portales/config";
import { oportunidadBodySchema, schemaDatosDe } from "@/lib/portales/schema";
import { actualizarOportunidad } from "@/lib/portales/data";
import { registrarEventoPortal } from "@/lib/portales/auditoria";

const err = (code: string, status = 400) => NextResponse.json({ error: code }, { status });

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const portal = PORTAL_SLUG;
  const { id } = await ctx.params;

  const guard = await requirePortalStaffApi(portal);
  if (!guard.ok) return guard.response;

  const parsed = oportunidadBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return err("body_invalido");

  const datos = schemaDatosDe().safeParse(parsed.data.datos);
  if (!datos.success) return err("datos_invalidos");

  const ok = await actualizarOportunidad(portal, id, {
    comun: parsed.data.comun,
    datos: datos.data,
    garantias: parsed.data.garantias,
  });
  // Republicar una operación que ya tiene contraparte dejaría DOS inversionistas
  // sobre el mismo contrato: 409, no 500 — no es una falla, es una regla.
  if (ok === "reserva_viva") return err("reserva_viva", 409);
  if (ok !== true) return err("error_actualizar", 500);

  await registrarEventoPortal({
    portal,
    actorId: guard.userId,
    actorRol: guard.rol,
    actorNombre: guard.nombre,
    accion: "oportunidad_editada",
    entidad: "portal_oportunidades",
    entidadId: id,
    datos: { titulo: parsed.data.comun.titulo, estado: parsed.data.comun.estado_publicacion },
    req,
  });

  return NextResponse.json({ ok: true });
}
