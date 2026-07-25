"use client";

import { AlarmClock, ArrowRight, ClipboardList, FileWarning, PenLine, UserX } from "lucide-react";

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
import { toDate } from "@/lib/formatters";
import { type PortalSlug } from "@/lib/portales/config";
import { reservaUrgente } from "@/lib/portales/asesor";
import type { AlertasAdmin as AlertasData } from "@/lib/portales/data";
import { basePortal } from "@/lib/portales/rutas";

/**
 * Cola de trabajo del ADMIN (arriba del tablero). Espejo de AlertasAsesor pero con
 * SU alcance: lo que solo él resuelve. Antes su inicio era un tablero de conteos sin
 * un solo pendiente — y las solicitudes que únicamente él puede resolver aparecían
 * en el panel del ASESOR, que no puede resolverlas.
 *
 * Cliente porque la urgencia (<6 h) y la cuenta regresiva son time-relative y se
 * refrescan cada minuto. La data llega ya resuelta y autorizada desde el server.
 * Mobile-first: filas apiladas que reflowean en desktop, listas acotadas a MAX_FILAS
 * con el pie que declara cuántas quedaron fuera (nunca truncar en silencio).
 */
export function AlertasAdmin({ portal, alertas }: { portal: PortalSlug; alertas: AlertasData }) {
  const T = COPY.portales.admin.pendientes;
  const base = basePortal(portal);

  const ahora = useAhoraPorMinuto();

  const {
    solicitudesSinRevisar,
    reservasPorVencer,
    reservasSinAsesor,
    publicadasIncompletas,
    borradoresOlvidados,
    clientesSinAsesor,
  } = alertas;

  const nadaPendiente =
    solicitudesSinRevisar === 0 &&
    reservasPorVencer.length === 0 &&
    publicadasIncompletas.length === 0 &&
    borradoresOlvidados.length === 0 &&
    clientesSinAsesor.length === 0;

  if (nadaPendiente) return <PNota className="mb-8">{T.todoAlDia}</PNota>;

  return (
    <section className="mb-8">
      <h2 className="mb-3 font-portal text-lg font-bold text-portal-ink">{T.titulo}</h2>

      {/* Solicitudes sin responder — lo único que SOLO el admin desbloquea */}
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
            <PButton
              as="link"
              href={`${base}/admin/solicitudes`}
              variant="ghost"
              size="sm"
              pill
              trailingIcon={<ArrowRight className="size-4" />}
            >
              {T.ver}
            </PButton>
          </div>
        </PCard>
      )}

      {/* Salud del catálogo — operaciones que el inversionista YA está viendo incompletas */}
      {publicadasIncompletas.length > 0 && (
        <PCard className="mb-4 flex flex-col p-0">
          <CabeceraPendiente
            icon={FileWarning}
            tono="bg-portal-danger-soft text-portal-danger"
            titulo={T.catalogoTitulo}
            sub={T.catalogoSub}
            extra={<PPill tone="alert">{publicadasIncompletas.length}</PPill>}
          />
          <ul className="divide-y divide-portal-line">
            {publicadasIncompletas.slice(0, MAX_FILAS).map((op) => (
              <li
                key={op.id}
                className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 p-5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-portal-ink">{op.titulo}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {op.faltantes.map((f) => (
                      <PPill key={f} tone="alert" className="px-2 py-0.5">
                        {T.falta[f]}
                      </PPill>
                    ))}
                  </div>
                </div>
                <PButton
                  as="link"
                  href={`${base}/admin/oportunidades/${op.id}`}
                  variant="ghost"
                  size="sm"
                  pill
                  trailingIcon={<ArrowRight className="size-4" />}
                >
                  {T.completar}
                </PButton>
              </li>
            ))}
          </ul>
          <FilasRestantes total={publicadasIncompletas.length} />
        </PCard>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Reservas activas de TODO el portal (el asesor solo ve las suyas) */}
        <PCard className="flex flex-col p-0">
          <CabeceraPendiente
            icon={AlarmClock}
            tono="bg-portal-primary-soft text-portal-primary-ink"
            titulo={T.reservasTitulo}
            sub={T.reservasSub}
            extra={
              reservasSinAsesor > 0 ? (
                <PPill tone="alert">{T.reservasSinAsesor(reservasSinAsesor)}</PPill>
              ) : undefined
            }
          />
          {reservasPorVencer.length === 0 ? (
            <p className="p-5 text-sm text-portal-muted">{T.reservasVacio}</p>
          ) : (
            <>
              <ul className="divide-y divide-portal-line">
                {reservasPorVencer.slice(0, MAX_FILAS).map((r) => {
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
                      <CuentaRegresiva
                        hasta={r.venceEn}
                        className={cn(
                          "text-sm font-medium",
                          urgente && "font-bold text-portal-danger",
                        )}
                      />
                    </li>
                  );
                })}
              </ul>
              <FilasRestantes total={reservasPorVencer.length} />
            </>
          )}
        </PCard>

        {/* Inversionistas sin asesor */}
        <PCard className="flex flex-col p-0">
          <CabeceraPendiente
            icon={UserX}
            tono="bg-portal-danger-soft text-portal-danger"
            titulo={T.clientesTitulo}
            sub={T.clientesSub}
          />
          {clientesSinAsesor.length === 0 ? (
            <p className="p-5 text-sm text-portal-muted">{T.clientesVacio}</p>
          ) : (
            <>
              <ul className="divide-y divide-portal-line">
                {clientesSinAsesor.slice(0, MAX_FILAS).map((c) => (
                  <li
                    key={c.userId}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 p-5"
                  >
                    <p className="min-w-0 flex-1 truncate font-semibold text-portal-ink">
                      {c.nombre}
                    </p>
                    <p className="text-xs text-portal-muted">{T.desde(toDate(c.createdAt))}</p>
                  </li>
                ))}
              </ul>
              <FilasRestantes total={clientesSinAsesor.length} />
              <div className="px-5 pb-5 pt-3">
                <PButton
                  as="link"
                  href={`${base}/admin/usuarios`}
                  variant="ghost"
                  size="sm"
                  pill
                  trailingIcon={<ArrowRight className="size-4" />}
                >
                  {T.asignar}
                </PButton>
              </div>
            </>
          )}
        </PCard>

        {/* Borradores olvidados */}
        {borradoresOlvidados.length > 0 && (
          <PCard className="flex flex-col p-0 lg:col-span-2">
            <CabeceraPendiente
              icon={PenLine}
              tono="bg-portal-subtle text-portal-ink2"
              titulo={T.borradoresTitulo}
              sub={T.borradoresSub}
            />
            <ul className="divide-y divide-portal-line">
              {borradoresOlvidados.slice(0, MAX_FILAS).map((b) => (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-5"
                >
                  <p className="min-w-0 flex-1 truncate font-semibold text-portal-ink">{b.titulo}</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <PPill tone="neutral">{T.diasQuieto(b.dias)}</PPill>
                    <PButton
                      as="link"
                      href={`${base}/admin/oportunidades/${b.id}`}
                      variant="ghost"
                      size="sm"
                      pill
                      trailingIcon={<ArrowRight className="size-4" />}
                    >
                      {T.ver}
                    </PButton>
                  </div>
                </li>
              ))}
            </ul>
            <FilasRestantes total={borradoresOlvidados.length} />
          </PCard>
        )}
      </div>
    </section>
  );
}
