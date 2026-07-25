import { ArrowRight, Wallet, TrendingUp, Layers, Phone } from "lucide-react";

import { PButton } from "@/components/portales/ui/PButton";
import { PCard } from "@/components/portales/ui/PCard";
import { PPill } from "@/components/portales/ui/PPill";
import { PStat } from "@/components/portales/ui/PStat";
import { TimelineReserva } from "@/components/portales/TimelineReserva";
import { ContactoCliente } from "@/components/portales/asesor/ContactoCliente";
import { NotasCliente } from "@/components/portales/asesor/NotasCliente";
import { COPY } from "@/lib/copy";
import { toMoneda, toMonedaKpi, toDate } from "@/lib/formatters";
import { type PortalSlug } from "@/lib/portales/config";
import { timelineDeReserva } from "@/lib/portales/asesor";
import { TONO_RESERVA } from "@/lib/portales/constants";
import type { ClienteFicha } from "@/lib/portales/data";
import { basePortal } from "@/lib/portales/rutas";

/**
 * Ficha 360 de un cliente de la cartera del asesor (tracking). Presentacional: la
 * data llega YA autorizada (la página solo la abre si el cliente es suyo) y
 * server-authoritative (montos y ganancias calculados en el server). Mobile-first:
 * KPIs y reservas reflowean en columna en móvil. Los montos SIEMPRE por formatters.
 */
export function FichaCliente({ portal, ficha }: { portal: PortalSlug; ficha: ClienteFicha }) {
  const T = COPY.portales.asesor.ficha;
  const E = COPY.portales.historial.estados;
  const base = basePortal(portal);
  const { cliente } = ficha;

  return (
    <div>
      <PButton as="link" href={`${base}/asesor/clientes`} variant="ghost" size="sm" pill className="mb-5">
        {T.volver}
      </PButton>

      <header className="mb-6">
        <h1 className="font-portal text-2xl font-extrabold tracking-tight text-portal-ink sm:text-3xl">
          {cliente.nombre}
        </h1>
        <p className="mt-1 text-sm text-portal-muted">{T.desde(toDate(cliente.createdAt))}</p>
      </header>

      {/* Contacto */}
      <PCard className="mb-6">
        <h2 className="font-portal text-sm font-bold uppercase tracking-wider text-portal-muted">
          {T.contactoTitulo}
        </h2>
        <p className="mt-2 flex items-center gap-2 text-sm text-portal-ink">
          <Phone className="size-4 shrink-0 text-portal-muted" aria-hidden />
          {cliente.telefono ? (
            <span className="tabular-nums">{cliente.telefono}</span>
          ) : (
            <span className="text-portal-muted">{T.sinTelefono}</span>
          )}
        </p>
        <ContactoCliente nombre={cliente.nombre} telefono={cliente.telefono} className="mt-3" />
      </PCard>

      {/* KPIs de la cartera del cliente */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <PStat
          label={T.kpiComprometido}
          value={toMonedaKpi(ficha.totalComprometido, ficha.moneda)}
          sub={T.kpiComprometidoSub}
          tone="ink"
          title={toMoneda(ficha.totalComprometido, ficha.moneda)}
        />
        <PStat
          label={T.kpiGanancia}
          value={toMonedaKpi(ficha.gananciaEsperada, ficha.moneda)}
          sub={T.kpiGananciaSub}
          tone="positive"
          title={toMoneda(ficha.gananciaEsperada, ficha.moneda)}
        />
        <PStat label={T.kpiOperaciones} value={String(ficha.numReservas)} tone="primary" />
      </div>
      {ficha.multiMoneda && (
        <p className="mt-2 text-xs font-medium text-portal-muted">
          {COPY.portales.multiMonedaNota(ficha.moneda)}
        </p>
      )}

      {/* Reservas del cliente */}
      <div className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 font-portal text-lg font-bold text-portal-ink">
          <Layers className="size-5 text-portal-primary" aria-hidden />
          {T.reservasTitulo}
        </h2>

        {ficha.reservas.length === 0 ? (
          <div className="rounded-portal border border-dashed border-portal-line2 bg-portal-surface p-10 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-chip bg-portal-primary-soft text-portal-primary-ink">
              <Wallet className="size-6" aria-hidden />
            </span>
            <p className="mt-4 text-sm font-medium text-portal-muted">{T.sinReservas}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {ficha.reservas.map((r) => {
              const tl = timelineDeReserva(r.estado, r.financiadaEn);
              const mostrarTimeline =
                r.estado === "activa" || r.estado === "confirmada" || r.financiadaEn != null;
              return (
                <PCard key={r.reservaId} className="flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="min-w-0 font-portal text-base font-bold text-portal-ink line-clamp-2">
                      {r.titulo}
                    </h3>
                    <PPill tone={TONO_RESERVA[r.estado]} className="shrink-0">
                      {E[r.estado]}
                    </PPill>
                  </div>

                  <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <div>
                      <dt className="text-xs text-portal-muted">{T.colMonto}</dt>
                      <dd className="font-semibold tabular-nums text-portal-ink">
                        {r.monto != null ? toMoneda(r.monto, r.moneda) : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-portal-muted">{T.colGanancia}</dt>
                      <dd className="flex items-center gap-1 font-semibold tabular-nums text-portal-positive">
                        <TrendingUp className="size-3.5" aria-hidden />
                        {toMoneda(r.gananciaEstimada, r.moneda)}
                      </dd>
                    </div>
                  </dl>

                  {mostrarTimeline && (
                    <div className="mt-4 border-t border-portal-line pt-4">
                      <TimelineReserva estado={tl} compacto />
                    </div>
                  )}

                  <PButton
                    as="link"
                    href={`${base}/asesor/reservas`}
                    variant="ghost"
                    size="sm"
                    pill
                    className="mt-4 self-start"
                    trailingIcon={<ArrowRight className="size-4" />}
                  >
                    {COPY.portales.asesor.reservas.titulo}
                  </PButton>
                </PCard>
              );
            })}
          </div>
        )}

        <p className="mt-4 text-xs text-portal-muted">{T.notaEstimado}</p>
      </div>

      {/* Libreta interna del asesor sobre este cliente (nunca la ve el inversionista) */}
      <NotasCliente
        sujeto={{ tipo: "cliente", id: cliente.userId }}
        notas={ficha.notas}
      />
    </div>
  );
}
