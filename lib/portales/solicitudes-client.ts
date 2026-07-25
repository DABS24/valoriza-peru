/**
 * Crear solicitudes y subir/borrar sus documentos desde el BROWSER (empresario).
 *
 * Todo pasa por Route Handlers detrás de `requirePortalEmpresarioApi`: el servidor
 * reimplementa la autorización (acota a SU prestatario). Los documentos se PROCESAN
 * en el navegador (imagen <2MB / PDF ≤10MB, lib/files) y se mandan por multipart;
 * nunca base64. Espeja el patrón de docs-client.ts, pero apuntando a la solicitud.
 */

import { procesarDocParaSubir } from "@/lib/files";
import type { DocPortalRef } from "@/lib/portales/docs-client";

export interface SolicitudInput {
  monto: number;
  moneda: "PEN" | "USD";
  plazoMeses: number;
  descripcion?: string;
}

/** Crea una solicitud. Devuelve el id creado o null si falló. */
export async function crearSolicitudPortal(input: SolicitudInput): Promise<string | null> {
  const res = await fetch(`/api/solicitudes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      monto: input.monto,
      moneda: input.moneda,
      plazo_meses: input.plazoMeses,
      descripcion: input.descripcion?.trim() || undefined,
    }),
  });
  if (!res.ok) return null;
  const payload = (await res.json().catch(() => ({}))) as { id?: string };
  return payload.id ?? null;
}

/**
 * Edita una solicitud propia (solo el server decide si se puede: debe ser de SU
 * empresa y seguir en evaluación). Devuelve ok.
 */
export async function editarSolicitudPortal(
  solicitudId: string,
  input: SolicitudInput,
): Promise<boolean> {
  const res = await fetch(`/api/solicitudes/${solicitudId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      monto: input.monto,
      moneda: input.moneda,
      plazo_meses: input.plazoMeses,
      descripcion: input.descripcion?.trim() || undefined,
    }),
  });
  return res.ok;
}

/** Retira una solicitud propia (pasa a 'retirada'). Devuelve ok. */
export async function retirarSolicitudPortal(solicitudId: string): Promise<boolean> {
  const res = await fetch(`/api/solicitudes/${solicitudId}`, {
    method: "DELETE",
  });
  return res.ok;
}

/** Procesa, sube y registra un documento de una solicitud. Devuelve la fila o null.
 *  Puede lanzar ArchivoError si el archivo no pasa la validación local. */
export async function subirDocSolicitud(args: {
  solicitudId: string;
  tipo: string;
  file: File;
}): Promise<DocPortalRef | null> {
  const listo = await procesarDocParaSubir(args.file);
  const form = new FormData();
  form.append("file", listo);
  form.append("tipo", args.tipo);
  form.append("nombre", args.file.name);

  const res = await fetch(
    `/api/solicitudes/${args.solicitudId}/docs`,
    { method: "POST", body: form },
  );
  if (!res.ok) return null;
  const payload = (await res.json().catch(() => ({}))) as { doc?: DocPortalRef };
  return payload.doc ?? null;
}

/** Borra un documento (fila + binario) de una solicitud. Devuelve ok. */
export async function borrarDocSolicitud(solicitudId: string, docId: string): Promise<boolean> {
  const res = await fetch(
    `/api/solicitudes/${solicitudId}/docs?docId=${encodeURIComponent(docId)}`,
    { method: "DELETE" },
  );
  return res.ok;
}
