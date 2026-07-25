import { cn } from "@/lib/cn";
import { COPY } from "@/lib/copy";
import type { PortalEstadoOportunidad } from "@/lib/portales/config";

/**
 * Timeline compacto del EMPRESARIO por operación. NO hay estados intermedios en la
 * base: el paso actual se DERIVA (SSOT) del estado de publicación + `financiada_en`.
 * Progresión: En evaluación → Aprobada → Publicada → Con inversionista → Financiada →
 * En repago. Presentacional (barra segmentada + etiqueta del paso actual), mobile-first.
 * NUNCA expone quién es el inversionista: 'reservada' solo dice "con inversionista".
 */
function pasoActual(estado: PortalEstadoOportunidad, financiadaEn: string | null): number {
  if (financiadaEn != null) return 5; // En repago (financiada ya ocurrió)
  switch (estado) {
    case "cerrada":
      return 4; // Financiada en proceso (cerrada con inversionista)
    case "reservada":
      return 3; // Con inversionista
    case "disponible":
      return 2; // Publicada
    case "borrador":
    default:
      return 1; // Aprobada (existe como operación, aún sin publicar)
  }
}

export function TimelineEmpresario({
  estado,
  financiadaEn,
}: {
  estado: PortalEstadoOportunidad;
  financiadaEn: string | null;
}) {
  const T = COPY.portales.empresario.timeline;
  const pasos = T.pasos;
  const actual = pasoActual(estado, financiadaEn);

  return (
    <div className="mt-3 border-t border-portal-line pt-3">
      <div className="flex items-center gap-1" aria-hidden>
        {pasos.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              i <= actual ? "bg-portal-primary" : "bg-portal-line2",
            )}
          />
        ))}
      </div>
      <p className="mt-2 text-xs font-semibold text-portal-primary">{T.actual(pasos[actual])}</p>
    </div>
  );
}
