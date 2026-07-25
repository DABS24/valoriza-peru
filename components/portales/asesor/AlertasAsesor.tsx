"use client";

import { AlarmClock, CalendarClock, ArrowRight, ClipboardList, NotebookPen } from "lucide-react";

import { PButton } from "@/components/portales/ui/PButton";
import { PCard } from "@/components/portales/ui/PCard";
import { PPill } from "@/components/portales/ui/PPill";
import { PNota } from "@/components/portales/ui/PNota";
import { CuentaRegresiva } from "@/components/portales/CuentaRegresiva";
import {
  CabeceraPendiente,
  FilasRestantes,
  MAX_FILAS,
  useAhoraPorMinuto,
} from "@/components/portales/PanelPendientes";
import { COPY } from "@/lib/copy";
import { cn } from "@/lib/cn";
import { toMoneda, toDate } from "@/lib/formatters";
import { type PortalSlug } from "@/lib/portales/config";
import { reservaUrgente, hrefTitular } from "@/lib/portales/asesor";
import type { AlertasAsesor as AlertasData } from "@/lib/portales/data";
import { basePortal } from "@/lib/portales/rutas";

/**
 * Panel de PENDIENTES de la cartera del asesor (arriba del tablero). Cliente porque
 * la urgencia (<6h) y la cuenta regresiva son time-relative: se refrescan cada
 * minuto. La data llega ya acotada a su cartera (server, RLS staff). Si no hay nada,
 * un aviso tranquilo. Mobile-first: filas apiladas que reflowean en desktop, y cada
 * lista acotada a MAX_FILAS con el pie que declara cuántas quedaron fuera (es un
 * resumen de la cola, no la sección completa).
 *
 * Tres pendientes SUYOS (reservas por vencer, próximos cobros, sus recordatorios de
 * la libreta) y uno del EQUIPO: las solicitudes de financiamiento sin revisar. Esa
 * última se declara como tal, y el atajo para resolverlas solo se muestra a quien
 * puede entrar a esa sección (es de admin) — ocultar un link no es seguridad, la
 * barrera real la pone el guard de la ruta.
 */
export function AlertasAsesor({
  portal,
  alertas,
  puedeResolverSolicitudes = false,
}: {
  portal: PortalSlug;
  alertas: AlertasData;
  /** El usuario puede abrir la sección donde se resuelven las solicitudes (admin). */
  puedeResolverSolicitudes?: boolean;
}) {
  const T = COPY.portales.asesor.alertas;
  const base = basePortal(portal);

  const ahora = useAhoraPorMinuto();

  const { porVencer, proximosCobros, recordatorios, solicitudesSinRevisar } = alertas;

  if (
    porVencer.length === 0 &&
    proximosCobros.length === 0 &&
    recordatorios.length === 0 &&
    solicitudesSinRevisar === 0
  ) {
    return <PNota className="mb-8">{T.todoAlDia}</PNota>;
  }

  return (
    <section className="mb-8">
      <h2 className="mb-3 font-portal text-lg font-bold text-portal-ink">{T.titulo}</h2>

      {/* Solicitudes sin revisar — pendiente del equipo, ancho completo */}
      {solicitudesSinRevisar > 0 && (
        <PCard className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 p-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-chip bg-portal-warning-soft text-portal-warning">
              <ClipboardList className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="font-portal text-base font-bold text-portal-ink">
                {T.solicitudesTitulo}
              </h3>
              <p className="mt-0.5 text-xs text-portal-muted">{T.solicitudesSub}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <PPill tone="gold">{T.solicitudesConteo(solicitudesSinRevisar)}</PPill>
            {puedeResolverSolicitudes ? (
              <PButton
                as="link"
                href={`${base}/admin/solicitudes`}
                variant="ghost"
                size="sm"
                pill
                trailingIcon={<ArrowRight className="size-4" />}
              >
                {T.solicitudesRevisar}
              </PButton>
            ) : (
              <span className="text-xs text-portal-muted">{T.solicitudesSoloAdmin}</span>
            )}
          </div>
        </PCard>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Reservas por vencer */}
        <PCard className="flex flex-col p-0">
          <CabeceraPendiente
            icon={AlarmClock}
            tono="bg-portal-danger-soft text-portal-danger"
            titulo={T.porVencerTitulo}
            sub={T.porVencerSub}
          />
          {porVencer.length === 0 ? (
            <p className="p-5 text-sm text-portal-muted">{T.sinPorVencer}</p>
          ) : (
            <>
              <ul className="divide-y divide-portal-line">
                {porVencer.slice(0, MAX_FILAS).map((r) => {
                  const urgente = reservaUrgente(r.venceEn, ahora);
                  return (
                    <li
                      key={r.reservaId}
                      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-portal-ink">
                          {r.oportunidadTitulo}
                        </p>
                        <p className="truncate text-xs text-portal-muted">{r.clienteNombre}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5 text-sm">
                          {urgente && (
                            <PPill tone="alert" className="px-2 py-0.5">
                              {T.urge}
                            </PPill>
                          )}
                          <CuentaRegresiva
                            hasta={r.venceEn}
                            className={cn(
                              "text-sm font-medium",
                              urgente && "font-bold text-portal-danger",
                            )}
                          />
                        </span>
                        <PButton
                          as="link"
                          href={`${base}/asesor/reservas`}
                          variant="ghost"
                          size="sm"
                          pill
                          trailingIcon={<ArrowRight className="size-4" />}
                        >
                          {T.revisar}
                        </PButton>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <FilasRestantes total={porVencer.length} />
            </>
          )}
        </PCard>

        {/* Próximos cobros */}
        <PCard className="flex flex-col p-0">
          <CabeceraPendiente
            icon={CalendarClock}
            tono="bg-portal-primary-soft text-portal-primary-ink"
            titulo={T.cobrosTitulo}
            sub={T.cobrosSub}
          />
          {proximosCobros.length === 0 ? (
            <p className="p-5 text-sm text-portal-muted">{T.sinCobros}</p>
          ) : (
            <>
              <ul className="divide-y divide-portal-line">
                {proximosCobros.slice(0, MAX_FILAS).map((c) => (
                  <li
                    key={c.reservaId}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 p-5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-portal-ink">
                        {c.oportunidadTitulo}
                      </p>
                      <p className="truncate text-xs text-portal-muted">{c.clienteNombre}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold tabular-nums text-portal-positive">
                        {toMoneda(c.montoEstimado, c.moneda)}
                      </p>
                      <p className="text-xs text-portal-muted">
                        {T.colCobro} {toDate(c.cobroAprox)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <FilasRestantes total={proximosCobros.length} />
              <p className="px-5 pb-5 pt-3 text-xs text-portal-muted">{T.notaCobros}</p>
            </>
          )}
        </PCard>

        {/* Recordatorios propios de la libreta (Mejora: la nota con próxima acción cobra) */}
        {recordatorios.length > 0 && (
          <PCard className="flex flex-col p-0 lg:col-span-2">
            <CabeceraPendiente
              icon={NotebookPen}
              tono="bg-portal-primary-soft text-portal-primary-ink"
              titulo={T.recordatoriosTitulo}
              sub={T.recordatoriosSub}
            />
            <ul className="divide-y divide-portal-line">
              {recordatorios.slice(0, MAX_FILAS).map((n) => {
                // La nota puede ser sobre un prospecto: su ficha vive en otra ruta.
                const href = hrefTitular(base, n.titular);
                return (
                  <li
                    key={n.notaId}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-portal-ink">{n.clienteNombre}</p>
                      <p className="line-clamp-2 break-words text-xs text-portal-muted">
                        {n.texto}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <PPill tone="alert">{T.recordatorioPara(toDate(n.recordarEn))}</PPill>
                      {href && (
                        <PButton
                          as="link"
                          href={href}
                          variant="ghost"
                          size="sm"
                          pill
                          trailingIcon={<ArrowRight className="size-4" />}
                        >
                          {T.verCliente}
                        </PButton>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <FilasRestantes total={recordatorios.length} />
          </PCard>
        )}
      </div>
    </section>
  );
}
