"use client";

import { Info } from "lucide-react";

import { PStat } from "@/components/portales/ui/PStat";
import { COPY } from "@/lib/copy";
import { toMoneda, toMonedaKpi } from "@/lib/formatters";
import { costoEmpresario, pctTasa, type ReferenciaEmpresario } from "@/lib/portales/tasas";
import { CronogramaEmpresario } from "@/components/portales/empresario/CronogramaEmpresario";
import type { PortalMoneda } from "@/lib/portales/config";

/**
 * Resultado de la PRE-CALIFICACIÓN del empresario: con un monto y un plazo, cuánto
 * RECIBE (neto de comisión), cuánto DEVUELVE y cuánto le CUESTA. Solo pinta: la
 * fórmula vive en `costoEmpresario` (esquema bullet, único lugar del cálculo) y los
 * parámetros de referencia los resuelve el server desde SUS operaciones.
 *
 * HONESTIDAD DE NÚMEROS (es dinero, no una landing):
 *   · Un parámetro que el staff todavía no fijó se muestra "Por definir", NUNCA 0
 *     —asumir 0 diría que recibe el 100 % del monto y que la operación no cuesta—.
 *   · "Recibes" necesita la comisión; "Devuelves" necesita el interés; el costo
 *     total necesita ambos. Cada KPI se apaga por separado según lo que falte.
 *   · Siempre etiquetado como estimación referencial: no es oferta ni aprobación.
 */
export function SimuladorEmpresario({
  monto,
  plazoMeses,
  moneda,
  referencia,
}: {
  monto: number | null;
  plazoMeses: number | null;
  moneda: PortalMoneda;
  referencia: ReferenciaEmpresario;
}) {
  const S = COPY.portales.empresario.simulador;

  const tieneEntrada = monto != null && monto > 0 && plazoMeses != null && plazoMeses > 0;
  const c = costoEmpresario(monto, referencia.comisionPct, referencia.tasaMensual, plazoMeses);

  const hayComision = referencia.comisionPct != null;
  const hayTasa = referencia.tasaMensual != null;
  const faltaAlgo = !hayComision || !hayTasa;

  if (!tieneEntrada) {
    return <p className="text-sm text-portal-muted">{S.faltaMonto}</p>;
  }

  const recibe = hayComision ? toMonedaKpi(c.recibeNeto, moneda) : S.sinDatos;
  const devuelve = hayTasa ? toMonedaKpi(c.interesTotal + c.capitalAlFinal, moneda) : S.sinDatos;
  const costo = hayComision && hayTasa ? toMonedaKpi(c.costoTotal, moneda) : S.sinDatos;

  const comisionPct = pctTasa(referencia.comisionPct);
  const interesPct = pctTasa(referencia.tasaMensual);

  const filas = [
    {
      label: S.comisionLabel,
      value: hayComision
        ? [comisionPct, `−${toMoneda(c.comisionMonto, moneda)}`].filter(Boolean).join(" · ")
        : S.sinDatos,
    },
    { label: S.interesLabel, value: hayTasa ? (interesPct ?? S.sinDatos) : S.sinDatos },
    {
      label: S.cuotaLabel,
      value: hayTasa ? toMoneda(c.cuotaMensualInteres, moneda) : S.sinDatos,
    },
    { label: S.capitalLabel, value: toMoneda(c.capitalAlFinal, moneda) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <PStat label={S.recibes} value={recibe} sub={S.recibesSub} tone="positive" />
        <PStat label={S.devuelves} value={devuelve} sub={S.devuelvesSub} tone="ink" />
        <PStat label={S.costoTotal} value={costo} sub={S.costoTotalSub} tone="ink" />
      </div>

      <div className="rounded-portal-sm border border-portal-line">
        <p className="border-b border-portal-line px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-portal-muted">
          {S.detalleTitulo}
        </p>
        <dl className="divide-y divide-portal-line">
          {filas.map((f) => (
            <div
              key={f.label}
              className="flex flex-wrap items-baseline justify-between gap-2 px-3.5 py-2.5"
            >
              <dt className="text-sm text-portal-ink2">{f.label}</dt>
              <dd className="font-portal text-sm font-bold tabular-nums text-portal-ink">
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Cronograma tentativo del repago (se apaga solo si falta el interés). */}
      {hayTasa && (
        <CronogramaEmpresario
          monto={monto}
          tasaMensual={referencia.tasaMensual}
          meses={plazoMeses}
          moneda={moneda}
        />
      )}

      {faltaAlgo && (
        <div className="rounded-portal-sm bg-portal-subtle px-3.5 py-3">
          <p className="font-portal text-sm font-bold text-portal-ink">{S.porDefinirTitulo}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-portal-ink2">{S.porDefinirTexto}</p>
        </div>
      )}

      {referencia.basadaEnOps > 0 && (
        <p className="text-xs text-portal-muted">{S.referencia(referencia.basadaEnOps)}</p>
      )}

      <p className="flex items-start gap-2 text-xs leading-relaxed text-portal-muted">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>{S.disclaimer}</span>
      </p>
    </div>
  );
}
