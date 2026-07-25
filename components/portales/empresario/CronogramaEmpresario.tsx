"use client";

import { useMemo, useState } from "react";
import { CalendarClock, ChevronDown } from "lucide-react";

import { cn } from "@/lib/cn";
import { PTable, PTHead } from "@/components/portales/ui/PTable";
import { COPY } from "@/lib/copy";
import { toMoneda, toDate } from "@/lib/formatters";
import { cronogramaEmpresario } from "@/lib/portales/tasas";
import type { PortalMoneda } from "@/lib/portales/config";

/**
 * Cronograma TENTATIVO del repago (simulación) para el EMPRESARIO. Esquema bullet:
 * `meses` cuotas de solo interés y el capital al final. Va detrás de un toggle para
 * no alargar la card. SIEMPRE etiquetado como simulación: el cronograma real se fija
 * al desembolso. Las fechas se calculan una sola vez (useMemo con "hoy" como base).
 */
export function CronogramaEmpresario({
  monto,
  tasaMensual,
  meses,
  moneda,
  rango = false,
}: {
  monto: number | null;
  tasaMensual: number | null;
  meses: number | null;
  moneda: PortalMoneda;
  /** El plazo era un rango (min≠max): se avisa que se usó el más corto. */
  rango?: boolean;
}) {
  const C = COPY.portales.empresario.cronograma;
  const [abierto, setAbierto] = useState(false);

  // Base "hoy" fija por montaje: el cronograma es tentativo, no debe recalcular en cada render.
  const filas = useMemo(
    () => cronogramaEmpresario(monto, tasaMensual, meses),
    [monto, tasaMensual, meses],
  );

  if (filas.length === 0) return null;

  const totalInteres = filas.reduce((s, f) => s + f.interes, 0);
  const totalDevolver = filas.reduce((s, f) => s + f.total, 0);

  return (
    <div className="mt-3 border-t border-portal-line pt-3">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center justify-between gap-2 text-sm font-semibold text-portal-primary"
      >
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="size-4 shrink-0" aria-hidden />
          {abierto ? C.ocultar : C.ver}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 transition-transform", abierto && "rotate-180")}
          aria-hidden
        />
      </button>

      {abierto && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-medium text-portal-muted">{C.simulacion}</p>
          <PTable wrapperClassName="rounded-portal-sm border border-portal-line">
            <PTHead>
              <th className="px-3 py-2">{C.colCuota}</th>
              <th className="px-3 py-2">{C.colFecha}</th>
              <th className="px-3 py-2 text-right">{C.colInteres}</th>
              <th className="px-3 py-2 text-right">{C.colCapital}</th>
              <th className="px-3 py-2 text-right">{C.colTotal}</th>
            </PTHead>
            <tbody className="divide-y divide-portal-line">
              {filas.map((f) => (
                <tr key={f.numero} className="align-middle">
                  <td className="px-3 py-2 font-semibold text-portal-ink">{f.numero}</td>
                  <td className="px-3 py-2 text-portal-ink2">{toDate(f.fechaISO)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-portal-ink2">
                    {toMoneda(f.interes, moneda)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-portal-ink2">
                    {f.capital > 0 ? toMoneda(f.capital, moneda) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-portal-ink">
                    {toMoneda(f.total, moneda)}
                  </td>
                </tr>
              ))}
            </tbody>
          </PTable>

          <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-portal-sm bg-portal-subtle px-3 py-2">
              <dt className="text-xs font-semibold uppercase tracking-wider text-portal-muted">
                {C.totalInteres}
              </dt>
              <dd className="font-portal text-sm font-bold tabular-nums text-portal-ink">
                {toMoneda(totalInteres, moneda)}
              </dd>
            </div>
            <div className="flex items-center justify-between rounded-portal-sm bg-portal-subtle px-3 py-2">
              <dt className="text-xs font-semibold uppercase tracking-wider text-portal-muted">
                {C.totalDevolver}
              </dt>
              <dd className="font-portal text-sm font-bold tabular-nums text-portal-ink">
                {toMoneda(totalDevolver, moneda)}
              </dd>
            </div>
          </dl>

          {rango && <p className="mt-2 text-xs text-portal-muted">{C.rangoNota}</p>}
        </div>
      )}
    </div>
  );
}
