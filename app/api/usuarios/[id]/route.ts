/**
 * Edición de un miembro de un PORTAL — SOLO ADMIN.
 *
 * PATCH /api/usuarios/:id  { estado? } | { asesorId? }
 *
 * Escritura de `portal_miembros` = service_role (0076). Autorización
 * reimplementada: requirePortalAdminApi. Un admin NO puede desactivarse a sí
 * mismo (evita quedar sin acceso / sin último admin).
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { requirePortalAdminApi } from "@/lib/portales/apiGuards";
import { PORTAL_SLUG } from "@/lib/portales/config";
import { registrarEventoPortal } from "@/lib/portales/auditoria";

const err = (code: string, status = 400) => NextResponse.json({ error: code }, { status });

const bodySchema = z.object({
  estado: z.enum(["activo", "inactivo"]).optional(),
  // "" limpia el asesor (sin asesor); un uuid lo asigna.
  asesorId: z.string().uuid().optional().or(z.literal("")),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const portal = PORTAL_SLUG;
  const { id } = await ctx.params;

  const guard = await requirePortalAdminApi(portal);
  if (!guard.ok) return guard.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return err("body_invalido");
  const b = parsed.data;

  const admin = createAdminClient();
  const { data: miembro } = await admin
    .from("portal_miembros")
    .select("user_id, rol")
    .eq("portal", portal)
    .eq("user_id", id)
    .maybeSingle();
  if (!miembro) return err("no_existe", 404);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = {};

  if (b.estado !== undefined) {
    if (id === guard.userId && b.estado === "inactivo") return err("no_puedes_desactivarte");
    patch.estado = b.estado;
  }

  if (b.asesorId !== undefined) {
    if (b.asesorId === "") {
      patch.asesor_id = null;
    } else {
      const { data: asesor } = await admin
        .from("portal_miembros")
        .select("rol, estado")
        .eq("portal", portal)
        .eq("user_id", b.asesorId)
        .maybeSingle();
      if (!asesor || asesor.estado !== "activo" || !["asesor", "admin"].includes(asesor.rol)) {
        return err("asesor_invalido");
      }
      patch.asesor_id = b.asesorId;
    }
  }

  if (Object.keys(patch).length === 0) return err("nada_que_cambiar");

  const { error } = await admin
    .from("portal_miembros")
    .update(patch)
    .eq("portal", portal)
    .eq("user_id", id);
  if (error) return err("error_update", 500);

  await registrarEventoPortal({
    portal,
    actorId: guard.userId,
    actorRol: guard.rol,
    actorNombre: guard.nombre,
    accion: "usuario_editado",
    entidad: "portal_miembros",
    entidadId: id,
    datos: { cambios: patch },
    req,
  });

  return NextResponse.json({ ok: true });
}
