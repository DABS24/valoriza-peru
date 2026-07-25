/**
 * Fotos de una oportunidad — STAFF del portal.
 *
 * POST   /api/oportunidades/:id/fotos   (multipart: file)
 * DELETE /api/oportunidades/:id/fotos?fotoId=…
 *
 * POR QUÉ EXISTE (antes el navegador insertaba y borraba directo por PostgREST):
 * una foto y un documento son el MISMO tipo de objeto y tenían dos patrones
 * incompatibles. Por el camino directo, subir o borrar una foto no dejaba NINGÚN
 * rastro en la bitácora, el `orden` lo mandaba el navegador y el borrado filtraba
 * solo por `id` (sin acotar a portal ni a oportunidad). Acá se sigue el patrón de
 * docs/route.ts: guard + auditoría + `orden` calculado en el server + borrado
 * acotado. La RLS sigue siendo la barrera real; esto le suma trazabilidad.
 *
 * El binario ya viene PROCESADO por el navegador (imagen <2MB, lib/files): acá se
 * re-valida (el server no confía en el cliente), se sube a Storage CON LA SESIÓN
 * —la RLS de storage exige staff de ESE portal— y se inserta el metadata. Nunca
 * base64 en la DB: solo path + hash.
 */

import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { requirePortalStaffApi } from "@/lib/portales/apiGuards";
import { PORTAL_SLUG } from "@/lib/portales/config";
import { uploadFotoPortal, signedUrlPortal, PORTAL_MEDIA_BUCKET } from "@/lib/supabase/storage";
import { MAX_ARCHIVO_BYTES, TIPOS_PERMITIDOS } from "@/lib/files";
import { registrarEventoPortal } from "@/lib/portales/auditoria";
import type { SupabaseClient } from "@supabase/supabase-js";

const err = (code: string, status = 400) => NextResponse.json({ error: code }, { status });

/**
 * Borra el binario del bucket. No revienta la respuesta —la fila ya se fue— pero
 * TAMPOCO se calla: un binario huérfano en Storage es justo lo que hay que poder
 * rastrear después, y un catch vacío lo esconde para siempre.
 */
async function borrarBinario(supabase: SupabaseClient, path: string): Promise<void> {
  const { error } = await supabase.storage.from(PORTAL_MEDIA_BUCKET).remove([path]);
  if (error) console.error("[portales fotos] binario huérfano en Storage:", path, error.message);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const portal = PORTAL_SLUG;
  const { id } = await ctx.params;

  const guard = await requirePortalStaffApi(portal);
  if (!guard.ok) return guard.response;

  const form = await req.formData().catch(() => null);
  if (!form) return err("body_invalido");
  const file = form.get("file");
  if (!(file instanceof File)) return err("sin_archivo");

  // Re-validación server-side: acá SOLO entran imágenes (el bucket de fotos se
  // muestra como galería), y ≤2MB, el mismo techo que garantiza lib/files.
  const mime = file.type || "application/octet-stream";
  if (!TIPOS_PERMITIDOS.includes(mime) || !mime.startsWith("image/")) {
    return err("formato_no_permitido");
  }
  if (file.size > MAX_ARCHIVO_BYTES) return err("archivo_muy_pesado");

  const supabase = await createClient();

  // La oportunidad tiene que existir en ESTE portal (defensa; la RLS ya acota).
  const { data: op } = await supabase
    .from("portal_oportunidades")
    .select("id")
    .eq("portal", portal)
    .eq("id", id)
    .maybeSingle();
  if (!op) return err("no_encontrada", 404);

  // orden = cuántas fotos de la oportunidad hay ya (append al final). Lo calcula el
  // SERVER: cuando lo mandaba el navegador, dos pestañas o un valor inventado
  // decidían cuál es la portada (orden 0). Se cuentan las fotos SUELTAS de la
  // oportunidad (garantia_id null), que son las que se listan y ordenan juntas.
  const { count } = await supabase
    .from("portal_oportunidad_fotos")
    .select("id", { count: "exact", head: true })
    .eq("oportunidad_id", id)
    .is("garantia_id", null);

  let subida;
  try {
    subida = await uploadFotoPortal(supabase, { portal, oportunidadId: id, file });
  } catch {
    return err("error_subida", 500);
  }

  const { data, error } = await supabase
    .from("portal_oportunidad_fotos")
    .insert({
      oportunidad_id: id,
      portal,
      bucket: subida.bucket,
      path: subida.path,
      hash_sha256: subida.hashSha256,
      bytes: subida.bytes,
      mime: subida.mime,
      orden: count ?? 0,
    })
    .select("id, path, orden")
    .single();

  if (error || !data) {
    // Rollback del binario huérfano: si la fila no entró, la foto no debe quedar.
    await borrarBinario(supabase, subida.path);
    return err("error_guardar", 500);
  }

  await registrarEventoPortal({
    portal,
    actorId: guard.userId,
    actorRol: guard.rol,
    actorNombre: guard.nombre,
    accion: "foto_subida",
    entidad: "portal_oportunidad_fotos",
    entidadId: data.id,
    datos: { oportunidad_id: id, orden: data.orden },
    req,
  });

  const url = await signedUrlPortal(supabase, subida.path);
  return NextResponse.json({
    foto: { id: data.id, path: data.path, orden: data.orden, url },
  });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const portal = PORTAL_SLUG;
  const { id } = await ctx.params;

  const guard = await requirePortalStaffApi(portal);
  if (!guard.ok) return guard.response;

  const fotoId = req.nextUrl.searchParams.get("fotoId");
  if (!fotoId) return err("falta_foto");

  const supabase = await createClient();

  // Borrado ACOTADO a portal + oportunidad + foto (anti-IDOR: el id de la URL no es
  // permiso) y en UNA sentencia, que además devuelve el path de la fila borrada. El
  // path del binario sale de la fila, nunca del cliente.
  const { data, error } = await supabase
    .from("portal_oportunidad_fotos")
    .delete()
    .eq("portal", portal)
    .eq("oportunidad_id", id)
    .eq("id", fotoId)
    .select("path")
    .maybeSingle();
  if (error) return err("error_borrar", 500);
  // 0 filas = no existe o no es de esta oportunidad: misma respuesta para los dos
  // casos (no se confirma la existencia de nada ajeno).
  if (!data) return err("no_encontrada", 404);

  if (data.path) await borrarBinario(supabase, data.path as string);

  await registrarEventoPortal({
    portal,
    actorId: guard.userId,
    actorRol: guard.rol,
    actorNombre: guard.nombre,
    accion: "foto_borrada",
    entidad: "portal_oportunidad_fotos",
    entidadId: fotoId,
    datos: { oportunidad_id: id },
    req,
  });

  return NextResponse.json({ ok: true });
}
