import { Users, CalendarCheck, ArrowRight } from "lucide-react";

import { PButton } from "@/components/portales/ui/PButton";
import { PCard } from "@/components/portales/ui/PCard";
import { PStat } from "@/components/portales/ui/PStat";
import { PNota } from "@/components/portales/ui/PNota";
import { AlertasAsesor } from "@/components/portales/asesor/AlertasAsesor";
import { COPY } from "@/lib/copy";
import { toInt, toMoneda, toMonedaKpi } from "@/lib/formatters";
import { type PortalSlug } from "@/lib/portales/config";
import type { KpisAsesor, AlertasAsesor as AlertasData } from "@/lib/portales/data";
import { basePortal } from "@/lib/portales/rutas";

/**
 * Inicio del asesor: KPIs de su cartera (clientes, reservas pendientes de él,
 * disponibles) y atajos a las dos colas de trabajo. Presentacional: la data llega
 * resuelta desde la página.
 */
export function AsesorDashboard({
  portal,
  kpis,
  alertas,
  puedeResolverSolicitudes = false,
}: {
  portal: PortalSlug;
  kpis: KpisAsesor;
  alertas: AlertasData;
  /** El usuario también es admin: puede abrir la sección de solicitudes. */
  puedeResolverSolicitudes?: boolean;
}) {
  const T = COPY.portales.asesor;
  const base = basePortal(portal);

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-portal text-2xl font-extrabold tracking-tight text-portal-ink sm:text-3xl">{T.titulo}</h1>
        <p className="mt-1 max-w-2xl text-sm text-portal-muted">{T.sub}</p>
      </header>

      <AlertasAsesor
        portal={portal}
        alertas={alertas}
        puedeResolverSolicitudes={puedeResolverSolicitudes}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PStat label={T.kpiClientes} value={toInt(kpis.clientes)} />
        {/* Los titulares sin cuenta van en su propia cifra: sumarlos a "clientes"
            contaría como usuarios del portal a gente que no puede iniciar sesión. */}
        <PStat label={T.kpiProspectos} value={toInt(kpis.prospectos)} sub={T.kpiProspectosSub} />
        <PStat label={T.kpiReservasPendientes} value={toInt(kpis.reservasPendientes)} tone="primary" />
        <PStat label={T.kpiDisponibles} value={toInt(kpis.disponibles)} tone="positive" />
      </div>

      {/* Cartera en DINERO (estimado; intel interna del staff) */}
      <div className="mt-6">
        <h2 className="mb-3 font-portal text-lg font-bold text-portal-ink">{T.kpiDineroTitulo}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <PStat
            label={T.kpiComprometido}
            value={toMonedaKpi(kpis.comprometido, kpis.moneda)}
            sub={T.kpiComprometidoSub}
            tone="ink"
            title={toMoneda(kpis.comprometido, kpis.moneda)}
          />
          <PStat
            label={T.kpiComision}
            value={toMonedaKpi(kpis.comisionEstimada, kpis.moneda)}
            sub={T.kpiComisionSub}
            tone="positive"
            title={toMoneda(kpis.comisionEstimada, kpis.moneda)}
          />
          <PStat label={T.kpiCerradas} value={toInt(kpis.cerradas)} sub={T.kpiCerradasSub} tone="primary" />
        </div>
        <p className="mt-2 text-xs text-portal-muted">{T.kpiDineroNota}</p>
        {kpis.multiMoneda && (
          <p className="mt-1 text-xs font-medium text-portal-muted">{COPY.portales.multiMonedaNota(kpis.moneda)}</p>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PCard className="flex flex-col items-start">
          <CalendarCheck className="size-6 text-portal-primary" aria-hidden />
          <h2 className="mt-3 font-portal text-lg font-bold text-portal-ink">{T.kpiReservasPendientes}</h2>
          <p className="mt-1 flex-1 text-sm text-portal-muted">{T.reservas.sub}</p>
          <PButton
            as="link"
            href={`${base}/asesor/reservas`}
            pill
            className="mt-4"
            trailingIcon={<ArrowRight className="size-4" />}
          >
            {T.verReservas}
          </PButton>
        </PCard>

        <PCard className="flex flex-col items-start">
          <Users className="size-6 text-portal-ink" aria-hidden />
          <h2 className="mt-3 font-portal text-lg font-bold text-portal-ink">{T.clientesPageTitulo}</h2>
          <p className="mt-1 flex-1 text-sm text-portal-muted">{T.clientesPageSub}</p>
          <PButton
            as="link"
            href={`${base}/asesor/clientes`}
            variant="ghost"
            pill
            className="mt-4"
            trailingIcon={<ArrowRight className="size-4" />}
          >
            {T.verClientes}
          </PButton>
        </PCard>
      </div>

      <PNota className="mt-8">{T.nota}</PNota>
    </div>
  );
}
