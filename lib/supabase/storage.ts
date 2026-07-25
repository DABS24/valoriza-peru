/**
 * Manejo de EVIDENCIA (DNI, selfie, voucher, boleta, avatar) en Supabase Storage.
 *
 * Política (ver docs-internal/SUPABASE_CUTOVER.md, sección 6):
 *  - El binario vive en un bucket PRIVADO. En la DB solo el metadata (path + hash).
 *  - Nunca base64 en una columna, nunca por correo, nunca URL pública.
 *  - Path = `<perfil_id>/<uuid>-<archivo>` → la RLS de storage.objects exige que el
 *    primer segmento sea el uid del dueño (nadie escribe en la carpeta de otro).
 *  - Lectura SIEMPRE por URL firmada de corta duración generada en el server.
 *  - El hash SHA-256 alimenta el antifraude (detección de voucher/boleta reusado).
 *
 * NO conectado en Fase 1 (la app usa el mock localStorage). Listo para el cutover.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/** Clasificación del archivo (espejo del enum SQL tipo_archivo). */
export type TipoArchivo =
  "dni_frontal" | "dni_posterior" | "selfie" | "voucher" | "boleta" | "constancia" | "avatar";

/** Bucket privado/público según el tipo. avatares es el único público. La boleta
 *  (comisión SUNAT) y la constancia (transferencia del neto) comparten el bucket
 *  privado `boletas` — se distinguen por el `tipo` en la tabla `archivos`. */
const BUCKET_POR_TIPO: Record<TipoArchivo, string> = {
  dni_frontal: "kyc",
  dni_posterior: "kyc",
  selfie: "kyc",
  voucher: "vouchers",
  boleta: "boletas",
  constancia: "boletas",
  avatar: "avatares",
};

export interface EvidenciaSubida {
  bucket: string;
  /** Ruta dentro del bucket: `<perfilId>/<uuid>-<nombre>`. Esto es lo que se guarda en la DB. */
  path: string;
  /** SHA-256 en hex del contenido (antifraude por reuso). */
  hashSha256: string;
  bytes: number;
  mime: string;
}

/** SHA-256 en hex de un archivo (usa WebCrypto; disponible en browser y server modernos). */
async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Nombre de archivo seguro (sin rutas ni caracteres raros). */
function nombreSeguro(nombre: string): string {
  return nombre.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
}

/**
 * Sube un archivo de evidencia al bucket correcto y devuelve el metadata para
 * persistir en la tabla `archivos`. NO guarda nada en la DB — eso lo hace el
 * caller (server action) para poder escribir también quién lo subió y auditar.
 */
export async function uploadEvidencia(
  supabase: SupabaseClient,
  args: { tipo: TipoArchivo; perfilId: string; file: File },
): Promise<EvidenciaSubida> {
  const { tipo, perfilId, file } = args;
  const bucket = BUCKET_POR_TIPO[tipo];
  const buffer = await file.arrayBuffer();
  const hashSha256 = await sha256Hex(buffer);
  const path = `${perfilId}/${crypto.randomUUID()}-${nombreSeguro(file.name)}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw error;

  return {
    bucket,
    path,
    hashSha256,
    bytes: file.size,
    mime: file.type || "application/octet-stream",
  };
}

/** Bucket único de los portales secretos (0076). Path = <portal>/<oportunidad_id>/<uuid>-<nombre>. */
export const PORTAL_MEDIA_BUCKET = "portal-media";

export interface FotoPortalSubida {
  bucket: string;
  /** Ruta dentro del bucket: `<portal>/<oportunidadId>/<uuid>-<nombre>`. */
  path: string;
  hashSha256: string;
  bytes: number;
  mime: string;
}

/**
 * Sube una foto de una oportunidad al bucket portal-media y devuelve el metadata
 * para persistir en `portal_oportunidad_fotos`. La primera carpeta del path ES el
 * portal → la RLS de storage exige ser staff de ESE portal (nadie sube al portal
 * de otro). Funciona con el client del navegador (sesión staff) o con el admin.
 */
export async function uploadFotoPortal(
  supabase: SupabaseClient,
  args: { portal: string; oportunidadId: string; file: File },
): Promise<FotoPortalSubida> {
  const { portal, oportunidadId, file } = args;
  const buffer = await file.arrayBuffer();
  const hashSha256 = await sha256Hex(buffer);
  const path = `${portal}/${oportunidadId}/${crypto.randomUUID()}-${nombreSeguro(file.name)}`;
  const { error } = await supabase.storage.from(PORTAL_MEDIA_BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw error;
  return {
    bucket: PORTAL_MEDIA_BUCKET,
    path,
    hashSha256,
    bytes: file.size,
    mime: file.type || "application/octet-stream",
  };
}

/** Extensión de archivo a partir del MIME (fallback: por el nombre, o "bin"). */
function extPorMime(mime: string, nombre: string): string {
  const porMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
  };
  if (porMime[mime]) return porMime[mime];
  const ext = nombre.split(".").pop()?.toLowerCase();
  return ext && /^[a-z0-9]{1,5}$/.test(ext) ? ext : "bin";
}

/**
 * Sube un DOCUMENTO de respaldo (data room) al bucket portal-media y devuelve el
 * metadata para persistir en `portal_oportunidad_docs`. Path
 * `<portal>/<oportunidadId>/docs/<uuid>.<ext>` → la RLS de storage exige ser staff
 * de ESE portal. Igual que uploadFotoPortal pero en el subdirectorio docs/ y
 * conservando la extensión (para que el visor/descarga sepa el tipo).
 */
export async function uploadDocPortal(
  supabase: SupabaseClient,
  args: { portal: string; oportunidadId: string; file: File },
): Promise<FotoPortalSubida> {
  const { portal, oportunidadId, file } = args;
  const buffer = await file.arrayBuffer();
  const hashSha256 = await sha256Hex(buffer);
  const mime = file.type || "application/octet-stream";
  const ext = extPorMime(mime, file.name);
  const path = `${portal}/${oportunidadId}/docs/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(PORTAL_MEDIA_BUCKET).upload(path, file, {
    contentType: mime,
    upsert: false,
  });
  if (error) throw error;
  return { bucket: PORTAL_MEDIA_BUCKET, path, hashSha256, bytes: file.size, mime };
}

/**
 * Sube un DOCUMENTO de respaldo de una SOLICITUD del empresario al bucket
 * portal-media. Path `<portal>/solicitudes/<solicitudId>/docs/<uuid>.<ext>`. Se
 * sube SIEMPRE con el admin client (service_role): el empresario no es staff, así
 * que la RLS de storage no lo dejaría; la authz la reimplementa el route (verifica
 * que la solicitud sea de SU prestatario) antes de llamar acá.
 */
export async function uploadDocSolicitudPortal(
  supabase: SupabaseClient,
  args: { portal: string; solicitudId: string; file: File },
): Promise<FotoPortalSubida> {
  const { portal, solicitudId, file } = args;
  const buffer = await file.arrayBuffer();
  const hashSha256 = await sha256Hex(buffer);
  const mime = file.type || "application/octet-stream";
  const ext = extPorMime(mime, file.name);
  const path = `${portal}/solicitudes/${solicitudId}/docs/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(PORTAL_MEDIA_BUCKET).upload(path, file, {
    contentType: mime,
    upsert: false,
  });
  if (error) throw error;
  return { bucket: PORTAL_MEDIA_BUCKET, path, hashSha256, bytes: file.size, mime };
}

/**
 * URLs firmadas (batch) para varias fotos del bucket portal-media. Devuelve un
 * mapa path→url. Se genera en el server: para clientes hay que firmarlas con el
 * admin (la RLS de storage solo deja SELECT al staff). Los paths que fallen se
 * omiten del mapa.
 */
export async function signedUrlsPortal(
  supabase: SupabaseClient,
  paths: string[],
  expiresInSeconds = 300,
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(PORTAL_MEDIA_BUCKET)
    .createSignedUrls(paths, expiresInSeconds);
  if (error || !data) return {};
  const out: Record<string, string> = {};
  for (const row of data) {
    if (row.signedUrl && row.path) out[row.path] = row.signedUrl;
  }
  return out;
}

/** URL firmada de UNA foto del bucket portal-media. */
export async function signedUrlPortal(
  supabase: SupabaseClient,
  path: string,
  expiresInSeconds = 300,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(PORTAL_MEDIA_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * URL firmada de corta duración para LEER un archivo privado. Generar en el server
 * y pasarla al cliente justo cuando se necesita mostrar; no persistir la URL.
 */
export async function signedUrlEvidencia(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  expiresInSeconds = 120,
  // `download`: true fuerza descarga (Content-Disposition: attachment); un string
  // además fija el nombre del archivo descargado. Para mostrar inline, omitir.
  download?: boolean | string,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds, download ? { download } : undefined);
  if (error) throw error;
  return data.signedUrl;
}
