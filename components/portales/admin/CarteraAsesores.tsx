import { PCard } from "@/components/portales/ui/PCard";
import { PPill } from "@/components/portales/ui/PPill";
import { PTable, PTHead } from "@/components/portales/ui/PTable";
import { COPY } from "@/lib/copy";
import { toInt, toMoneda, toMonedaKpi } from "@/lib/formatters";
import type { CargaAsesor } from "@/lib/portales/admin";

/**
 * Cómo rinde cada asesor del portal (SERVER, presencial). `kpisAsesor` ya existía
 * pero SOLO para uno mismo: el admin no podía comparar carteras ni saber si un asesor
 * tiene 40 clientes y otro 2. Sin esto, repartir carga era a ojo.
 *
 * Honestidad: los montos van en la moneda DOMINANTE de cada asesor (nunca se suman
 * PEN con USD) y se declara cuando hay operaciones fuera de ese total. "Sin actividad"
 * es un dato de gestión, no un reproche: son clientes que nadie activó todavía.
 *
 * Mobile-first: la tabla scrollea DENTRO de su contenedor (PTable ya trae
 * overflow-x-auto), el body nunca scrollea en X.
 */
export function CarteraAsesores({ filas }: { filas: CargaAsesor[] }) {
  const T = COPY.portales.admin.asesores;
  // Ya viene ordenada por carga desde el server: el primero es el más cargado. Solo
  // se marca si de verdad tiene clientes (con todos en 0 no hay nada que destacar).
  const masCargadoId = filas.length > 0 && filas[0].clientes > 0 ? filas[0].asesorId : null;

  return (
    <section className="mt-8 space-y-3">
      <div>
        <h2 className="font-portal text-lg font-bold text-portal-ink">{T.titulo}</h2>
        <p className="mt-0.5 text-xs text-portal-muted">{T.sub}</p>
      </div>

      <PCard className="p-0">
        {filas.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-portal-muted">{T.vacio}</p>
        ) : (
          <PTable>
            <PTHead>
              <th className="px-5 py-3">{T.colAsesor}</th>
              <th className="px-5 py-3 text-right">{T.colClientes}</th>
              <th className="px-5 py-3 text-right">{T.colProspectos}</th>
              <th className="px-5 py-3 text-right">{T.colSinActividad}</th>
              <th className="px-5 py-3 text-right">{T.colReservas}</th>
              <th className="px-5 py-3 text-right">{T.colComprometido}</th>
              <th className="px-5 py-3 text-right">{T.colFinanciadas}</th>
            </PTHead>
            <tbody className="divide-y divide-portal-line">
              {filas.map((a) => (
                <tr key={a.asesorId} className="align-middle hover:bg-portal-subtle/60">
                  <td className="px-5 py-3">
                    <span className="font-semibold text-portal-ink">{a.nombre}</span>
                    {a.asesorId === masCargadoId && (
                      <PPill tone="gold" className="ml-2 px-2 py-0.5">
                        {T.masCargado}
                      </PPill>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-portal-ink">
                    {toInt(a.clientes)}
                  </td>
                  {/* Carga real que no se ve en "Clientes": los que todavía no
                      tienen cuenta. Columna aparte para no inflar el conteo de
                      usuarios del portal. */}
                  <td
                    className="px-5 py-3 text-right tabular-nums text-portal-muted"
                    title={T.colProspectosAyuda}
                  >
                    {toInt(a.prospectos)}
                  </td>
                  <td
                    className="px-5 py-3 text-right tabular-nums text-portal-muted"
                    title={T.sinActividadAyuda}
                  >
                    {toInt(a.clientesSinActividad)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-portal-ink2">
                    {toInt(a.reservasActivas)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span
                      className="font-semibold tabular-nums text-portal-ink"
                      title={toMoneda(a.comprometido, a.moneda)}
                    >
                      {toMonedaKpi(a.comprometido, a.moneda)}
                    </span>
                    {a.multiMoneda && <p className="text-2xs text-portal-muted">{T.multiMoneda}</p>}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums text-portal-positive">
                    {toInt(a.financiadas)}
                  </td>
                </tr>
              ))}
            </tbody>
          </PTable>
        )}
      </PCard>
      <p className="text-xs text-portal-muted">{T.nota}</p>
    </section>
  );
}
