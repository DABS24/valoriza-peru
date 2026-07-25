import { MessageCircle, Building2, Inbox, FilePlus, Trophy } from "lucide-react";

import { PButton } from "@/components/portales/ui/PButton";
import { PCard } from "@/components/portales/ui/PCard";
import { PStat } from "@/components/portales/ui/PStat";
import { COPY } from "@/lib/copy";
import { toInt } from "@/lib/formatters";
import { waPortal, type PortalSlug } from "@/lib/portales/config";
import type { OportunidadEmpresario, MiEmpresa } from "@/lib/portales/data";
import { EmpresarioOportunidadCard } from "@/components/portales/empresario/EmpresarioOportunidadCard";
import { FlujoDinero } from "@/components/portales/FlujoDinero";

/**
 * Panel del EMPRESARIO (solo-ver). Saludo + su empresa, KPIs simples, sus
 * operaciones agrupadas (vigentes / cerradas / en evaluación) y UN botón accionable:
 * enviar una oferta por WhatsApp al contacto general. Sin nada del lado inversionista.
 */
export function EmpresarioDashboard({
  portal,
  nombre,
  empresa,
  vigentes,
  cerradas,
  evaluacion,
  solicitarHref,
  reputacion,
}: {
  portal: PortalSlug;
  nombre: string;
  empresa: MiEmpresa | null;
  vigentes: OportunidadEmpresario[];
  cerradas: OportunidadEmpresario[];
  evaluacion: OportunidadEmpresario[];
  /** Ruta a "Mis solicitudes" (solo verticales con prestatarios). */
  solicitarHref?: string;
  /** Reputación amable: total de operaciones y cuántas completó (financiadas/cerradas). */
  reputacion: { total: number; completadas: number };
}) {
  const E = COPY.portales.empresario;
  const nombreEmpresa = empresa?.nombre ?? nombre;
  const wa = waPortal(portal, E.waMensaje(nombreEmpresa));
  const total = vigentes.length + cerradas.length + evaluacion.length;

  const secciones = [
    { titulo: E.seccionVigentes, sub: E.seccionVigentesSub, ops: vigentes },
    { titulo: E.seccionEvaluacion, sub: E.seccionEvaluacionSub, ops: evaluacion },
    { titulo: E.seccionCerradas, sub: E.seccionCerradasSub, ops: cerradas },
  ].filter((s) => s.ops.length > 0);

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-portal text-2xl font-extrabold tracking-tight text-portal-ink sm:text-3xl">
            {E.inicioSaludo(nombre)}
          </h1>
          <p className="mt-1 text-sm text-portal-muted">{E.inicioSub}</p>
          {empresa && (
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-1.5 font-semibold text-portal-ink">
                <Building2 className="size-4 shrink-0 text-portal-primary" aria-hidden />
                {empresa.nombre}
              </span>
              {empresa.ruc && (
                <span className="rounded-chip bg-portal-subtle px-2 py-0.5 font-mono text-xs tabular-nums text-portal-ink2">
                  {E.rucLabel} {empresa.ruc}
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {solicitarHref && (
            <PButton
              as="link"
              href={solicitarHref}
              pill
              leadingIcon={<FilePlus className="size-4" />}
            >
              {E.solicitarFinanciamiento}
            </PButton>
          )}
          <PButton
            as="link"
            href={wa}
            external
            variant="ghost"
            pill
            leadingIcon={<MessageCircle className="size-4" />}
          >
            {E.enviarOferta}
          </PButton>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <PStat label={E.kpiVigentes} value={toInt(vigentes.length)} tone="primary" />
        <PStat label={E.kpiCerradas} value={toInt(cerradas.length)} tone="positive" />
        <PStat label={E.kpiEvaluacion} value={toInt(evaluacion.length)} tone="ink" />
      </div>

      {/* Tu historial con nosotros (reputación amable; nunca el scoring interno) */}
      {reputacion.total > 0 && (
        <PCard className="mt-4">
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-chip bg-portal-positive-soft text-portal-positive">
              <Trophy className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="font-portal text-base font-bold text-portal-ink">
                {E.reputacion.titulo}
              </h2>
              <p className="text-sm text-portal-muted">{E.reputacion.sub}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <PStat label={E.reputacion.totalOps} value={toInt(reputacion.total)} tone="ink" />
            <PStat
              label={E.reputacion.completadas}
              value={toInt(reputacion.completadas)}
              sub={E.reputacion.completadasSub}
              tone="positive"
            />
          </div>
          <p className="mt-3 text-xs text-portal-muted">{E.reputacion.buenPagador}</p>
        </PCard>
      )}

      {/* Cómo llega el dinero: sus cards muestran "Recibes = monto − comisión" y
          nunca decían que eso son DOS transferencias, ni que el monto no pasa por
          una cuenta nuestra. Va antes de las operaciones, no después. */}
      <FlujoDinero faceta="empresario" className="mt-4" />

      {total === 0 ? (
        <PCard className="mt-6 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-chip bg-portal-primary-soft text-portal-primary-ink">
            <Inbox className="size-6" aria-hidden />
          </span>
          <p className="mx-auto mt-4 max-w-md text-sm text-portal-ink2">{E.vacio}</p>
          {solicitarHref ? (
            <PButton
              as="link"
              href={solicitarHref}
              pill
              className="mt-5"
              leadingIcon={<FilePlus className="size-4" />}
            >
              {E.solicitarFinanciamiento}
            </PButton>
          ) : (
            <PButton
              as="link"
              href={wa}
              external
              pill
              className="mt-5"
              leadingIcon={<MessageCircle className="size-4" />}
            >
              {E.enviarOferta}
            </PButton>
          )}
        </PCard>
      ) : (
        <div className="mt-8 space-y-8">
          {secciones.map((s) => (
            <section key={s.titulo}>
              <div className="mb-3">
                <h2 className="font-portal text-lg font-bold text-portal-ink">{s.titulo}</h2>
                <p className="text-sm text-portal-muted">{s.sub}</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {s.ops.map((op) => (
                  <EmpresarioOportunidadCard key={op.id} op={op} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-portal-muted sm:text-left">{E.ofertaNota}</p>
    </div>
  );
}
