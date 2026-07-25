import { ArrowRight, Clock, MessageCircle, Compass, CheckCircle2 } from "lucide-react";

import { PButton } from "@/components/portales/ui/PButton";
import { PCard } from "@/components/portales/ui/PCard";
import { PStat } from "@/components/portales/ui/PStat";
import { COPY } from "@/lib/copy";
import { toInt } from "@/lib/formatters";
import { CONTACTO } from "@/lib/constants";
import { waPortal, type PortalSlug } from "@/lib/portales/config";
import type { ReservaCliente, MiAsesor } from "@/lib/portales/data";
import { CuentaRegresiva } from "@/components/portales/CuentaRegresiva";
import { TimelineReserva, type EstadoTimeline } from "@/components/portales/TimelineReserva";
import { basePortal } from "@/lib/portales/rutas";

/** Deriva el paso del proceso que ve el inversionista desde la reserva + financiada_en. */
function estadoTimeline(r: ReservaCliente): EstadoTimeline {
  if (r.financiadaEn) return "financiada";
  if (r.estado === "confirmada") return "confirmada";
  return "reservada";
}

/**
 * Inicio del inversionista (estilo InversionNPL): saludo + KPIs simples. Si no
 * tiene operaciones EN PROCESO (reservadas o confirmadas), un estado vacío que
 * EMPUJA a explorar; si tiene, las muestra con su timeline (reservada → confirmada
 * → financiada) y el atajo de WhatsApp a su asesor.
 */
export function ClienteDashboard({
  portal,
  nombre,
  enProceso,
  activasCount,
  confirmadasCount,
  disponibles,
  asesor,
}: {
  portal: PortalSlug;
  nombre: string;
  /** Reservas activas + confirmadas (las que muestran timeline). */
  enProceso: ReservaCliente[];
  activasCount: number;
  confirmadasCount: number;
  disponibles: number;
  asesor: MiAsesor | null;
}) {
  const C = COPY.portales.cliente;
  const TR = COPY.portales.reserva;
  const TL = C.timeline;
  const base = basePortal(portal);

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-portal text-2xl font-extrabold tracking-tight text-portal-ink sm:text-3xl">
          {C.inicioSaludo(nombre)}
        </h1>
        <p className="mt-1 text-sm text-portal-muted">{C.inicioSub}</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <PStat label={C.kpiReservasActivas} value={toInt(activasCount)} tone="primary" />
        <PStat label={C.kpiConfirmadas} value={toInt(confirmadasCount)} tone="positive" />
        <PStat label={C.kpiDisponibles} value={toInt(disponibles)} tone="ink" />
      </div>

      {enProceso.length === 0 ? (
        <PCard className="mt-6 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-chip bg-portal-primary-soft text-portal-primary-ink">
            <Compass className="size-6" aria-hidden />
          </span>
          <h2 className="mt-4 font-portal text-lg font-bold text-portal-ink">
            {C.inicioSinReservasTitulo}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-portal-ink2">
            {C.inicioSinReservasTexto}
          </p>
          <PButton
            as="link"
            href={`${base}/cliente/oportunidades`}
            pill
            className="mt-5"
            leadingIcon={<Compass className="size-4" />}
          >
            {C.inicioExplorar}
          </PButton>
        </PCard>
      ) : (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-portal text-lg font-bold text-portal-ink">
              {C.inicioReservasTitulo}
            </h2>
            <PButton as="link" href={`${base}/cliente/historial`} variant="ghost" size="sm" pill>
              {C.inicioVerHistorial}
            </PButton>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {enProceso.map((r) => {
              const tl = estadoTimeline(r);
              const wa = asesor?.telefono
                ? CONTACTO.waLinkTo(asesor.telefono, TR.waMensaje(r.oportunidadTitulo))
                : waPortal(portal, TR.waMensaje(r.oportunidadTitulo));
              return (
                <PCard key={r.id} className="flex flex-col">
                  <h3 className="line-clamp-2 font-portal text-base font-bold text-portal-ink">
                    {r.oportunidadTitulo}
                  </h3>
                  {r.estado === "activa" ? (
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-portal-ink2">
                      <Clock className="size-4 shrink-0 text-portal-warning" aria-hidden />
                      <CuentaRegresiva hasta={r.venceEn} conPrefijo />
                    </p>
                  ) : (
                    <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-portal-positive">
                      <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                      {tl === "financiada" ? TL.estadoFinanciada : TL.estadoConfirmada}
                    </p>
                  )}
                  <div className="mt-4 border-t border-portal-line pt-4">
                    <TimelineReserva estado={tl} compacto />
                  </div>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <PButton
                      as="link"
                      href={`${base}/cliente/oportunidades/${r.oportunidadId}`}
                      variant="ghost"
                      size="sm"
                      pill
                      fullWidth
                      trailingIcon={<ArrowRight className="size-4" />}
                    >
                      {COPY.portales.card.verDetalle}
                    </PButton>
                    <PButton
                      as="link"
                      href={wa}
                      external
                      variant="primary"
                      size="sm"
                      pill
                      fullWidth
                      leadingIcon={<MessageCircle className="size-4" />}
                    >
                      {TR.escribirAsesor}
                    </PButton>
                  </div>
                </PCard>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
