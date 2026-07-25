import { FileDown } from "lucide-react";

import { PButton } from "@/components/portales/ui/PButton";
import { PCard } from "@/components/portales/ui/PCard";
import { PPill } from "@/components/portales/ui/PPill";
import { PTable, PTHead } from "@/components/portales/ui/PTable";
import { COPY } from "@/lib/copy";
import { toDate } from "@/lib/formatters";
import { type PortalSlug } from "@/lib/portales/config";
import { TONO_RESERVA } from "@/lib/portales/constants";
import type { ReservaCliente } from "@/lib/portales/data";
import { CuentaRegresiva } from "@/components/portales/CuentaRegresiva";
import { basePortal } from "@/lib/portales/rutas";

/**
 * Historial de reservas del inversionista. Presentacional: la data llega resuelta
 * desde la página (RLS deja al cliente leer solo las suyas). Las activas muestran
 * cuenta regresiva; las resueltas, la fecha.
 */
export function HistorialCliente({
  portal,
  reservas,
}: {
  portal: PortalSlug;
  reservas: ReservaCliente[];
}) {
  const T = COPY.portales.historial;
  const C = COPY.portales.cliente.constancia;
  const base = basePortal(portal);

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-portal text-2xl font-extrabold tracking-tight text-portal-ink sm:text-3xl">
          {T.titulo}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-portal-muted">{T.sub}</p>
      </header>

      {reservas.length === 0 ? (
        <div className="rounded-portal border border-dashed border-portal-line2 bg-portal-surface p-10 text-center">
          <p className="text-sm font-medium text-portal-muted">{T.vacio}</p>
          <PButton as="link" href={`${base}/cliente/oportunidades`} pill className="mt-5">
            {T.explorar}
          </PButton>
        </div>
      ) : (
        <PCard className="p-0">
          <PTable>
            <PTHead>
              <th className="px-5 py-3">{T.colOportunidad}</th>
              <th className="px-5 py-3">{T.colEstado}</th>
              <th className="px-5 py-3">{T.colReservada}</th>
              <th className="px-5 py-3">{T.colVence}</th>
              <th className="px-5 py-3 text-right" />
            </PTHead>
            <tbody className="divide-y divide-portal-line">
              {reservas.map((r) => (
                <tr key={r.id} className="align-middle hover:bg-portal-subtle/60">
                  <td className="px-5 py-3 font-semibold text-portal-ink">{r.oportunidadTitulo}</td>
                  <td className="px-5 py-3">
                    <PPill tone={TONO_RESERVA[r.estado]}>{T.estados[r.estado]}</PPill>
                  </td>
                  <td className="px-5 py-3 text-portal-muted">{toDate(r.reservadoEn)}</td>
                  <td className="px-5 py-3 text-portal-ink2">
                    {r.estado === "activa" ? (
                      <CuentaRegresiva hasta={r.venceEn} />
                    ) : (
                      toDate(r.resueltoEn ?? r.venceEn)
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      {/* La constancia solo tiene sentido mientras la reserva vive:
                          de una expirada o cancelada no hay nada que acreditar. */}
                      {(r.estado === "activa" || r.estado === "confirmada") && (
                        <PButton
                          as="link"
                          href={`/api/reservas/${r.oportunidadId}/constancia?download=1`}
                          external
                          variant="ghost"
                          size="sm"
                          pill
                          leadingIcon={<FileDown className="size-4" />}
                        >
                          {C.boton}
                        </PButton>
                      )}
                      <PButton
                        as="link"
                        href={`${base}/cliente/oportunidades/${r.oportunidadId}`}
                        variant="ghost"
                        size="sm"
                        pill
                      >
                        {T.verDetalle}
                      </PButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </PTable>
        </PCard>
      )}
    </div>
  );
}
