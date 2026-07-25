import Link from "next/link";

import { PCard } from "@/components/portales/ui/PCard";
import { PPill } from "@/components/portales/ui/PPill";
import { PTable, PTHead } from "@/components/portales/ui/PTable";
import { ContactoCliente } from "@/components/portales/asesor/ContactoCliente";
import { COPY } from "@/lib/copy";
import { toDate, toMoneda, toMonedaKpi } from "@/lib/formatters";
import { type PortalSlug } from "@/lib/portales/config";
import type { ClienteEnriquecido, ProspectoEnriquecido } from "@/lib/portales/data";
import { basePortal } from "@/lib/portales/rutas";

/**
 * Cartera del asesor ENRIQUECIDA: nº de operaciones, monto comprometido y última
 * actividad, ya ordenada por actividad más reciente. Presentacional: la data llega
 * resuelta y acotada (asesor_id = él, RLS staff). El nombre abre la ficha 360 (solo
 * si es suyo; la página lo re-verifica). Montos SIEMPRE por formatters.
 *
 * Van DOS tablas, no una mezclada: los que tienen cuenta y los que todavía no
 * (0090). Mezclarlos escondería la única diferencia que importa para el trabajo
 * del asesor —a quién le falta la cuenta— y sus fichas viven en rutas distintas.
 */
export function MisClientes({
  portal,
  clientes,
  prospectos = [],
}: {
  portal: PortalSlug;
  clientes: ClienteEnriquecido[];
  /** Titulares sin cuenta de su cartera. */
  prospectos?: ProspectoEnriquecido[];
}) {
  const T = COPY.portales.asesor;
  const P = COPY.portales.asesor.prospectos;
  const base = basePortal(portal);

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-portal text-2xl font-extrabold tracking-tight text-portal-ink sm:text-3xl">
          {T.clientesPageTitulo}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-portal-muted">{T.clientesPageSub}</p>
      </header>

      {clientes.length === 0 ? (
        <div className="rounded-portal border border-dashed border-portal-line2 bg-portal-surface p-10 text-center">
          <p className="text-sm font-medium text-portal-muted">{T.sinClientes}</p>
        </div>
      ) : (
        <PCard className="p-0">
          <PTable>
            <PTHead>
              <th className="px-5 py-3">{T.colNombre}</th>
              <th className="px-5 py-3 text-right">{T.colOperaciones}</th>
              <th className="px-5 py-3 text-right">{T.colComprometido}</th>
              <th className="px-5 py-3">{T.colUltimaActividad}</th>
              <th className="px-5 py-3 text-right">{T.colContacto}</th>
            </PTHead>
            <tbody className="divide-y divide-portal-line">
              {clientes.map((c) => (
                <tr key={c.userId} className="align-middle hover:bg-portal-subtle/60">
                  <td className="px-5 py-3">
                    {/* Ruta propia ⇒ <Link>: un <a> recargaba la app entera
                        (se perdía el shell ya montado y el prefetch). */}
                    <Link
                      href={`${base}/asesor/clientes/${c.userId}`}
                      className="font-semibold text-portal-ink hover:underline"
                    >
                      {c.nombre}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-portal-ink2">
                    {c.numReservas}
                  </td>
                  <td
                    className="px-5 py-3 text-right font-semibold tabular-nums text-portal-ink"
                    title={
                      c.multiMoneda
                        ? COPY.portales.multiMonedaNota(c.moneda)
                        : toMoneda(c.montoComprometido, c.moneda)
                    }
                  >
                    {c.montoComprometido > 0 ? toMonedaKpi(c.montoComprometido, c.moneda) : "—"}
                    {c.multiMoneda && <span className="text-portal-muted"> *</span>}
                  </td>
                  <td className="px-5 py-3 text-portal-muted">
                    {c.ultimaActividad ? toDate(c.ultimaActividad) : T.sinActividad}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end">
                      <ContactoCliente nombre={c.nombre} telefono={c.telefono} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </PTable>
        </PCard>
      )}

      {/* Titulares SIN cuenta: la cuenta se crea recién cuando ya operaron. */}
      <section className="mt-10">
        <h2 className="font-portal text-lg font-bold text-portal-ink">{P.titulo}</h2>
        <p className="mt-1 max-w-2xl text-sm text-portal-muted">{P.sub}</p>

        {prospectos.length === 0 ? (
          <div className="mt-4 rounded-portal border border-dashed border-portal-line2 bg-portal-surface p-8 text-center">
            <p className="text-sm font-medium text-portal-muted">{P.vacio}</p>
          </div>
        ) : (
          <PCard className="mt-4 p-0">
            <PTable>
              <PTHead>
                <th className="px-5 py-3">{T.colNombre}</th>
                <th className="px-5 py-3">{P.colDocumento}</th>
                <th className="px-5 py-3 text-right">{T.colOperaciones}</th>
                <th className="px-5 py-3 text-right">{T.colComprometido}</th>
                <th className="px-5 py-3 text-right">{T.colContacto}</th>
              </PTHead>
              <tbody className="divide-y divide-portal-line">
                {prospectos.map((p) => (
                  <tr key={p.id} className="align-middle hover:bg-portal-subtle/60">
                    <td className="px-5 py-3">
                      <Link
                        href={`${base}/asesor/prospectos/${p.id}`}
                        className="font-semibold text-portal-ink hover:underline"
                      >
                        {p.nombre}
                      </Link>
                      <PPill tone="neutral" className="ml-2 px-2 py-0.5">
                        {P.badge}
                      </PPill>
                    </td>
                    <td className="px-5 py-3 text-portal-muted">{p.documento ?? P.sinDocumento}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-portal-ink2">
                      {p.numReservas}
                    </td>
                    <td
                      className="px-5 py-3 text-right font-semibold tabular-nums text-portal-ink"
                      title={
                        p.multiMoneda
                          ? COPY.portales.multiMonedaNota(p.moneda)
                          : toMoneda(p.montoComprometido, p.moneda)
                      }
                    >
                      {p.montoComprometido > 0 ? toMonedaKpi(p.montoComprometido, p.moneda) : "—"}
                      {p.multiMoneda && <span className="text-portal-muted"> *</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end">
                        <ContactoCliente nombre={p.nombre} telefono={p.telefono} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </PTable>
          </PCard>
        )}

        <p className="mt-3 text-xs text-portal-muted">{P.comoSeCrea}</p>
      </section>
    </div>
  );
}
