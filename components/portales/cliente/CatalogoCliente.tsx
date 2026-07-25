"use client";

import { useMemo, useState } from "react";
import { Search, Compass } from "lucide-react";

import { PTabs, type PTab } from "@/components/portales/ui/PTabs";
import { PButton } from "@/components/portales/ui/PButton";
import { PInput, PSelect } from "@/components/portales/ui/PField";
import { PNota } from "@/components/portales/ui/PNota";
import { COPY } from "@/lib/copy";
import { type PortalSlug } from "@/lib/portales/config";
import { NIVELES_RIESGO } from "@/lib/portales/constants";
import type { OportunidadLite, MiAsesor, OpcionTitular } from "@/lib/portales/data";
import { OportunidadCard } from "@/components/portales/OportunidadCard";
import { AccionesReserva } from "@/components/portales/cliente/AccionesReserva";
import { BloquearPara } from "@/components/portales/asesor/BloquearPara";
import { basePortal } from "@/lib/portales/rutas";

type FiltroEstado = "todas" | "disponible" | "reservada";

/**
 * Catálogo del inversionista (estilo InversionNPL): guía de pasos, buscador +
 * filtro por riesgo + pestañas por estado, y la grilla de oportunidades. La data
 * nunca trae notas internas (catalogoParaCliente).
 *
 * El botón principal de una op disponible depende de quién mira:
 *   · CLIENTE → "Reservar" (self-service).
 *   · STAFF   → "Bloquear para un cliente": este es el barrido del pool del asesor
 *     y el acto central de su trabajo. Antes acá solo podía mirar.
 */
export function CatalogoCliente({
  portal,
  oportunidades,
  miId,
  asesor,
  esCliente,
  esStaff = false,
  titulares = [],
}: {
  portal: PortalSlug;
  oportunidades: OportunidadLite[];
  miId: string;
  asesor: MiAsesor | null;
  esCliente: boolean;
  /** Quien mira es asesor/admin: ve la acción de bloquear a nombre de alguien. */
  esStaff?: boolean;
  /** Su cartera (clientes con cuenta + prospectos). Vacía si no es staff. */
  titulares?: OpcionTitular[];
}) {
  const T = COPY.portales;
  const C = T.cliente;
  const base = basePortal(portal);

  const [q, setQ] = useState("");
  const [riesgo, setRiesgo] = useState("");
  const [estado, setEstado] = useState<FiltroEstado>("todas");

  const filtradas = useMemo(() => {
    const texto = q.trim().toLowerCase();
    return oportunidades.filter((op) => {
      if (estado !== "todas" && op.estadoPublicacion !== estado) return false;
      if (riesgo && op.nivelRiesgo !== riesgo) return false;
      if (texto) {
        const heno = `${op.titulo} ${op.distrito ?? ""} ${op.ciudad ?? ""}`.toLowerCase();
        if (!heno.includes(texto)) return false;
      }
      return true;
    });
  }, [oportunidades, q, riesgo, estado]);

  const tabs: PTab<FiltroEstado>[] = [
    { id: "todas", label: C.tabTodas, contador: oportunidades.length },
    {
      id: "disponible",
      label: C.tabDisponibles,
      contador: oportunidades.filter((o) => o.estadoPublicacion === "disponible").length,
    },
    {
      id: "reservada",
      label: C.tabReservadas,
      contador: oportunidades.filter((o) => o.estadoPublicacion === "reservada").length,
    },
  ];

  return (
    <div>
      <header className="mb-5">
        <h1 className="font-portal text-2xl font-extrabold tracking-tight text-portal-ink sm:text-3xl">
          {C.catalogoTitulo}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-portal-muted">{C.catalogoSub}</p>
      </header>

      {/* Guía rápida de pasos */}
      <ol className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-2 rounded-portal border border-portal-line bg-portal-surface p-4 text-sm shadow-portal">
        {C.guiaPasos.map((paso, i) => (
          <li key={paso} className="flex items-center gap-2">
            <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-portal-primary text-xs font-bold text-white">
              {i + 1}
            </span>
            <span className="font-semibold text-portal-ink">{paso}</span>
            {i < C.guiaPasos.length - 1 && <span className="mx-1 text-portal-line2">→</span>}
          </li>
        ))}
      </ol>

      {/* Filtros */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <PInput
            aria-label={C.buscarPlaceholder}
            placeholder={C.buscarPlaceholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            leadingIcon={<Search className="size-4" />}
          />
        </div>
        <div className="w-full sm:w-56">
          <PSelect
            aria-label={C.filtroRiesgo}
            value={riesgo}
            onChange={(e) => setRiesgo(e.target.value)}
          >
            <option value="">{C.filtroTodosRiesgos}</option>
            {NIVELES_RIESGO.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </PSelect>
        </div>
      </div>

      <div className="mb-6">
        <PTabs tabs={tabs} activa={estado} onChange={setEstado} label={C.catalogoTitulo} />
      </div>

      {oportunidades.length === 0 ? (
        <div className="rounded-portal border border-dashed border-portal-line2 bg-portal-surface p-10 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-chip bg-portal-primary-soft text-portal-primary-ink">
            <Compass className="size-6" aria-hidden />
          </span>
          <p className="mt-4 text-sm font-medium text-portal-muted">{C.vacio}</p>
        </div>
      ) : filtradas.length === 0 ? (
        <div className="rounded-portal border border-dashed border-portal-line2 bg-portal-surface p-10 text-center">
          <p className="text-sm font-medium text-portal-muted">{C.sinResultados}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtradas.map((op) => (
            <OportunidadCard
              key={op.id}
              op={op}
              mostrarEstado={op.estadoPublicacion === "reservada"}
              href={`${base}/cliente/oportunidades/${op.id}`}
              acciones={
                <div className="flex w-full flex-col gap-2">
                  <PButton
                    as="link"
                    href={`${base}/cliente/oportunidades/${op.id}`}
                    variant="ghost"
                    size="sm"
                    pill
                    fullWidth
                  >
                    {T.card.verDetalle}
                  </PButton>
                  {esCliente && (
                    <AccionesReserva portal={portal} op={op} miId={miId} asesor={asesor} fullWidth />
                  )}
                  {esStaff && op.estadoPublicacion === "disponible" && (
                    <BloquearPara
                      oportunidadId={op.id}
                      titulares={titulares}
                      fullWidth
                    />
                  )}
                </div>
              }
            />
          ))}
        </div>
      )}

      {/* Nota neutra */}
      <PNota className="mt-10">{C.nota}</PNota>

      {/* Disclaimer de capital en riesgo (SSOT) al pie del catálogo. */}
      <p className="mt-4 text-center text-xs leading-relaxed text-portal-muted">
        {T.disclaimerCapital}
      </p>
    </div>
  );
}
