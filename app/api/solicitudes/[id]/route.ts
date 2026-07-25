/**
 * Una SOLICITUD de financiamiento. Un método por ACTOR, cada uno con su guard:
 *
 *   PATCH  (ADMIN)       aprobar / rechazar (con motivo)
 *   PUT    (EMPRESARIO)  editar SU solicitud mientras sigue en evaluación
 *   DELETE (EMPRESARIO)  retirar SU solicitud (estado 'retirada', 0086)
 *
 * ADMIN escribe por SESIÓN (RLS portal_solic_staff_actualiza). El EMPRESARIO no
 * tiene RLS sobre esta tabla (hardening 0081): sus dos métodos van con service_role
 * y REIMPLEMENTAN la autorización dentro de data.ts, acotando a SU prestatario y al
 * estado 'en_evaluacion' EN LA MISMA SENTENCIA (anti-IDOR + anti-carrera): el id de
 * la URL nunca se toma como permiso. La CONVERSIÓN a oportunidad va en /convertir.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requirePortalAdminApi, requirePortalEmpresarioApi } from "@/lib/portales/apiGuards";
import { PORTAL_SLUG } from "@/lib/portales/config";
import { resolverSolicitudSchema, solicitudBodySchema } from "@/lib/portales/schema";
import { resolverSolicitudStaff, editarMiSolicitud, retirarMiSolicitud } from "@/lib/portales/data";
import { notificarResolucionAlEmpresario } from "@/lib/portales/notificaciones";
import { registrarEventoPortal } from "@/lib/portales/auditoria";

const err = (code: string, status = 400) => NextResponse.json({ error: code }, { status });

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const portal = PORTAL_SLUG;
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return err("id_invalida", 404);

  const guard = await requirePortalAdminApi(portal);
  if (!guard.ok) return guard.response;

  const parsed = resolverSolicitudSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return err("body_invalido");

  const aprobar = parsed.data.accion === "aprobar";
  const motivo = parsed.data.accion === "rechazar" ? parsed.data.motivo : undefined;

  const res = await resolverSolicitudStaff(portal, id, aprobar, guard.userId, motivo);
  if (!res) return NextResponse.json({ resultado: "no_aplica" });

  await registrarEventoPortal({
    portal,
    actorId: guard.userId,
    actorRol: guard.rol,
    actorNombre: guard.nombre,
    accion: aprobar ? "solicitud_aprobada" : "solicitud_rechazada",
    entidad: "portal_solicitudes",
    entidadId: id,
    datos: aprobar ? undefined : { motivo },
    req,
  });

  // Aviso a la empresa (best-effort; no bloquea la respuesta).
  await notificarResolucionAlEmpresario(portal, res.creadoPor, aprobar, motivo);

  return NextResponse.json({ resultado: "ok" });
}

/**
 * EMPRESARIO edita SU solicitud (monto, moneda, plazo, descripción). Solo mientras
 * está 'en_evaluacion'; la pertenencia y el estado los verifica el UPDATE condicional
 * de `editarMiSolicitud`. 0 filas ⇒ 409 (no es suya o ya se resolvió): un 404/409
 * uniforme no le dice a nadie si la solicitud existe.
 */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const portal = PORTAL_SLUG;
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return err("id_invalida", 404);

  const guard = await requirePortalEmpresarioApi(portal);
  if (!guard.ok) return guard.response;

  const parsed = solicitudBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return err("body_invalido");

  const ok = await editarMiSolicitud(portal, id, parsed.data);
  if (!ok) return err("no_editable", 409);

  await registrarEventoPortal({
    portal,
    actorId: guard.userId,
    actorRol: guard.rol,
    actorNombre: guard.nombre,
    accion: "solicitud_editada",
    entidad: "portal_solicitudes",
    entidadId: id,
    datos: { monto: parsed.data.monto, plazo_meses: parsed.data.plazo_meses },
    req,
  });

  return NextResponse.json({ resultado: "ok" });
}

/**
 * EMPRESARIO RETIRA su solicitud (estado 'retirada'). No borra la fila ni sus
 * documentos: queda el rastro para el staff y para auditoría. Solo desde
 * 'en_evaluacion' (lo garantiza el UPDATE condicional de `retirarMiSolicitud`).
 */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const portal = PORTAL_SLUG;
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return err("id_invalida", 404);

  const guard = await requirePortalEmpresarioApi(portal);
  if (!guard.ok) return guard.response;

  const ok = await retirarMiSolicitud(portal, id);
  if (!ok) return err("no_retirable", 409);

  await registrarEventoPortal({
    portal,
    actorId: guard.userId,
    actorRol: guard.rol,
    actorNombre: guard.nombre,
    accion: "solicitud_retirada",
    entidad: "portal_solicitudes",
    entidadId: id,
    req,
  });

  return NextResponse.json({ resultado: "ok" });
}
