import Link from "next/link";
import { Wallet, TrendingUp, Layers } from "lucide-react";

import { PButton } from "@/components/portales/ui/PButton";
import { PCard } from "@/components/portales/ui/PCard";
import { PPill } from "@/components/portales/ui/PPill";
import { PStat } from "@/components/portales/ui/PStat";
import { PTable, PTHead } from "@/components/portales/ui/PTable";
import { COPY } from "@/lib/copy";
import { toMoneda, toMonedaKpi, toDate } from "@/lib/formatters";
import { type PortalSlug } from "@/lib/portales/config";
import { TONO_RESERVA } from "@/lib/portales/constants";
import type { CarteraCliente as CarteraData } from "@/lib/portales/data";
import { basePortal } from "@/lib/portales/rutas";

/**
 * "Mi cartera" del inversionista: KPIs en soles (comprometido, ganancia esperada,
 * nº de operaciones) + calendario de cobros. Presentacional: la data llega resuelta
 * y server-authoritative (montos y ganancias calculados en el server). Los montos
 * SIEMPRE por lib/formatters.
 */
export function CarteraCliente({ portal, cartera }: { portal: PortalSlug; cartera: CarteraData }) {
  const T = COPY.portales.cliente.cartera;
  const E = COPY.portales.historial.estados;
  const base = basePortal(portal);

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-portal text-2xl font-extrabold tracking-tight text-portal-ink sm:text-3xl">
          {T.titulo}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-portal-muted">{T.sub}</p>
      </header>

      {cartera.numOperaciones === 0 ? (
        <div className="rounded-portal border border-dashed border-portal-line2 bg-portal-surface p-10 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-chip bg-portal-primary-soft text-portal-primary-ink">
            <Wallet className="size-6" aria-hidden />
          </span>
          <p className="mt-4 text-sm font-medium text-portal-muted">{T.vacio}</p>
          <PButton as="link" href={`${base}/cliente/oportunidades`} pill className="mt-5">
            {T.explorar}
          </PButton>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <PStat
              label={T.kpiComprometido}
              value={toMonedaKpi(cartera.totalComprometido, cartera.moneda)}
              sub={T.kpiComprometidoSub}
              tone="ink"
              title={toMoneda(cartera.totalComprometido, cartera.moneda)}
            />
            <PStat
              label={T.kpiGananciaEsperada}
              value={toMonedaKpi(cartera.gananciaEsperada, cartera.moneda)}
              sub={T.kpiGananciaEsperadaSub}
              tone="positive"
              title={toMoneda(cartera.gananciaEsperada, cartera.moneda)}
            />
            <PStat label={T.kpiOperaciones} value={String(cartera.numOperaciones)} tone="primary" />
          </div>
          {cartera.multiMoneda && (
            <p className="mt-2 text-xs font-medium text-portal-muted">
              {COPY.portales.multiMonedaNota(cartera.moneda)}
            </p>
          )}

          {/* Calendario de cobros */}
          <div className="mt-8">
            <div className="mb-3">
              <h2 className="flex items-center gap-2 font-portal text-lg font-bold text-portal-ink">
                <Layers className="size-5 text-portal-primary" aria-hidden />
                {T.calendarioTitulo}
              </h2>
              <p className="mt-0.5 text-sm text-portal-muted">{T.calendarioSub}</p>
            </div>

            <PCard className="p-0">
              <PTable>
                <PTHead>
                  <th className="px-5 py-3">{T.colOperacion}</th>
                  <th className="px-5 py-3 text-right">{T.colMonto}</th>
                  <th className="px-5 py-3 text-right">{T.colGanancia}</th>
                  <th className="px-5 py-3">{T.colCobro}</th>
                </PTHead>
                <tbody className="divide-y divide-portal-line">
                  {cartera.items.map((it) => (
                    <tr key={it.reservaId} className="align-middle hover:bg-portal-subtle/60">
                      <td className="px-5 py-3">
                        {/* Ruta propia ⇒ <Link>: un <a> recargaba la app entera
                            (se perdía el shell ya montado y el prefetch). */}
                        <Link
                          href={`${base}/cliente/oportunidades/${it.oportunidadId}`}
                          className="font-semibold text-portal-ink hover:underline"
                        >
                          {it.titulo}
                        </Link>
                        <span className="ml-2 align-middle">
                          <PPill tone={TONO_RESERVA[it.estado]}>{E[it.estado]}</PPill>
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums text-portal-ink">
                        {it.monto != null ? toMoneda(it.monto, it.moneda) : "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums text-portal-positive">
                        <span className="inline-flex items-center gap-1">
                          <TrendingUp className="size-3.5" aria-hidden />
                          {toMoneda(it.gananciaEstimada, it.moneda)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-portal-ink2">
                        {it.cobroAprox ? toDate(it.cobroAprox) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </PTable>
            </PCard>

            <p className="mt-3 text-xs leading-relaxed text-portal-muted">{T.notaEstimado}</p>
          </div>
        </>
      )}
    </div>
  );
}
