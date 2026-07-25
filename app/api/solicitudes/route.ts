/**
 * Crear una SOLICITUD de financiamiento — EMPRESARIO del portal.
 *
 * POST /api/solicitudes  { monto, moneda, plazo_meses, descripcion? }
 *
 * El empresario no tiene RLS sobre portal_solicitudes (hardening 0081): la escritura
 * va con service_role dentro de `crearSolicitud`, que REIMPLEMENTA la autorización
 * (acota a SU prestatario por user_id). Solo tiene sentido en verticales con
 * prestatarios. Tras crearla, avisa al staff (best-effort).
 */

import { NextResponse, type NextRequest } from "next/server";

import { requirePortalEmpresarioApi } from "@/lib/portales/apiGuards";
import { PORTAL_SLUG, portalPorSlug } from "@/lib/portales/config";
import { solicitudBodySchema } from "@/lib/portales/schema";
import { crearSolicitud } from "@/lib/portales/data";
import { notificarSolicitudAlStaff } from "@/lib/portales/notificaciones";
import { registrarEventoPortal } from "@/lib/portales/auditoria";

const err = (code: string, status = 400) => NextResponse.json({ error: code }, { status });

export async function POST(req: NextRequest) {
  const portal = PORTAL_SLUG;
  if (!portalPorSlug(portal)?.prestatarios) return err("no_aplica", 404);

  const guard = await requirePortalEmpresarioApi(portal);
  if (!guard.ok) return guard.response;

  const parsed = solicitudBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return err("body_invalido");

  const creada = await crearSolicitud(portal, parsed.data);
  if (!creada) return err("error_crear", 500);

  await registrarEventoPortal({
    portal,
    actorId: guard.userId,
    actorRol: guard.rol,
    actorNombre: guard.nombre,
    accion: "solicitud_creada",
    entidad: "portal_solicitudes",
    entidadId: creada.id,
    datos: { monto: parsed.data.monto, plazo_meses: parsed.data.plazo_meses },
    req,
  });

  // Aviso al staff (best-effort; no bloquea la respuesta ni revierte la solicitud).
  await notificarSolicitudAlStaff(portal, creada.prestatarioId);

  return NextResponse.json({ ok: true, id: creada.id });
}
