"use client";

import { useState } from "react";
import { ChevronDown, Info } from "lucide-react";

import { cn } from "@/lib/cn";
import { COPY } from "@/lib/copy";
import { RiesgoBadge } from "@/components/portales/RiesgoBadge";
import { nivelRiesgo, RATING_ESCALA_EXPLICACION } from "@/lib/portales/constants";
import type { PortalNivelRiesgo } from "@/lib/portales/config";

/**
 * Explicación EXPANDIBLE del nivel de riesgo y del rating, junto al badge.
 * Metodología visible = confianza: el inversionista entiende qué mira el equipo
 * detrás del color y de la letra, no solo el color. Client por el toggle; el
 * contenido sale de constants (catálogo, no chrome).
 */
export function MetodologiaRiesgo({
  nivel,
  rating,
}: {
  nivel: PortalNivelRiesgo | null;
  rating: string | null;
}) {
  const [abierto, setAbierto] = useState(false);
  const T = COPY.portales.cliente.metodologia;
  const def = nivelRiesgo(nivel);
  if (!def && !rating) return null;

  return (
    <div className="rounded-portal-sm border border-portal-line bg-portal-subtle/50">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-portal-ink">
          <Info className="size-4 shrink-0 text-portal-primary" aria-hidden />
          {T.riesgoTitulo}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-portal-muted transition", abierto && "rotate-180")}
          aria-hidden
        />
      </button>

      {abierto && (
        <div className="space-y-4 border-t border-portal-line px-4 py-4">
          {def && (
            <div>
              <div className="mb-2">
                <RiesgoBadge nivel={nivel} size="sm" />
              </div>
              <p className="text-sm leading-relaxed text-portal-ink2">{def.explicacion}</p>
            </div>
          )}
          {rating && (
            <div>
              <p className="mb-1 text-sm font-semibold text-portal-ink">{T.ratingTitulo}</p>
              <p className="text-sm leading-relaxed text-portal-ink2">
                {RATING_ESCALA_EXPLICACION}
              </p>
            </div>
          )}
          <div className="rounded-portal-sm bg-portal-surface p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-portal-muted">
              {T.queMiramos}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-portal-ink2">{T.queMiramosTexto}</p>
          </div>
        </div>
      )}
    </div>
  );
}
