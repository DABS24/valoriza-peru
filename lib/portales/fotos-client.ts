/**
 * Subida/borrado de FOTOS de una oportunidad desde el BROWSER (staff del portal).
 *
 * Mismo patrón que docs-client: el navegador solo PROCESA el archivo (comprime a
 * <2MB con lib/files) y lo manda por multipart a un Route Handler detrás de
 * `requirePortalStaffApi`; el server re-valida, sube a Storage, guarda el metadata,
 * calcula el `orden` y REGISTRA el hecho en la bitácora del portal.
 *
 * Antes insertaba y borraba directo por PostgREST. La RLS lo permitía (staff del
 * portal), pero subir o borrar una foto no dejaba ningún rastro, el `orden` lo
 * decidía el navegador y el borrado filtraba solo por `id`.
 */

import { procesarArchivoParaSubir } from "@/lib/files";

export interface FotoPortalRef {
  id: string;
  path: string;
  orden: number;
  url: string | null;
}

/**
 * Comprime, sube y registra una foto de la oportunidad. Devuelve la fila creada
 * (con URL firmada para preview inmediato) o null si falló. Puede lanzar
 * ArchivoError si el archivo no pasa la validación local (el caller lo captura).
 */
export async function subirFotoPortal(args: {
  oportunidadId: string;
  file: File;
}): Promise<FotoPortalRef | null> {
  const listo = await procesarArchivoParaSubir(args.file);
  const form = new FormData();
  form.append("file", listo);

  const res = await fetch(`/api/oportunidades/${args.oportunidadId}/fotos`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) return null;
  const payload = (await res.json().catch(() => ({}))) as { foto?: FotoPortalRef };
  return payload.foto ?? null;
}

/** Borra una foto (fila + binario) vía la API staff. Devuelve ok. */
export async function borrarFotoPortal(oportunidadId: string, fotoId: string): Promise<boolean> {
  const res = await fetch(
    `/api/oportunidades/${oportunidadId}/fotos?fotoId=${encodeURIComponent(fotoId)}`,
    { method: "DELETE" },
  );
  return res.ok;
}
