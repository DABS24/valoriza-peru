/**
 * Libreta del asesor desde el BROWSER: crear una nota sobre alguien de su cartera
 * —cliente con cuenta o prospecto (0090)—, cerrarla / reabrirla y borrarla.
 *
 * Todo pasa por Route Handlers detrás de `requirePortalStaffApi`: el servidor
 * verifica que el sujeto sea de SU cartera y que la nota sea SUYA. Acá no hay
 * ninguna decisión de permiso — solo transporte. Espeja solicitudes-client.ts.
 */

import type { NotaCliente } from "@/lib/portales/data";
import type { RefTitular } from "@/lib/portales/asesor";

export interface NotaInput {
  /** Sobre quién es la nota: cliente con cuenta o prospecto. */
  sujeto: RefTitular;
  texto: string;
  /** Próxima acción en ISO (ya normalizada con fechaRecordatorioISO), o null. */
  recordarEn: string | null;
}

/** Crea una nota. Devuelve la fila creada, o null si falló / no autorizado. */
export async function crearNotaPortal(input: NotaInput): Promise<NotaCliente | null> {
  const res = await fetch(`/api/notas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sujeto: input.sujeto,
      texto: input.texto.trim(),
      recordar_en: input.recordarEn ?? undefined,
    }),
  });
  if (!res.ok) return null;
  const payload = (await res.json().catch(() => ({}))) as { nota?: NotaCliente };
  return payload.nota ?? null;
}

/** Cierra (o reabre) la próxima acción de una nota propia. Devuelve ok. */
export async function marcarNotaPortal(notaId: string, hecha: boolean): Promise<boolean> {
  const res = await fetch(`/api/notas/${notaId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hecha }),
  });
  return res.ok;
}

/** Borra una nota propia. Devuelve ok. */
export async function borrarNotaPortal(notaId: string): Promise<boolean> {
  const res = await fetch(`/api/notas/${notaId}`, { method: "DELETE" });
  return res.ok;
}
