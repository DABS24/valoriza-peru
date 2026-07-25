/**
 * Subida/borrado de DOCUMENTOS de respaldo (data room) desde el BROWSER (staff).
 *
 * A diferencia de las fotos (que se insertan directo por RLS), los docs pasan por
 * un Route Handler detrás de `requirePortalStaffApi`: el navegador PROCESA el
 * archivo (imagen <2MB / PDF ≤10MB, lib/files) y lo manda por multipart; el server
 * lo re-valida, sube a Storage y guarda el metadata. Nunca base64.
 */

import { procesarDocParaSubir } from "@/lib/files";

export interface DocPortalRef {
  id: string;
  tipo: string;
  nombre: string | null;
  bytes: number | null;
  mime: string | null;
  orden: number;
  url: string | null;
}

/**
 * Procesa (comprime imagen / valida PDF), sube y registra un documento. Devuelve la
 * fila creada (con URL firmada para preview) o null si falló. Puede lanzar
 * ArchivoError si el archivo no pasa la validación local (el caller lo captura).
 */
export async function subirDocPortal(args: {
  oportunidadId: string;
  tipo: string;
  file: File;
}): Promise<DocPortalRef | null> {
  const listo = await procesarDocParaSubir(args.file);
  const form = new FormData();
  form.append("file", listo);
  form.append("tipo", args.tipo);
  form.append("nombre", args.file.name);

  const res = await fetch(
    `/api/oportunidades/${args.oportunidadId}/docs`,
    { method: "POST", body: form },
  );
  if (!res.ok) return null;
  const payload = (await res.json().catch(() => ({}))) as { doc?: DocPortalRef };
  return payload.doc ?? null;
}

/** Borra un documento (fila + binario) vía la API staff. Devuelve ok. */
export async function borrarDocPortal(oportunidadId: string, docId: string): Promise<boolean> {
  const res = await fetch(
    `/api/oportunidades/${oportunidadId}/docs?docId=${encodeURIComponent(docId)}`,
    { method: "DELETE" },
  );
  return res.ok;
}
