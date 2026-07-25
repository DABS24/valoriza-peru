/**
 * Documentos de respaldo de una SOLICITUD — EMPRESARIO del portal.
 *
 * POST   /api/solicitudes/:id/docs   (multipart: file, tipo, nombre)
 * DELETE /api/solicitudes/:id/docs?docId=…
 *
 * El empresario no tiene RLS sobre portal_solicitudes ni portal_oportunidad_docs
 * (hardening 0081): todo va con service_role (admin client) REIMPLEMENTANDO la
 * autorización — `solicitudDeMiEmpresa` verifica que la solicitud sea de SU
 * prestatario antes de tocar nada. Solo se permite mientras la solicitud está en
 * evaluación (no tras aprobar/rechazar/convertir). El binario ya viene procesado por
 * el navegador; el server re-valida tipo y tamaño (no confía en el cliente).
 */

import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requirePortalEmpresarioApi } from "@/lib/portales/apiGuards";
import { PORTAL_SLUG } from "@/lib/portales/config";
import { solicitudDeMiEmpresa } from "@/lib/portales/data";
import {
  uploadDocSolicitudPortal,
  signedUrlPortal,
  PORTAL_MEDIA_BUCKET,
} from "@/lib/supabase/storage";
import { MAX_ARCHIVO_BYTES, MAX_DOC_BYTES, TIPOS_PERMITIDOS } from "@/lib/files";
import { registrarEventoPortal } from "@/lib/portales/auditoria";

const err = (code: string, status = 400) => NextResponse.json({ error: code }, { status });

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const portal = PORTAL_SLUG;
  const { id } = await ctx.params;

  const guard = await requirePortalEmpresarioApi(portal);
  if (!guard.ok) return guard.response;

  // Authz: la solicitud debe ser de SU empresa y seguir en evaluación.
  const solic = await solicitudDeMiEmpresa(portal, id);
  if (!solic) return err("no_encontrada", 404);
  if (solic.estado !== "en_evaluacion") return err("solicitud_cerrada", 409);

  const form = await req.formData().catch(() => null);
  if (!form) return err("body_invalido");
  const file = form.get("file");
  const tipoRaw = String(form.get("tipo") ?? "").trim();
  const nombreRaw = String(form.get("nombre") ?? "").trim();

  if (!(file instanceof File)) return err("sin_archivo");
  if (tipoRaw.length < 2 || tipoRaw.length > 40) return err("tipo_invalido");
  const nombre = nombreRaw.slice(0, 160) || file.name.slice(0, 160) || null;

  // Re-validación server-side (el navegador ya procesó): imágenes ≤2MB, PDF ≤10MB.
  const mime = file.type || "application/octet-stream";
  if (!TIPOS_PERMITIDOS.includes(mime)) return err("formato_no_permitido");
  const limite = mime.startsWith("image/") ? MAX_ARCHIVO_BYTES : MAX_DOC_BYTES;
  if (file.size > limite) return err("archivo_muy_pesado");

  const admin = createAdminClient();

  // orden = cantidad de docs existentes de la solicitud (append al final).
  const { count } = await admin
    .from("portal_oportunidad_docs")
    .select("id", { count: "exact", head: true })
    .eq("solicitud_id", id);

  let subida;
  try {
    subida = await uploadDocSolicitudPortal(admin, { portal, solicitudId: id, file });
  } catch {
    return err("error_subida", 500);
  }

  const { data, error } = await admin
    .from("portal_oportunidad_docs")
    .insert({
      solicitud_id: id,
      portal,
      tipo: tipoRaw,
      nombre,
      bucket: subida.bucket,
      path: subida.path,
      hash_sha256: subida.hashSha256,
      bytes: subida.bytes,
      mime: subida.mime,
      orden: count ?? 0,
    })
    .select("id, tipo, nombre, bytes, mime, orden")
    .single();

  if (error || !data) {
    await admin.storage
      .from(PORTAL_MEDIA_BUCKET)
      .remove([subida.path])
      .catch(() => {});
    return err("error_guardar", 500);
  }

  await registrarEventoPortal({
    portal,
    actorId: guard.userId,
    actorRol: guard.rol,
    actorNombre: guard.nombre,
    accion: "solicitud_doc_subido",
    entidad: "portal_oportunidad_docs",
    entidadId: data.id,
    datos: { solicitud_id: id, tipo: tipoRaw, nombre },
    req,
  });

  const url = await signedUrlPortal(admin, subida.path);
  return NextResponse.json({
    doc: {
      id: data.id,
      tipo: data.tipo,
      nombre: data.nombre ?? null,
      bytes: data.bytes ?? null,
      mime: data.mime ?? null,
      orden: data.orden,
      url,
    },
  });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const portal = PORTAL_SLUG;
  const { id } = await ctx.params;

  const guard = await requirePortalEmpresarioApi(portal);
  if (!guard.ok) return guard.response;

  const solic = await solicitudDeMiEmpresa(portal, id);
  if (!solic) return err("no_encontrada", 404);
  if (solic.estado !== "en_evaluacion") return err("solicitud_cerrada", 409);

  const docId = req.nextUrl.searchParams.get("docId");
  if (!docId) return err("falta_doc");

  const admin = createAdminClient();
  // Lee el path acotando a portal + solicitud + doc (anti-IDOR).
  const { data: doc } = await admin
    .from("portal_oportunidad_docs")
    .select("path")
    .eq("portal", portal)
    .eq("solicitud_id", id)
    .eq("id", docId)
    .maybeSingle();
  if (!doc) return err("no_encontrado", 404);

  const { error } = await admin.from("portal_oportunidad_docs").delete().eq("id", docId);
  if (error) return err("error_borrar", 500);
  await admin.storage
    .from(PORTAL_MEDIA_BUCKET)
    .remove([doc.path as string])
    .catch(() => {});

  await registrarEventoPortal({
    portal,
    actorId: guard.userId,
    actorRol: guard.rol,
    actorNombre: guard.nombre,
    accion: "solicitud_doc_borrado",
    entidad: "portal_oportunidad_docs",
    entidadId: docId,
    datos: { solicitud_id: id },
    req,
  });

  return NextResponse.json({ ok: true });
}
