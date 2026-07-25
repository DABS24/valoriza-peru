"use client";

import { useMemo, useState } from "react";
import { Calculator, TrendingUp, Wallet, CalendarClock } from "lucide-react";

import { PCard } from "@/components/portales/ui/PCard";
import { COPY } from "@/lib/copy";
import { toMoneda, toDate } from "@/lib/formatters";
import { gananciaAlPlazo, pctTasa } from "@/lib/portales/tasas";
import type { PortalMoneda } from "@/lib/portales/config";

/** Suma `meses` meses a hoy y devuelve el ISO (para la fecha aprox de cobro). */
function fechaMasMeses(meses: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + meses);
  return d;
}

/** Redondea un monto a un paso "lindo" para el slider (múltiplos de 500). */
function pasoLindo(max: number): number {
  if (max >= 100000) return 5000;
  if (max >= 20000) return 1000;
  return 500;
}

/**
 * Simulador de inversión (client): el inversionista mueve el monto y ve al toque
 * cuánto ganaría AL PLAZO (interés simple), el total a recibir y la fecha
 * aproximada de cobro. Usa la ganancia REAL del período (no la anual) para no
 * inflar la expectativa. Si la operación no tiene tasa o plazo, no se puede
 * simular y se muestra un aviso. Mobile-first (slider + número sincronizados).
 */
export function SimuladorInversion({
  montoSolicitado,
  tasaMensual,
  plazoMeses,
  moneda,
  plazoTexto,
  esRango,
}: {
  montoSolicitado: number | null;
  tasaMensual: number | null;
  /** Meses base para el cálculo (el plazo más corto si hay rango). */
  plazoMeses: number | null;
  moneda: PortalMoneda;
  /** Texto legible del plazo ("2–4 meses" / "6 meses") para las notas. */
  plazoTexto: string | null;
  /** El plazo es un rango (para avisar que se usa el más corto). */
  esRango: boolean;
}) {
  const T = COPY.portales.cliente.simulador;

  // Techo del slider: lo solicitado (el inversionista no aporta más que el total),
  // con un fallback razonable. Piso: un paso, para no simular con 0.
  const max = montoSolicitado && montoSolicitado > 0 ? montoSolicitado : 50000;
  const step = pasoLindo(max);
  const min = Math.min(step, max);
  const inicial = Math.max(min, Math.round(max / 2 / step) * step);

  const [monto, setMonto] = useState<number>(inicial);

  const sim = useMemo(() => {
    if (tasaMensual == null || plazoMeses == null) return null;
    const g = gananciaAlPlazo(monto, tasaMensual, plazoMeses);
    return { ...g, cobro: fechaMasMeses(plazoMeses) };
  }, [monto, tasaMensual, plazoMeses]);

  return (
    <PCard>
      <h2 className="flex items-center gap-2 font-portal text-lg font-bold text-portal-ink">
        <Calculator className="size-5 text-portal-primary" aria-hidden />
        {T.titulo}
      </h2>
      <p className="mt-1 text-sm text-portal-muted">{T.sub}</p>

      {sim == null ? (
        <p className="mt-4 rounded-portal-sm bg-portal-subtle p-3 text-sm text-portal-muted">
          {T.sinTasa}
        </p>
      ) : (
        <div className="mt-4 space-y-5">
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="sim-monto" className="text-sm font-semibold text-portal-ink">
                {T.montoLabel}
              </label>
              <span className="font-portal text-lg font-bold tabular-nums text-portal-primary">
                {toMoneda(monto, moneda)}
              </span>
            </div>
            <input
              id="sim-monto"
              type="range"
              min={min}
              max={max}
              step={step}
              value={monto}
              onChange={(e) => setMonto(Number(e.target.value))}
              className="mt-3 w-full accent-portal-primary"
              aria-label={T.montoLabel}
            />
            <div className="mt-1 flex justify-between text-2xs font-medium tabular-nums text-portal-muted">
              <span>{toMoneda(min, moneda)}</span>
              <span>{toMoneda(max, moneda)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Resultado
              icon={<TrendingUp className="size-4" aria-hidden />}
              label={T.gananciaLabel}
              valor={toMoneda(sim.gananciaMonto, moneda)}
              sub={pctTasa(sim.gananciaPct) ?? undefined}
              tone="positive"
            />
            <Resultado
              icon={<Wallet className="size-4" aria-hidden />}
              label={T.totalLabel}
              valor={toMoneda(sim.total, moneda)}
              tone="ink"
            />
            <Resultado
              icon={<CalendarClock className="size-4" aria-hidden />}
              label={T.cobroLabel}
              valor={toDate(sim.cobro)}
              tone="ink"
            />
          </div>

          <p className="text-xs leading-relaxed text-portal-muted">
            {plazoTexto ? T.plazoNota(plazoTexto) : ""} {esRango ? T.rangoNota : ""}
          </p>
        </div>
      )}
    </PCard>
  );
}

function Resultado({
  icon,
  label,
  valor,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  valor: string;
  sub?: string;
  tone: "positive" | "ink";
}) {
  return (
    <div className="rounded-portal-sm border border-portal-line bg-portal-surface p-3.5">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-portal-muted">
        <span className={tone === "positive" ? "text-portal-positive" : "text-portal-primary"}>
          {icon}
        </span>
        {label}
      </p>
      <p
        className={`mt-1 font-portal text-lg font-bold tabular-nums ${
          tone === "positive" ? "text-portal-positive" : "text-portal-ink"
        }`}
      >
        {valor}
      </p>
      {sub && <p className="text-xs font-semibold text-portal-positive">+{sub}</p>}
    </div>
  );
}
