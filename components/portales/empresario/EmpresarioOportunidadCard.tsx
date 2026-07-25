import { MapPin } from "lucide-react";

import { cn } from "@/lib/cn";
import { PCard } from "@/components/portales/ui/PCard";
import { PPill } from "@/components/portales/ui/PPill";
import { COPY } from "@/lib/copy";
import { toMoneda, toMonedaKpi } from "@/lib/formatters";
import { estadoPublicacion } from "@/lib/portales/constants";
import { costoEmpresario, pctTasa } from "@/lib/portales/tasas";
import { ubicacionSubtitulo, plazoTexto } from "@/lib/portales/oportunidadResumen";
import { CronogramaEmpresario } from "@/components/portales/empresario/CronogramaEmpresario";
import { TimelineEmpresario } from "@/components/portales/empresario/TimelineEmpresario";
import type { OportunidadEmpresario } from "@/lib/portales/data";

/**
 * Card de una operación para el EMPRESARIO (prestatario). Muestra SU número: cuánto
 * solicita, cuánto RECIBE (tras la comisión que se descuenta) y cuánto le CUESTA en
 * total, más el detalle del repago (cuotas de interés + capital al final). NUNCA el
 * framing del inversionista (TEA/rentabilidad), ni scoring, ni nivel de riesgo, ni
 * quién es el inversionista. Reusa `ubicacionSubtitulo` para los datos factuales.
 */
export function EmpresarioOportunidadCard({ op }: { op: OportunidadEmpresario }) {
  const E = COPY.portales.empresario.card;
  const est = estadoPublicacion(op.estadoPublicacion);
  const { ubicacion, subtitulo } = ubicacionSubtitulo(op.distrito, op.ciudad, op.datos);

  // Plazo usado para el costo: el más LARGO del rango. En bullet, más meses = más
  // interés, así el "Costo total" que se muestra es el TECHO, no el piso (mostrar el
  // número más barato como principal sería engañoso para el prestatario).
  const meses = op.plazoMesesMax ?? op.plazoMesesMin;
  const c = costoEmpresario(op.montoSolicitado, op.comisionPct, op.tasaMensual, meses);
  const tieneMonto = op.montoSolicitado != null && op.montoSolicitado > 0;
  // La comisión define cuánto recibe y parte de cuánto cuesta. Si aún no se fija, NO
  // asumir 0 (mostraría "recibes el 100%" y un costo incompleto): decir "por definir".
  const comisionDefinida = op.comisionPct != null;

  const solicita = tieneMonto ? toMonedaKpi(c.monto, op.moneda) : E.sinDatos;
  const recibe = tieneMonto && comisionDefinida ? toMonedaKpi(c.recibeNeto, op.moneda) : E.sinDatos;
  const costo =
    tieneMonto && comisionDefinida && c.costoTotal > 0 ? toMonedaKpi(c.costoTotal, op.moneda) : E.sinDatos;

  const stats = [
    { label: E.solicitas, value: solicita, positive: false },
    { label: E.recibes, value: recibe, positive: true },
    { label: E.costoTotal, value: costo, positive: false },
  ];

  const comisionPct = pctTasa(op.comisionPct);
  const plazo = plazoTexto(op.plazoMesesMin, op.plazoMesesMax, COPY.portales.cliente.labels.plazoMeses);
  const cuota = pctTasa(op.tasaMensual);

  return (
    <PCard className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {ubicacion && (
            <p className="flex items-center gap-1 text-xs font-medium text-portal-muted">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{ubicacion}</span>
            </p>
          )}
          <h3 className="mt-1 font-portal text-base font-bold leading-snug text-portal-ink line-clamp-2">
            {op.titulo}
          </h3>
        </div>
        <PPill tone={est.tono} className="shrink-0">
          {est.label}
        </PPill>
      </div>

      {subtitulo && <p className="mt-1 truncate text-sm text-portal-ink2">{subtitulo}</p>}

      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-portal-line pt-4">
        {stats.map((s) => (
          <div key={s.label} className="min-w-0">
            <dt className="truncate text-[10px] font-bold uppercase tracking-wider text-portal-muted">
              {s.label}
            </dt>
            <dd
              className={cn(
                "mt-0.5 truncate font-portal text-sm font-bold tabular-nums",
                s.positive ? "text-portal-positive" : "text-portal-ink",
              )}
              title={s.value}
            >
              {s.value}
            </dd>
          </div>
        ))}
      </dl>

      {/* Comisión (SU dato) + detalle del repago */}
      <div className="mt-3 space-y-1.5 text-xs text-portal-ink2">
        {tieneMonto && comisionPct && (
          <p>
            <span className="font-semibold text-portal-ink">{E.comision}:</span>{" "}
            {E.comisionDetalle(comisionPct, toMoneda(c.comisionMonto, op.moneda))}{" "}
            <span className="text-portal-muted">{E.comisionNota}</span>
          </p>
        )}
        {tieneMonto && meses != null && cuota && (
          <p>
            <span className="font-semibold text-portal-ink">{E.devuelvesTitulo}:</span>{" "}
            {E.cuotasInteres(meses, toMoneda(c.cuotaMensualInteres, op.moneda))}{" "}
            {E.capitalAlFinal(toMoneda(c.capitalAlFinal, op.moneda))}
          </p>
        )}
        {(cuota || plazo) && (
          <p className="text-portal-muted">
            {cuota && `${E.interesMensual} ${cuota}`}
            {cuota && plazo && " · "}
            {plazo && `${E.plazo} ${plazo}`}
          </p>
        )}
      </div>

      {/* Estado de la operación (timeline compacto, derivado del estado) */}
      <TimelineEmpresario estado={op.estadoPublicacion} financiadaEn={op.financiadaEn} />

      {/* Cronograma tentativo (simulación) — detrás de un toggle para no alargar la card */}
      <CronogramaEmpresario
        monto={op.montoSolicitado}
        tasaMensual={op.tasaMensual}
        meses={meses}
        moneda={op.moneda}
        rango={op.plazoMesesMin != null && op.plazoMesesMax != null && op.plazoMesesMin !== op.plazoMesesMax}
      />
    </PCard>
  );
}
