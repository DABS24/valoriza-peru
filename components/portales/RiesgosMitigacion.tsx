import { AlertTriangle, ShieldCheck } from "lucide-react";

import { PCard } from "@/components/portales/ui/PCard";
import { COPY } from "@/lib/copy";
import { PORTALES, type PortalSlug, type RiesgoDef } from "@/lib/portales/config";

/**
 * Card "Riesgos y cómo los mitigamos". Ser transparente con el riesgo es parte de
 * la confianza (y del deber con un producto de dinero). Los riesgos son los
 * genéricos de la vertical (config), salvo que la operación traiga `datos.riesgos`
 * (texto libre) para algo específico — en ese caso se muestra ese texto y no la
 * lista con mitigación (no podemos inferir la mitigación de un texto libre).
 */
export function RiesgosMitigacion({
  portal,
  riesgosOverride,
}: {
  portal: PortalSlug;
  /** Texto libre de `datos.riesgos` de la operación, si existe. */
  riesgosOverride?: string | null;
}) {
  const T = COPY.portales.cliente.riesgos;
  const genericos: readonly RiesgoDef[] = PORTALES[portal].riesgos;
  const usarOverride = !!riesgosOverride && riesgosOverride.trim().length > 0;

  return (
    <PCard>
      <h2 className="flex items-center gap-2 font-portal text-lg font-bold text-portal-ink">
        <AlertTriangle className="size-5 text-portal-warning" aria-hidden />
        {T.titulo}
      </h2>
      <p className="mt-1 text-sm text-portal-muted">{T.sub}</p>

      {usarOverride ? (
        <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-portal-ink2">
          {riesgosOverride}
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {genericos.map((r, i) => (
            <li key={i} className="border-t border-portal-line pt-4 first:border-t-0 first:pt-0">
              <p className="flex items-start gap-2 text-sm font-semibold text-portal-ink">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-portal-warning" aria-hidden />
                {r.riesgo}
              </p>
              <p className="mt-1.5 flex items-start gap-2 text-sm text-portal-ink2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-portal-positive" aria-hidden />
                <span>
                  <span className="font-semibold text-portal-positive">{T.comoMitigamos}: </span>
                  {r.mitigacion}
                </span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </PCard>
  );
}
