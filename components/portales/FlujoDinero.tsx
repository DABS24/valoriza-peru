import { ArrowRightLeft } from "lucide-react";

import { cn } from "@/lib/cn";
import { COPY } from "@/lib/copy";
import { PCard } from "@/components/portales/ui/PCard";

/**
 * "Cómo funciona el dinero" — el modelo de intermediación explicado a la parte que
 * está mirando la pantalla. Un solo componente para las dos facetas porque es la
 * MISMA verdad contada dos veces: el texto sale de COPY.portales.flujoDinero, así
 * que el modelo vive en un solo lugar y no se puede desincronizar entre portales.
 *
 * Por qué existe: la ficha explicaba el riesgo, la garantía y la recuperación, pero
 * no lo más básico —con QUIÉN se firma y a QUIÉN se transfiere—. Sin eso, la lectura
 * por defecto es que el portal recibe el dinero y lo reparte, que es exactamente lo
 * que NO pasa.
 *
 * REGLA DURA en la faceta `inversionista`: se explica el modelo, nunca el monto ni el
 * % de la comisión (no sale de su retorno). Este componente no recibe cifras: no
 * puede filtrarlas ni por accidente.
 *
 * Server component a propósito (sin estado, sin toggle): es información que no se
 * debe tener que buscar, y no suma JS al bundle.
 */
export function FlujoDinero({
  faceta,
  className,
}: {
  faceta: "inversionista" | "empresario";
  className?: string;
}) {
  const T = COPY.portales.flujoDinero[faceta];

  return (
    <PCard className={className}>
      <h2 className="flex items-center gap-2 font-portal text-lg font-bold text-portal-ink">
        <ArrowRightLeft className="size-5 shrink-0 text-portal-primary" aria-hidden />
        {T.titulo}
      </h2>
      <p className="mt-1 text-sm text-portal-muted">{T.sub}</p>

      <ol className="mt-4">
        {T.pasos.map((p, i) => (
          <li key={p.titulo} className="relative flex gap-3 pb-4 last:pb-0">
            {i < T.pasos.length - 1 && (
              <span
                className="absolute bottom-0 left-[13px] top-8 w-px bg-portal-line"
                aria-hidden
              />
            )}
            <span className="relative z-10 grid size-7 shrink-0 place-items-center rounded-full bg-portal-primary-soft text-xs font-bold tabular-nums text-portal-primary-ink">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-portal-ink">{p.titulo}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-portal-ink2">{p.detalle}</p>
            </div>
          </li>
        ))}
      </ol>

      <p
        className={cn(
          "mt-2 rounded-portal-sm border border-portal-line bg-portal-subtle/60 p-3",
          "text-xs leading-relaxed text-portal-ink2",
        )}
      >
        {T.nota}
      </p>
    </PCard>
  );
}
