import { PStat } from "@/components/portales/ui/PStat";
import { PNota } from "@/components/portales/ui/PNota";
import { AlertasAdmin } from "@/components/portales/admin/AlertasAdmin";
import { CarteraAsesores } from "@/components/portales/admin/CarteraAsesores";
import { COPY } from "@/lib/copy";
import { toInt, toMonedaKpi, toMoneda, toPorcentaje } from "@/lib/formatters";
import { requirePortalAdmin } from "@/lib/portales/guards";
import { kpisPortal, alertasAdmin, carteraAsesores } from "@/lib/portales/data";
import { PORTALES, type PortalSlug } from "@/lib/portales/config";

/**
 * Tablero del admin del portal (SERVER). KPIs resueltos en un solo Promise.all
 * (kpisPortal). Montos con toMonedaKpi (compacto, no desborda) + valor completo
 * en el tooltip del Stat. Presentacional: server-renderable, sin JS al cliente.
 *
 * HONESTIDAD (es un producto de dinero): los KPIs sin muestra se pintan "—" con su
 * explicación, nunca 0; y el bloque "El negocio" separa lo YA desembolsado de lo que
 * sigue en curso, para que nadie lea una reserva como un ingreso.
 */
export default async function TableroPage({ portal }: { portal: PortalSlug }) {
  // ADMIN, no staff: esta pantalla muestra la cola de trabajo y los números del
  // negocio del portal completo. El layout de la ruta ya lo exige; esto es defensa
  // en profundidad (el componente no depende de dónde lo monten).
  await requirePortalAdmin(portal);
  // Waterfall aplanado: KPIs, pendientes y cartera son independientes → una ronda.
  const [k, alertas, asesores] = await Promise.all([
    kpisPortal(portal),
    alertasAdmin(portal),
    carteraAsesores(portal),
  ]);
  const T = COPY.portales.admin.tablero;
  const cfg = PORTALES[portal];

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-portal text-2xl font-extrabold tracking-tight text-portal-ink sm:text-3xl">{T.titulo}</h1>
        <p className="mt-1 max-w-2xl text-sm text-portal-muted">{T.sub}</p>
      </header>

      <AlertasAdmin portal={portal} alertas={alertas} />

      {/* Oportunidades por estado */}
      <section className="space-y-3">
        <h2 className="font-portal text-lg font-bold text-portal-ink">{T.seccionOportunidades}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <PStat label={T.kpiTotal} value={toInt(k.ops.total)} />
          <PStat label={T.kpiDisponibles} value={toInt(k.ops.disponible)} tone="positive" />
          <PStat label={T.kpiReservadas} value={toInt(k.ops.reservada)} tone="primary" />
          <PStat label={T.kpiCerradas} value={toInt(k.ops.cerrada)} tone="ink" />
          <PStat label={T.kpiBorradores} value={toInt(k.ops.borrador)} />
        </div>
      </section>

      {/* El NEGOCIO: lo que ya ocurrió (desembolsado), separado de lo que está en curso */}
      <section className="mt-8 space-y-3">
        <div>
          <h2 className="font-portal text-lg font-bold text-portal-ink">{T.seccionNegocio}</h2>
          <p className="mt-0.5 text-xs text-portal-muted">{T.seccionNegocioSub}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <PStat
            label={T.kpiCapitalColocado}
            value={toMonedaKpi(k.montoFinanciado, k.moneda)}
            title={toMoneda(k.montoFinanciado, k.moneda)}
            sub={T.kpiCapitalColocadoSub}
            tone="positive"
          />
          <PStat
            label={T.kpiComisionFinanciada}
            value={toMonedaKpi(k.comisionFinanciada, k.moneda)}
            title={toMoneda(k.comisionFinanciada, k.moneda)}
            sub={T.kpiComisionFinanciadaSub}
            tone="positive"
          />
          <PStat label={T.kpiFinanciadas} value={toInt(k.financiadas)} tone="primary" />
          {/* Sin operaciones financiadas todavía no hay ticket promedio: "—", no 0. */}
          <PStat
            label={T.kpiTicket}
            value={k.ticketPromedio == null ? T.sinDatoAun : toMonedaKpi(k.ticketPromedio, k.moneda)}
            title={k.ticketPromedio == null ? undefined : toMoneda(k.ticketPromedio, k.moneda)}
            sub={k.ticketPromedio == null ? T.sinDatoAunSub : T.kpiTicketSub}
            tone="ink"
          />
          {/* Sin reservas registradas no hay conversión que reportar. */}
          <PStat
            label={T.kpiConversion}
            value={k.conversionReservas == null ? T.sinDatoAun : toPorcentaje(k.conversionReservas)}
            sub={k.conversionReservas == null ? T.sinReservasAunSub : T.kpiConversionSub}
            tone="ink"
          />
          <PStat
            label={T.kpiReservasExpiradas}
            value={toInt(k.reservasExpiradas)}
            sub={T.kpiReservasExpiradasSub}
            tone={k.reservasExpiradas > 0 ? "danger" : "ink"}
          />
        </div>
      </section>

      {/* Monto por estado */}
      <section className="mt-8 space-y-3">
        <h2 className="font-portal text-lg font-bold text-portal-ink">{T.seccionMonto}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <PStat
            label={T.kpiMontoDisponible}
            value={toMonedaKpi(k.montoDisponible, k.moneda)}
            title={toMoneda(k.montoDisponible, k.moneda)}
            tone="positive"
          />
          <PStat
            label={T.kpiMontoReservado}
            value={toMonedaKpi(k.montoReservado, k.moneda)}
            title={toMoneda(k.montoReservado, k.moneda)}
            tone="primary"
          />
          <PStat
            label={T.kpiMontoCerrado}
            value={toMonedaKpi(k.montoCerrado, k.moneda)}
            title={toMoneda(k.montoCerrado, k.moneda)}
            tone="ink"
          />
        </div>
        {/* Comisión estimada: intel interna del admin (nunca la ve el inversionista). */}
        <div className="grid grid-cols-1">
          <PStat
            label={T.kpiComisionEstimada}
            value={toMonedaKpi(k.comisionEstimada, k.moneda)}
            title={toMoneda(k.comisionEstimada, k.moneda)}
            sub={T.kpiComisionEstimadaSub}
            tone="positive"
          />
        </div>
        {/* Montos en una sola moneda: si hay otra, se declara en vez de mentir con un total. */}
        {k.multiMoneda && (
          <p className="text-xs font-medium text-portal-muted">{COPY.portales.multiMonedaNota(k.moneda)}</p>
        )}
      </section>

      {/* Equipo y clientes */}
      <section className="mt-8 space-y-3">
        <h2 className="font-portal text-lg font-bold text-portal-ink">{T.seccionEquipo}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <PStat label={T.kpiInversionistas} value={toInt(k.miembros.clientes)} tone="ink" />
          <PStat label={T.kpiAsesores} value={toInt(k.miembros.asesores)} />
          {k.prestatarios != null && (
            <PStat label={cfg.prestatarios?.label ?? T.kpiContratistas} value={toInt(k.prestatarios)} tone="positive" />
          )}
        </div>
      </section>

      <CarteraAsesores filas={asesores} />

      <PNota className="mt-8">{T.nota}</PNota>
    </div>
  );
}
