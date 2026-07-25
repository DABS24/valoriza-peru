"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { PButton } from "@/components/portales/ui/PButton";
import { PPill } from "@/components/portales/ui/PPill";
import { PTabs, type PTab } from "@/components/portales/ui/PTabs";
import { COPY } from "@/lib/copy";
import { type PortalSlug, type PortalEstadoOportunidad } from "@/lib/portales/config";
import { ESTADOS_PUBLICACION } from "@/lib/portales/constants";
import type { OportunidadStaff } from "@/lib/portales/data";
import { OportunidadCard } from "@/components/portales/OportunidadCard";
import { basePortal } from "@/lib/portales/rutas";

/** "incompletas" es un filtro transversal: cruza estados, no es uno de ellos. */
type Filtro = "todas" | "incompletas" | PortalEstadoOportunidad;

export function OportunidadesLista({
  portal,
  oportunidades,
}: {
  portal: PortalSlug;
  oportunidades: OportunidadStaff[];
}) {
  const T = COPY.portales.admin.oportunidades;
  const TF = COPY.portales.admin.pendientes.falta;
  const base = basePortal(portal);
  const [filtro, setFiltro] = useState<Filtro>("todas");

  const incompletas = useMemo(
    () => oportunidades.filter((o) => o.faltantes.length > 0),
    [oportunidades],
  );

  const tabs: PTab<Filtro>[] = useMemo(
    () => [
      { id: "todas", label: T.filtroTodos, contador: oportunidades.length },
      ...ESTADOS_PUBLICACION.map((e) => ({
        id: e.id,
        label: e.label,
        contador: oportunidades.filter((o) => o.estadoPublicacion === e.id).length,
      })),
      // Solo aparece cuando hay algo que arreglar: una pestaña en 0 permanente es ruido.
      ...(incompletas.length > 0
        ? [
            {
              id: "incompletas" as const,
              label: T.filtroIncompletas,
              contador: incompletas.length,
              contadorTono: "alerta" as const,
            },
          ]
        : []),
    ],
    [oportunidades, incompletas.length, T.filtroTodos, T.filtroIncompletas],
  );

  const visibles =
    filtro === "todas"
      ? oportunidades
      : filtro === "incompletas"
        ? incompletas
        : oportunidades.filter((o) => o.estadoPublicacion === filtro);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-portal text-2xl font-extrabold tracking-tight text-portal-ink sm:text-3xl">
            {T.titulo}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-portal-muted">{T.sub}</p>
        </div>
        <PButton
          as="link"
          href={`${base}/admin/oportunidades/nueva`}
          pill
          leadingIcon={<Plus className="size-4" />}
        >
          {T.nueva}
        </PButton>
      </div>

      <div className="mb-6">
        <PTabs tabs={tabs} activa={filtro} onChange={setFiltro} label={T.titulo} />
      </div>

      {visibles.length === 0 ? (
        <div className="rounded-portal border border-dashed border-portal-line2 bg-portal-surface p-10 text-center">
          <p className="text-sm font-medium text-portal-muted">{T.vacio}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((op) => (
            <OportunidadCard
              key={op.id}
              op={op}
              href={`${base}/admin/oportunidades/${op.id}`}
              aviso={
                op.faltantes.length > 0 ? (
                  <div className="rounded-portal-sm border border-portal-danger/30 bg-portal-danger-soft p-3">
                    <p className="text-xs font-bold text-portal-danger">{T.avisoIncompleta}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {op.faltantes.map((f) => (
                        <PPill key={f} tone="alert" className="px-2 py-0.5">
                          {TF[f]}
                        </PPill>
                      ))}
                    </div>
                  </div>
                ) : undefined
              }
              acciones={
                <PButton
                  as="link"
                  href={`${base}/admin/oportunidades/${op.id}`}
                  variant="ghost"
                  size="sm"
                  pill
                  fullWidth
                >
                  {T.editar}
                </PButton>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
