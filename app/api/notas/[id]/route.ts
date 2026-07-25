/**
 * Cerrar/reabrir o borrar una NOTA PROPIA de la libreta del asesor (0086).
 *
 * PATCH  /api/notas/:id   { hecha: boolean }
 * DELETE /api/notas/:id
 *
 * ACOTACIÓN: la nota es de quien la escribió. Ambas operaciones llevan
 * `autor_id = él` DENTRO de la cláusula del UPDATE/DELETE y verifican la fila
 * devuelta (nada de check-then-act), lo mismo que enforza la policy de 0086. Un
 * id válido de la nota de otro asesor devuelve 404, no toca nada. Por SESIÓN.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requirePortalStaffApi } from "@/lib/portales/apiGuards";
import { PORTAL_SLUG } from "@/lib/portales/config";
import { notaPatchSchema } from "@/lib/portales/schema";
import { marcarNotaHecha, borrarNotaCliente } from "@/lib/portales/data";
import { registrarEventoPortal } from "@/lib/portales/auditoria";

const err = (code: string, status = 400) => NextResponse.json({ error: code }, { status });

/** Valida el id y resuelve el guard de staff. Común a PATCH y DELETE. */
async function preparar(ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return { fail: err("id_invalida", 404) } as const;
  const portal = PORTAL_SLUG;
  const guard = await requirePortalStaffApi(portal);
  if (!guard.ok) return { fail: guard.response } as const;
  return { portal, id, guard } as const;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const p = await preparar(ctx);
  if ("fail" in p) return p.fail;

  const parsed = notaPatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return err("body_invalido");

  const ok = await marcarNotaHecha(p.portal, p.guard.userId, p.id, parsed.data.hecha);
  if (!ok) return err("no_encontrada", 404);

  await registrarEventoPortal({
    portal: p.portal,
    actorId: p.guard.userId,
    actorRol: p.guard.rol,
    actorNombre: p.guard.nombre,
    accion: parsed.data.hecha ? "nota_cerrada" : "nota_reabierta",
    entidad: "portal_notas",
    entidadId: p.id,
    req,
  });

  return NextResponse.json({ resultado: "ok" });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const p = await preparar(ctx);
  if ("fail" in p) return p.fail;

  const ok = await borrarNotaCliente(p.portal, p.guard.userId, p.id);
  if (!ok) return err("no_encontrada", 404);

  await registrarEventoPortal({
    portal: p.portal,
    actorId: p.guard.userId,
    actorRol: p.guard.rol,
    actorNombre: p.guard.nombre,
    accion: "nota_borrada",
    entidad: "portal_notas",
    entidadId: p.id,
    req,
  });

  return NextResponse.json({ resultado: "ok" });
}
