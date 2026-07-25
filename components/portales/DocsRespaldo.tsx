import { FileText, ExternalLink } from "lucide-react";

import { PCard } from "@/components/portales/ui/PCard";
import { COPY } from "@/lib/copy";
import { toFileSize } from "@/lib/formatters";
import { labelDoc } from "@/lib/portales/constants";
import type { DocRow } from "@/lib/portales/data";

/**
 * Sección "Documentos de respaldo" (data room) para el CLIENTE. Lista los docs con
 * su URL FIRMADA (generada server-side con service_role, patrón de las fotos): el
 * inversionista abre/descarga cada uno. Presentacional: la data llega resuelta y
 * NUNCA trae hash ni nada interno. Si no hay docs, no se renderiza (el caller lo
 * decide) — acá se muestra el vacío por si se quiere el placeholder.
 */
export function DocsRespaldo({ docs }: { docs: DocRow[] }) {
  const T = COPY.portales.cliente.docs;

  return (
    <PCard>
      <h2 className="flex items-center gap-2 font-portal text-lg font-bold text-portal-ink">
        <FileText className="size-5 text-portal-primary" aria-hidden />
        {T.titulo}
      </h2>
      <p className="mt-1 text-sm text-portal-muted">{T.sub}</p>

      {docs.length === 0 ? (
        <p className="mt-4 text-sm text-portal-muted">{T.vacio}</p>
      ) : (
        <ul className="mt-4 divide-y divide-portal-line">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-chip bg-portal-primary-soft text-portal-primary-ink">
                  <FileText className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-portal-ink">{labelDoc(d.tipo)}</p>
                  <p className="truncate text-xs text-portal-muted">
                    {[d.nombre, d.bytes ? toFileSize(d.bytes) : null].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
              {d.url && (
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-chip border border-portal-line2 bg-portal-surface px-3 py-1.5 text-sm font-semibold text-portal-primary transition hover:bg-portal-subtle"
                >
                  <ExternalLink className="size-4" aria-hidden />
                  {T.ver}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </PCard>
  );
}
