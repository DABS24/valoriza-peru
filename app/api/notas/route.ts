/**
 * Crear una NOTA de la libreta del asesor sobre alguien de SU cartera (0086/0090).
 *
 * POST /api/notas  { sujeto: {tipo,id}, texto, recordar_en? }
 *
 * El sujeto es un CLIENTE con cuenta o un PROSPECTO sin cuenta: el seguimiento
 * empieza antes de que exista la cuenta.
 *
 * ANTI-IDOR: el id del sujeto viaja en el body y NO autoriza nada — el server
 * verifica que tenga `asesor_id = él` (crearNota → esClienteDeAsesor /
 * esProspectoDeAsesor, las dos mitades de la misma regla de cartera). Si no es
 * suyo, 403 uniforme: la respuesta no distingue "no existe" de "no es tuyo". El
 * autor sale del guard, nunca del navegador. Escritura por SESIÓN (RLS staff-only,
 * y desde 0090 la propia policy exige cartera), jamás service_role.
 */

import { NextResponse, type NextRequest } from "next/server";

import { requirePortalStaffApi } from "@/lib/portales/apiGuards";
import { PORTAL_SLUG } from "@/lib/portales/config";
import { notaBodySchema } from "@/lib/portales/schema";
import { crearNota } from "@/lib/portales/data";
import { registrarEventoPortal } from "@/lib/portales/auditoria";

const err = (code: string, status = 400) => NextResponse.json({ error: code }, { status });

export async function POST(req: NextRequest) {
  const portal = PORTAL_SLUG;

  const guard = await requirePortalStaffApi(portal);
  if (!guard.ok) return guard.response;

  const parsed = notaBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return err("body_invalido");

  const nota = await crearNota(
    portal,
    guard.userId,
    parsed.data.sujeto,
    parsed.data.texto,
    parsed.data.recordar_en || null,
  );
  if (!nota) return err("no_autorizado", 403);

  await registrarEventoPortal({
    portal,
    actorId: guard.userId,
    actorRol: guard.rol,
    actorNombre: guard.nombre,
    accion: "nota_creada",
    entidad: "portal_notas",
    entidadId: nota.id,
    // El TEXTO de la nota no se copia a la bitácora: ya vive en su tabla y
    // duplicarlo sería otra copia del mismo dato (§3) en un log que se conserva.
    datos: {
      sujeto_tipo: parsed.data.sujeto.tipo,
      sujeto_id: parsed.data.sujeto.id,
      con_recordatorio: nota.recordarEn != null,
    },
    req,
  });

  return NextResponse.json({ nota });
}
