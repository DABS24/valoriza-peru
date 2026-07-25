"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";

import { PButton } from "@/components/portales/ui/PButton";
import { PCard } from "@/components/portales/ui/PCard";
import { PPill } from "@/components/portales/ui/PPill";
import { PSelect } from "@/components/portales/ui/PField";
import { PTable, PTHead } from "@/components/portales/ui/PTable";
import { Dialog } from "@/components/ui/Dialog";
import { cn } from "@/lib/cn";
import { COPY } from "@/lib/copy";
import { toDateTime } from "@/lib/formatters";
import {
  AUDITORIA_ACCIONES,
  AUDITORIA_ENTIDADES,
  TONO_ROL,
  labelAccionAuditoria,
  labelEntidadAuditoria,
} from "@/lib/portales/constants";
import {
  listAuditoriaPortal,
  verificarCadenaPortal,
  type EventoPortal,
  type IntegridadPortal,
} from "@/lib/portales/auditoria-client";
import type { PortalSlug } from "@/lib/portales/config";
import { PORTAL_ROLES, type PortalRol } from "@/lib/portales/roles";

/** Renglones por página. La bitácora crece sin techo: nunca se trae entera. */
const PAGINA = 50;

type Periodo = "todo" | "hoy" | "d7" | "d30" | "d90";
const DIAS_PERIODO: Record<Exclude<Periodo, "todo" | "hoy">, number> = { d7: 7, d30: 30, d90: 90 };

/** Inicio del rango (ISO) según el periodo elegido, o undefined = desde el inicio. */
function desdeDe(periodo: Periodo): string | undefined {
  if (periodo === "todo") return undefined;
  const ahora = new Date();
  if (periodo === "hoy") {
    return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).toISOString();
  }
  return new Date(ahora.getTime() - DIAS_PERIODO[periodo] * 86_400_000).toISOString();
}

/** El rol guardado es texto libre en la base: se muestra traducido solo si es uno conocido. */
function rolConocido(rol: string | null): PortalRol | null {
  return rol != null && (PORTAL_ROLES as readonly string[]).includes(rol)
    ? (rol as PortalRol)
    : null;
}

/**
 * BITÁCORA del portal — el registro de quién hizo qué. Solo la ve el administrador
 * de ESE portal: la lectura va con la sesión del usuario y la RLS `portal_es_admin`
 * (0089) decide; acá no hay ninguna decisión de permiso. La ruta ya exigió admin.
 *
 * Client Component a propósito: filtros, paginación incremental y detalle son
 * interacción pura sobre una tabla que solo el admin puede leer.
 */
export function AuditoriaTabla({ portal }: { portal: PortalSlug }) {
  const T = COPY.portales.admin.auditoria;

  const [eventos, setEventos] = useState<EventoPortal[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [integridad, setIntegridad] = useState<IntegridadPortal | null>(null);
  const [revisando, setRevisando] = useState(false);
  const [detalle, setDetalle] = useState<EventoPortal | null>(null);

  const [accion, setAccion] = useState("");
  const [entidad, setEntidad] = useState("");
  const [periodo, setPeriodo] = useState<Periodo>("todo");

  const filtros = useMemo(
    () => ({ accion: accion || null, entidad: entidad || null, desde: desdeDe(periodo) ?? null }),
    [accion, entidad, periodo],
  );

  // Primera página (al cambiar filtros) y "ver más" (append) comparten carga.
  const cargar = useCallback(
    async (offset: number) => {
      const primera = offset === 0;
      if (primera) setCargando(true);
      else setCargandoMas(true);
      try {
        const pagina = await listAuditoriaPortal(portal, { ...filtros, limit: PAGINA, offset });
        setTotal(pagina.total);
        setEventos((prev) => (primera ? pagina.eventos : [...prev, ...pagina.eventos]));
      } finally {
        setCargando(false);
        setCargandoMas(false);
      }
    },
    [portal, filtros],
  );

  useEffect(() => {
    void cargar(0);
  }, [cargar]);

  const revisar = useCallback(async () => {
    setRevisando(true);
    try {
      setIntegridad(await verificarCadenaPortal(portal));
    } finally {
      setRevisando(false);
    }
  }, [portal]);

  useEffect(() => {
    void revisar();
  }, [revisar]);

  const roto = integridad != null && !integridad.noVerificable && !integridad.ok;
  const dudoso = integridad?.noVerificable === true;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-portal text-2xl font-extrabold tracking-tight text-portal-ink sm:text-3xl">
          {T.titulo}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-portal-muted">{T.sub}</p>
      </div>

      {/* ── Revisión del registro (los eslabones de la cadena) ── */}
      <PCard
        className={cn(
          "mb-4",
          roto && "border-portal-danger/50",
          integridad?.ok && "border-portal-positive/40",
        )}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0">
            {dudoso ? (
              <ShieldQuestion className="size-5 text-portal-muted" aria-hidden />
            ) : roto ? (
              <ShieldAlert className="size-5 text-portal-danger" aria-hidden />
            ) : (
              <ShieldCheck className="size-5 text-portal-positive" aria-hidden />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-portal text-sm font-bold text-portal-ink">{T.integridadTitulo}</p>
            <p className="mt-0.5 text-sm text-portal-ink2">
              {integridad == null
                ? T.revisando
                : integridad.noVerificable
                  ? T.integridadNoVerificable
                  : integridad.total === 0
                    ? T.integridadVacia
                    : integridad.ok
                      ? T.integridadOk(integridad.revisados)
                      : T.integridadRota(integridad.rotos.length)}
            </p>
            {integridad != null && !integridad.noVerificable && integridad.total > 0 && (
              <p className="mt-0.5 text-xs text-portal-muted">
                {integridad.completa
                  ? T.integridadCompleta
                  : T.integridadParcial(integridad.revisados, integridad.total)}
              </p>
            )}
            {roto && (
              <p className="mt-2 text-xs font-semibold text-portal-danger">
                {T.integridadRotaQueHacer}
              </p>
            )}
            <p className="mt-3 text-xs leading-relaxed text-portal-muted">
              {T.integridadComoFunciona}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-portal-muted">
              {T.integridadAlcance}
            </p>
            <PButton
              variant="ghost"
              size="sm"
              pill
              className="mt-3"
              loading={revisando}
              disabled={revisando}
              onClick={revisar}
            >
              {revisando ? T.revisando : T.revisar}
            </PButton>
          </div>
        </div>
      </PCard>

      {/* ── Filtros ── */}
      <PCard className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <PSelect
            label={T.filtroAccionLabel}
            value={accion}
            onChange={(e) => setAccion(e.target.value)}
          >
            <option value="">{T.filtroAccion}</option>
            {Object.entries(AUDITORIA_ACCIONES).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </PSelect>
          <PSelect
            label={T.filtroEntidadLabel}
            value={entidad}
            onChange={(e) => setEntidad(e.target.value)}
          >
            <option value="">{T.filtroEntidad}</option>
            {Object.entries(AUDITORIA_ENTIDADES).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </PSelect>
          <PSelect
            label={T.periodoLabel}
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as Periodo)}
          >
            <option value="todo">{T.periodo.todo}</option>
            <option value="hoy">{T.periodo.hoy}</option>
            <option value="d7">{T.periodo.d7}</option>
            <option value="d30">{T.periodo.d30}</option>
            <option value="d90">{T.periodo.d90}</option>
          </PSelect>
        </div>
        <p className="mt-3 text-xs text-portal-muted">
          {cargando ? T.cargando : T.mostrando(eventos.length, total)}
        </p>
      </PCard>

      {/* ── Renglones ── */}
      <PCard className="p-0">
        {cargando ? (
          <p className="px-5 py-10 text-center text-sm text-portal-muted">{T.cargando}</p>
        ) : eventos.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-portal-muted">{T.vacio}</p>
        ) : (
          <PTable>
            <PTHead>
              <th className="px-5 py-3">{T.colCuando}</th>
              <th className="px-5 py-3">{T.colQuien}</th>
              <th className="px-5 py-3">{T.colQue}</th>
              <th className="px-5 py-3">{T.colRecurso}</th>
              <th className="px-5 py-3" />
            </PTHead>
            <tbody className="divide-y divide-portal-line">
              {eventos.map((e) => {
                const rol = rolConocido(e.actorRol);
                return (
                  <tr
                    key={e.id}
                    onClick={() => setDetalle(e)}
                    className="cursor-pointer align-middle hover:bg-portal-subtle/60"
                  >
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-portal-ink2">
                      {toDateTime(e.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <span className="block font-semibold text-portal-ink">
                        {e.actorNombre ?? (e.actorId ? T.actorBorrado : T.actorSistema)}
                      </span>
                      {rol && (
                        <PPill tone={TONO_ROL[rol]} className="mt-1">
                          {COPY.portales.roles[rol]}
                        </PPill>
                      )}
                    </td>
                    <td className="px-5 py-3 font-medium text-portal-ink">
                      {labelAccionAuditoria(e.accion)}
                    </td>
                    <td className="px-5 py-3 text-portal-ink2">
                      {labelEntidadAuditoria(e.entidad)}
                    </td>
                    {/* La fila entera abre el detalle (comodidad con el ratón), pero el
                        botón real es este: una fila clicable no la alcanza el teclado. */}
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        aria-label={T.verDetalle}
                        onClick={() => setDetalle(e)}
                        className="ml-auto flex size-8 items-center justify-center rounded-chip text-portal-muted transition hover:bg-portal-primary-soft hover:text-portal-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal-primary/40"
                      >
                        <ChevronRight className="size-4" aria-hidden />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </PTable>
        )}
      </PCard>

      {!cargando && eventos.length < total && (
        <div className="mt-4 flex justify-center">
          <PButton
            variant="ghost"
            pill
            loading={cargandoMas}
            disabled={cargandoMas}
            onClick={() => cargar(eventos.length)}
          >
            {T.cargarMas}
          </PButton>
        </div>
      )}

      <DetalleEvento evento={detalle} onClose={() => setDetalle(null)} />
    </div>
  );
}

// ───────────────────────────── Detalle de un renglón ─────────────────────────────

function Dato({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-2xs font-bold uppercase tracking-wide text-portal-muted">{label}</dt>
      <dd className={cn("mt-0.5 break-words text-sm text-portal-ink", mono && "font-mono text-xs")}>
        {value}
      </dd>
    </div>
  );
}

function DetalleEvento({ evento, onClose }: { evento: EventoPortal | null; onClose: () => void }) {
  const T = COPY.portales.admin.auditoria;
  const D = T.detalle;
  if (!evento) return null;

  const rol = rolConocido(evento.actorRol);
  const datos = evento.datos ?? {};
  const hayDatos = Object.keys(datos).length > 0;

  return (
    <Dialog open onClose={onClose} title={D.titulo} maxWidthClassName="max-w-lg">
      <div className="mt-4 space-y-5">
        <dl className="grid grid-cols-2 gap-3">
          <Dato label={D.cuando} value={toDateTime(evento.createdAt)} />
          <Dato label={D.que} value={labelAccionAuditoria(evento.accion)} />
          <Dato
            label={D.quien}
            value={evento.actorNombre ?? (evento.actorId ? T.actorBorrado : T.actorSistema)}
          />
          <Dato
            label={D.rol}
            value={rol ? COPY.portales.roles[rol] : (evento.actorRol ?? D.sinDato)}
          />
          <Dato label={D.recurso} value={labelEntidadAuditoria(evento.entidad)} />
          <Dato label={D.recursoId} value={evento.entidadId ?? D.sinDato} mono />
        </dl>

        {/* Desde dónde: dato personal, solo para el administrador del portal. */}
        <div className="rounded-portal-sm border border-portal-line bg-portal-subtle p-3">
          <p className="text-2xs font-bold uppercase tracking-wide text-portal-muted">
            {D.origenTitulo}
          </p>
          <dl className="mt-2 space-y-2">
            <Dato label={D.ip} value={evento.ip ?? D.sinDato} mono />
            <Dato label={D.dispositivo} value={evento.userAgent ?? D.sinDato} mono />
          </dl>
          <p className="mt-2 text-2xs text-portal-muted">{D.origenNota}</p>
        </div>

        {hayDatos && (
          <div>
            <p className="mb-2 text-2xs font-bold uppercase tracking-wide text-portal-muted">
              {D.datosTitulo}
            </p>
            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-portal-sm border border-portal-line bg-portal-subtle p-3 font-mono text-xs text-portal-ink">
              {JSON.stringify(datos, null, 2)}
            </pre>
          </div>
        )}

        <div className="rounded-portal-sm border border-portal-line bg-portal-subtle p-3">
          <p className="text-2xs font-bold uppercase tracking-wide text-portal-muted">
            {D.selloTitulo}
          </p>
          <dl className="mt-2 space-y-2">
            <Dato label={D.posicion} value={evento.seq != null ? `#${evento.seq}` : D.sinDato} />
            <Dato label={D.sello} value={evento.hash ?? D.sinDato} mono />
            <Dato label={D.selloAnterior} value={evento.prevHash || D.sinDato} mono />
          </dl>
        </div>

        <PButton variant="ghost" pill fullWidth onClick={onClose}>
          {D.cerrar}
        </PButton>
      </div>
    </Dialog>
  );
}
