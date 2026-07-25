/**
 * CONSTANCIA DE RESERVA en PDF — la descarga el propio inversionista.
 *
 * GET /api/reservas/:op/constancia[?download=1]
 *   → application/pdf. Sin download: inline (preview). Con download=1: attachment.
 *
 * Autorización: membresía activa del portal (guard) + la reserva se busca SIEMPRE
 * acotada a `cliente_id = usuario` dentro de `constanciaReserva`. Una reserva
 * ajena o inexistente cae en el MISMO 404 (anti-enumeración: el id no revela si
 * existe). El staff no usa esta ruta — su reporte es otro.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requirePortalMiembroApi } from "@/lib/portales/apiGuards";
import { PORTAL_SLUG } from "@/lib/portales/config";
import { constanciaReserva } from "@/lib/portales/constancia";
import { generarReporteUsuarioPDF } from "@/lib/pdf/reporteUsuario";
import { registrarEventoPortal } from "@/lib/portales/auditoria";

const err = (code: string, status = 400) => NextResponse.json({ error: code }, { status });

export async function GET(req: NextRequest, ctx: { params: Promise<{ op: string }> }) {
  const portal = PORTAL_SLUG;
  const { op } = await ctx.params;
  if (!z.string().uuid().safeParse(op).success) return err("no_existe", 404);

  const guard = await requirePortalMiembroApi(portal);
  if (!guard.ok) return guard.response;

  const data = await constanciaReserva(portal, op);
  if (!data) return err("no_existe", 404);

  const bytes = await generarReporteUsuarioPDF(data);

  // Documento del propio cliente sobre su dinero: queda en la bitácora.
  await registrarEventoPortal({
    portal,
    actorId: guard.userId,
    actorRol: guard.rol,
    actorNombre: guard.nombre,
    accion: "constancia_descargada",
    entidad: "portal_reservas",
    entidadId: op,
    datos: { oportunidad_id: op },
    req,
  });

  const download = new URL(req.url).searchParams.get("download") === "1";
  const nombreArchivo = `constancia-${portal}-${op.slice(0, 8)}.pdf`;

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${nombreArchivo}"`,
      "Cache-Control": "no-store",
    },
  });
}
