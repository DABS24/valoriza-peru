"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

import { PButton } from "@/components/portales/ui/PButton";
import { PCard } from "@/components/portales/ui/PCard";
import { PPill } from "@/components/portales/ui/PPill";
import { PTable, PTHead } from "@/components/portales/ui/PTable";
import { PNota } from "@/components/portales/ui/PNota";
import { PTabs, type PTab } from "@/components/portales/ui/PTabs";
import { COPY } from "@/lib/copy";
import { toDate } from "@/lib/formatters";
import type { ReservaStaff } from "@/lib/portales/data";
import { CuentaRegresiva } from "@/components/portales/CuentaRegresiva";

type Vista = "pendientes" | "confirmadas";
type Filtro = "mias" | "todas";

/**
 * Cola de reservas del staff en dos vistas:
 *  · Pendientes → las ACTIVAS: Confirmar (→ cerrada) o Liberar (→ pool).
 *  · Confirmadas → cierre del ciclo: Marcar FINANCIADA (transferencia hecha).
 * El asesor ve por defecto las de SUS clientes (asesor_id = él) con opción de ver
 * todas; el admin arranca en "todas". Feedback por-acción (`accion`), anti
 * doble-submit. Las transiciones activas son atómicas server-side; marcar
 * financiada es un UPDATE condicional atómico (route /financiar).
 */
export function ReservasCola({
  activas,
  confirmadas,
  miId,
  defaultSoloMias,
}: {
  activas: ReservaStaff[];
  confirmadas: ReservaStaff[];
  miId: string;
  defaultSoloMias: boolean;
}) {
  const T = COPY.portales.asesor.reservas;
  const router = useRouter();

  const [listaActivas, setListaActivas] = useState<ReservaStaff[]>(activas);
  const [listaConfirmadas, setListaConfirmadas] = useState<ReservaStaff[]>(confirmadas);
  const [vista, setVista] = useState<Vista>("pendientes");
  const [filtro, setFiltro] = useState<Filtro>(defaultSoloMias ? "mias" : "todas");
  const [accion, setAccion] = useState<string | null>(null);
  const busy = accion !== null;

  const fuente = vista === "pendientes" ? listaActivas : listaConfirmadas;
  const mias = useMemo(() => fuente.filter((r) => r.asesorId === miId), [fuente, miId]);
  const visibles = filtro === "mias" ? mias : fuente;

  const vistaTabs: PTab<Vista>[] = [
    {
      id: "pendientes",
      label: T.tabPendientes,
      contador: listaActivas.length,
      contadorTono: "alerta",
    },
    { id: "confirmadas", label: T.tabConfirmadas, contador: listaConfirmadas.length },
  ];
  const filtroTabs: PTab<Filtro>[] = [
    { id: "mias", label: T.soloMias, contador: mias.length, contadorTono: "alerta" },
    { id: "todas", label: COPY.portales.admin.oportunidades.filtroTodos, contador: fuente.length },
  ];

  async function resolver(op: string, tipo: "confirmar" | "liberar") {
    if (busy) return;
    setAccion(`${tipo}:${op}`);
    try {
      const res = await fetch(`/api/reservas/${op}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: tipo }),
      });
      const p = (await res.json().catch(() => ({}))) as { resultado?: string };
      if (!res.ok || p.resultado === "sin_acceso") {
        toast.error(T.sinAcceso);
        return;
      }
      if (p.resultado === "no_reservada") {
        toast.error(T.noReservada);
        setListaActivas((prev) => prev.filter((r) => r.oportunidadId !== op));
        router.refresh();
        return;
      }
      toast.success(tipo === "confirmar" ? T.confirmarOk : T.liberarOk);
      // Confirmar mueve la reserva a la vista de confirmadas; liberar la saca del todo.
      const movida = listaActivas.find((r) => r.oportunidadId === op);
      setListaActivas((prev) => prev.filter((r) => r.oportunidadId !== op));
      if (tipo === "confirmar" && movida) {
        setListaConfirmadas((prev) => [{ ...movida, estado: "confirmada" }, ...prev]);
      }
      router.refresh();
    } catch {
      toast.error(T.error);
    } finally {
      setAccion(null);
    }
  }

  async function financiar(op: string) {
    if (busy) return;
    setAccion(`financiar:${op}`);
    try {
      const res = await fetch(`/api/oportunidades/${op}/financiar`, {
        method: "PATCH",
      });
      const p = (await res.json().catch(() => ({}))) as { resultado?: string };
      if (!res.ok) {
        toast.error(res.status === 403 ? T.sinAcceso : T.error);
        return;
      }
      if (p.resultado !== "ok") {
        toast.error(T.financiadaNoAplica);
        router.refresh();
        return;
      }
      toast.success(T.financiadaOk);
      const ahora = new Date().toISOString();
      setListaConfirmadas((prev) =>
        prev.map((r) => (r.oportunidadId === op ? { ...r, financiadaEn: ahora } : r)),
      );
      router.refresh();
    } catch {
      toast.error(T.error);
    } finally {
      setAccion(null);
    }
  }

  const vacio = vista === "pendientes" ? T.vacio : T.vacioConfirmadas;

  return (
    <div>
      <header className="mb-5">
        <h1 className="font-portal text-2xl font-extrabold tracking-tight text-portal-ink sm:text-3xl">
          {T.titulo}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-portal-muted">{T.sub}</p>
      </header>

      <div className="mb-4">
        <PTabs tabs={vistaTabs} activa={vista} onChange={setVista} label={T.titulo} />
      </div>
      <div className="mb-6">
        <PTabs tabs={filtroTabs} activa={filtro} onChange={setFiltro} label={T.soloMias} />
      </div>

      {visibles.length === 0 ? (
        <div className="rounded-portal border border-dashed border-portal-line2 bg-portal-surface p-10 text-center">
          <p className="text-sm font-medium text-portal-muted">{vacio}</p>
        </div>
      ) : (
        <PCard className="p-0">
          <PTable>
            <PTHead>
              <th className="px-5 py-3">{T.colOportunidad}</th>
              <th className="px-5 py-3">{T.colCliente}</th>
              <th className="px-5 py-3">{vista === "pendientes" ? T.colVence : T.colEstado}</th>
              <th className="px-5 py-3 text-right">{T.colAcciones}</th>
            </PTHead>
            <tbody className="divide-y divide-portal-line">
              {visibles.map((r) => (
                <tr key={r.id} className="align-middle hover:bg-portal-subtle/60">
                  <td className="px-5 py-3 font-semibold text-portal-ink">{r.oportunidadTitulo}</td>
                  <td className="px-5 py-3 text-portal-ink2">{r.clienteNombre}</td>
                  <td className="px-5 py-3 text-portal-ink2">
                    {vista === "pendientes" ? (
                      <CuentaRegresiva hasta={r.venceEn} />
                    ) : r.financiadaEn ? (
                      <PPill
                        tone="money"
                        leadingIcon={<CheckCircle2 className="size-3.5" aria-hidden />}
                      >
                        {T.financiadaBadge}
                      </PPill>
                    ) : (
                      <PPill tone="gold">{T.confirmadaBadge}</PPill>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      {vista === "pendientes" ? (
                        <>
                          <PButton
                            variant="primary"
                            size="sm"
                            pill
                            loading={accion === `confirmar:${r.oportunidadId}`}
                            disabled={busy}
                            onClick={() => resolver(r.oportunidadId, "confirmar")}
                          >
                            {T.confirmar}
                          </PButton>
                          <PButton
                            variant="ghost"
                            size="sm"
                            pill
                            loading={accion === `liberar:${r.oportunidadId}`}
                            disabled={busy}
                            onClick={() => resolver(r.oportunidadId, "liberar")}
                          >
                            {T.liberar}
                          </PButton>
                        </>
                      ) : r.financiadaEn ? (
                        <span className="text-xs font-medium text-portal-muted">
                          {toDate(r.financiadaEn)}
                        </span>
                      ) : (
                        <PButton
                          variant="primary"
                          size="sm"
                          pill
                          loading={accion === `financiar:${r.oportunidadId}`}
                          disabled={busy}
                          onClick={() => financiar(r.oportunidadId)}
                        >
                          {T.marcarFinanciada}
                        </PButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </PTable>
        </PCard>
      )}

      <PNota className="mt-8">{vista === "pendientes" ? T.nota : T.notaFinanciada}</PNota>
    </div>
  );
}
