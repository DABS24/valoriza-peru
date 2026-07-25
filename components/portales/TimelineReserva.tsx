import { Check } from "lucide-react";

import { cn } from "@/lib/cn";
import { COPY } from "@/lib/copy";

/** Estado del proceso que ve el inversionista (se deriva de la reserva + financiada_en). */
export type EstadoTimeline = "reservada" | "confirmada" | "financiada";

/**
 * Timeline del proceso post-reserva. Deriva el paso actual del estado (no hay
 * estados intermedios en DB; se mapea desde el estado + `financiada_en`):
 *   · reservada  (activa)     → paso "Tu asesor te contacta" (los previos, hechos).
 *   · confirmada              → paso "Firma" (avanzado, en proceso).
 *   · financiada              → TODO el proceso completo (transferencia hecha).
 * Presentacional: los pasos y textos salen del copy. Mobile-first (vertical).
 */
export function TimelineReserva({
  estado,
  compacto = false,
}: {
  estado: EstadoTimeline;
  /** Sin card ni encabezado (para incrustar en el dashboard). */
  compacto?: boolean;
}) {
  const T = COPY.portales.cliente.timeline;
  const pasos = T.pasos;
  // Índice del paso "en curso": reservada → asesor (1); confirmada → firma (2);
  // financiada → más allá del último paso ⇒ todos marcados como hechos.
  const actual = estado === "financiada" ? pasos.length : estado === "confirmada" ? 2 : 1;

  const lista = (
    <ol className={cn("relative space-y-4", !compacto && "mt-4")}>
      {pasos.map((p, i) => {
        const hecho = i < actual;
        const enCurso = i === actual;
        return (
          <li key={p.clave} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full border-2 text-xs font-bold",
                  hecho && "border-portal-positive bg-portal-positive text-white",
                  enCurso && "border-portal-primary bg-portal-primary text-white",
                  !hecho && !enCurso && "border-portal-line2 bg-portal-surface text-portal-muted",
                )}
              >
                {hecho ? <Check className="size-4" aria-hidden /> : i + 1}
              </span>
              {i < pasos.length - 1 && (
                <span
                  className={cn(
                    "mt-1 w-0.5 flex-1",
                    i < actual ? "bg-portal-positive" : "bg-portal-line2",
                  )}
                  aria-hidden
                />
              )}
            </div>
            <div className={cn("pb-1", i === pasos.length - 1 && "pb-0")}>
              <p
                className={cn(
                  "text-sm font-semibold",
                  enCurso ? "text-portal-primary" : hecho ? "text-portal-ink" : "text-portal-muted",
                )}
              >
                {p.label}
              </p>
              <p className="text-xs text-portal-muted">{p.detalle}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );

  if (compacto) return lista;

  return (
    <div className="rounded-portal border border-portal-line bg-portal-surface p-6 shadow-portal">
      <h2 className="font-portal text-lg font-bold text-portal-ink">{T.titulo}</h2>
      <p className="mt-1 text-sm font-medium text-portal-primary">
        {estado === "financiada"
          ? T.estadoFinanciada
          : estado === "confirmada"
            ? T.estadoConfirmada
            : T.estadoReservada}
      </p>
      {lista}
    </div>
  );
}
