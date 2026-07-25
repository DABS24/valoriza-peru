/**
 * Documentos de respaldo (data room) de una oportunidad — STAFF del portal.
 *
 * POST   /api/oportunidades/:id/docs   (multipart: file, tipo, nombre)
 * DELETE /api/oportunidades/:id/docs?docId=…
 *
 * El binario ya viene PROCESADO por el navegador (imagen <2MB / PDF sin comprimir):
 * acá se RE-valida el tamaño (defensa: el server no confía en el cliente), se sube
 * a Storage con la SESIÓN (la RLS de storage exige staff de ESE portal) y se inserta
 * el metadata (RLS `portal_docs_staff_inserta`). Nunca base64 en la DB; solo path +
 * hash. La lectura del cliente es por función server acotada (data.ts), no por acá.
 */

import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { requirePortalStaffApi } from "@/lib/portales/apiGuards";
import { PORTAL_SLUG } from "@/lib/portales/config";
import { uploadDocPortal, signedUrlPortal, PORTAL_MEDIA_BUCKET } from "@/lib/supabase/storage";
import { MAX_ARCHIVO_BYTES, MAX_DOC_BYTES, TIPOS_PERMITIDOS } from "@/lib/files";
import { registrarEventoPortal } from "@/lib/portales/auditoria";

const err = (code: string, status = 400) => NextResponse.json({ error: code }, { status });

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const portal = PORTAL_SLUG;
  const { id } = await ctx.params;

  const guard = await requirePortalStaffApi(portal);
  if (!guard.ok) return guard.response;

  const form = await req.formData().catch(() => null);
  if (!form) return err("body_invalido");
  const file = form.get("file");
  const tipoRaw = String(form.get("tipo") ?? "").trim();
  const nombreRaw = String(form.get("nombre") ?? "").trim();

  if (!(file instanceof File)) return err("sin_archivo");
  // tipo: texto abierto pero acotado (espejo del CHECK de 0082: 2–40 chars).
  if (tipoRaw.length < 2 || tipoRaw.length > 40) return err("tipo_invalido");
  const nombre = nombreRaw.slice(0, 160) || file.name.slice(0, 160) || null;

  // Re-validación server-side del tipo y tamaño (el navegador ya procesó, pero
  // el server no confía): imágenes ≤2MB, PDF ≤10MB.
  const mime = file.type || "application/octet-stream";
  if (!TIPOS_PERMITIDOS.includes(mime)) return err("formato_no_permitido");
  const limite = mime.startsWith("image/") ? MAX_ARCHIVO_BYTES : MAX_DOC_BYTES;
  if (file.size > limite) return err("archivo_muy_pesado");

  const supabase = await createClient();

  // Verifica que la oportunidad exista en ESTE portal (defensa; la RLS ya acota).
  const { data: op } = await supabase
    .from("portal_oportunidades")
    .select("id")
    .eq("portal", portal)
    .eq("id", id)
    .maybeSingle();
  if (!op) return err("no_encontrada", 404);

  // orden = cantidad de docs existentes (append al final).
  const { count } = await supabase
    .from("portal_oportunidad_docs")
    .select("id", { count: "exact", head: true })
    .eq("oportunidad_id", id);

  let subida;
  try {
    subida = await uploadDocPortal(supabase, { portal, oportunidadId: id, file });
  } catch {
    return err("error_subida", 500);
  }

  const { data, error } = await supabase
    .from("portal_oportunidad_docs")
    .insert({
      oportunidad_id: id,
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
    // Rollback del binario huérfano si la fila no entró.
    await supabase.storage
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
    accion: "doc_subido",
    entidad: "portal_oportunidad_docs",
    entidadId: data.id,
    datos: { oportunidad_id: id, tipo: tipoRaw, nombre },
    req,
  });

  const url = await signedUrlPortal(supabase, subida.path);
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

  const guard = await requirePortalStaffApi(portal);
  if (!guard.ok) return guard.response;

  const docId = req.nextUrl.searchParams.get("docId");
  if (!docId) return err("falta_doc");

  const supabase = await createClient();
  // Lee el path acotando a portal + oportunidad + doc (anti-IDOR); la RLS ya gatea.
  const { data: doc } = await supabase
    .from("portal_oportunidad_docs")
    .select("path")
    .eq("portal", portal)
    .eq("oportunidad_id", id)
    .eq("id", docId)
    .maybeSingle();
  if (!doc) return err("no_encontrado", 404);

  const { error } = await supabase.from("portal_oportunidad_docs").delete().eq("id", docId);
  if (error) return err("error_borrar", 500);
  await supabase.storage
    .from(PORTAL_MEDIA_BUCKET)
    .remove([doc.path as string])
    .catch(() => {});

  await registrarEventoPortal({
    portal,
    actorId: guard.userId,
    actorRol: guard.rol,
    actorNombre: guard.nombre,
    accion: "doc_borrado",
    entidad: "portal_oportunidad_docs",
    entidadId: docId,
    datos: { oportunidad_id: id },
    req,
  });

  return NextResponse.json({ ok: true });
}
