"use client";

import { useId, useState } from "react";
import { AlertTriangle, ChevronDown, Gavel, Scale } from "lucide-react";

import { cn } from "@/lib/cn";
import { COPY } from "@/lib/copy";
import { PCard } from "@/components/portales/ui/PCard";
import { PORTALES, type PortalSlug } from "@/lib/portales/config";

/**
 * "¿Qué pasa si el deudor no paga?" — continuación natural de Salvaguardas y
 * RiesgosMitigacion, y el hueco de transparencia que la ficha tenía abierto: decía
 * QUE hay garantía y CUÁNTO cubre, pero nunca qué ocurre el día que hay que
 * ejecutarla, que es exactamente el escenario que el inversionista está evaluando.
 *
 * El contenido es por VERTICAL (config): ejecutar una hipoteca no se parece
 * a cobrar una factura del Estado (contratista). Acá solo el chrome y el orden.
 *
 * EXPANDIBLE (patrón de MetodologiaRiesgo) porque el texto es largo y no debe
 * empujar el resto de la ficha; el titular y la bajada quedan SIEMPRE visibles,
 * así la respuesta se encuentra aunque no se abra.
 */
export function RecuperacionImpago({ portal }: { portal: PortalSlug }) {
  const [abierto, setAbierto] = useState(false);
  const T = COPY.portales.cliente.recuperacion;
  const R = PORTALES[portal].recuperacion;
  const panelId = useId();

  return (
    <PCard>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-controls={panelId}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <span className="min-w-0">
          <span className="flex items-center gap-2 font-portal text-lg font-bold text-portal-ink">
            <Gavel className="size-5 shrink-0 text-portal-primary" aria-hidden />
            {T.titulo}
          </span>
          <span className="mt-1 block text-sm text-portal-muted">{T.sub}</span>
          <span className="mt-2 block text-sm font-semibold text-portal-primary">
            {abierto ? T.ocultar : T.ver}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "mt-1 size-5 shrink-0 text-portal-muted transition",
            abierto && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {abierto && (
        <div id={panelId} className="mt-5 space-y-6 border-t border-portal-line pt-5">
          {/* Etapas de la cobranza, de la más temprana a la más tardía. */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-portal-muted">
              {T.etapasTitulo}
            </h3>
            <ol className="mt-3">
              {R.etapas.map((e, i) => (
                <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < R.etapas.length - 1 && (
                    <span
                      className="absolute bottom-0 left-[13px] top-8 w-px bg-portal-line"
                      aria-hidden
                    />
                  )}
                  <span className="relative z-10 grid size-7 shrink-0 place-items-center rounded-full bg-portal-primary-soft text-xs font-bold tabular-nums text-portal-primary-ink">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-portal-muted">
                      {e.cuando}
                    </p>
                    <p className="mt-0.5 font-semibold text-portal-ink">{e.titulo}</p>
                    <p className="mt-1 text-sm leading-relaxed text-portal-ink2">{e.detalle}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Qué se ejecuta exactamente en esta vertical. */}
          <div className="rounded-portal-sm border border-portal-line bg-portal-subtle/60 p-4">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-portal-muted">
              <Scale className="size-4 shrink-0" aria-hidden />
              {T.queSeEjecutaTitulo}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-portal-ink2">{R.queSeEjecuta}</p>
          </div>

          {/* Límites propios de la vertical: costos, demoras y lo no cubierto. */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-portal-muted">
              {T.limitesTitulo}
            </h3>
            <ul className="mt-3 space-y-2.5">
              {R.limites.map((l, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm leading-relaxed text-portal-ink2"
                >
                  <AlertTriangle
                    className="mt-0.5 size-4 shrink-0 text-portal-warning"
                    aria-hidden
                  />
                  <span className="min-w-0">{l}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Advertencias universales: el contrapeso honesto del titular de cobertura. */}
          <div className="rounded-portal-sm border border-portal-danger/30 bg-portal-danger-soft/40 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-portal-danger">
              {T.advertenciaTitulo}
            </h3>
            <ul className="mt-2 space-y-2">
              {T.advertencias.map((a, i) => (
                <li key={i} className="text-sm leading-relaxed text-portal-ink2">
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </PCard>
  );
}
