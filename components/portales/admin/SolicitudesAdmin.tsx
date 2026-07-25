"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Check, X, ArrowRightCircle } from "lucide-react";

import { PButton } from "@/components/portales/ui/PButton";
import { PCard } from "@/components/portales/ui/PCard";
import { PPill } from "@/components/portales/ui/PPill";
import { PTable, PTHead } from "@/components/portales/ui/PTable";
import { PTabs, type PTab } from "@/components/portales/ui/PTabs";
import { Dialog } from "@/components/ui/Dialog";
import { PTextarea } from "@/components/portales/ui/PField";
import { COPY } from "@/lib/copy";
import { toMoneda, toDate, toFileSize } from "@/lib/formatters";
import { labelDoc, TONO_SOLICITUD } from "@/lib/portales/constants";
import { type PortalSlug } from "@/lib/portales/config";
import type { EstadoSolicitud, SolicitudStaff } from "@/lib/portales/data";
import { basePortal } from "@/lib/portales/rutas";

type Filtro = "todas" | EstadoSolicitud;

/**
 * Gestión de SOLICITUDES para el STAFF (client). Filtra por estado, abre el detalle
 * con documentos, y resuelve: aprobar / rechazar (con motivo) / crear oportunidad
 * desde la solicitud. Las acciones van a APIs detrás de requirePortalAdminApi; la
 * verdad la reconcilia el server (router.refresh). Anti doble-submit por acción.
 */
export function SolicitudesAdmin({
  portal,
  solicitudes,
}: {
  portal: PortalSlug;
  solicitudes: SolicitudStaff[];
}) {
  const S = COPY.portales.admin.solicitudes;
  const router = useRouter();
  const base = basePortal(portal);

  const [lista, setLista] = useState<SolicitudStaff[]>(solicitudes);
  // Reconcilia con el server tras cada router.refresh (nuevas props → estado).
  useEffect(() => setLista(solicitudes), [solicitudes]);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [detalle, setDetalle] = useState<SolicitudStaff | null>(null);
  const [rechazando, setRechazando] = useState<SolicitudStaff | null>(null);
  const [motivo, setMotivo] = useState("");
  // Estado de carga por-acción: `${accion}:${id}`; busy bloquea el resto.
  const [accion, setAccion] = useState<string | null>(null);
  const busy = accion !== null;

  const filtradas = useMemo(
    () => (filtro === "todas" ? lista : lista.filter((s) => s.estado === filtro)),
    [lista, filtro],
  );

  const conteo = (e: EstadoSolicitud) => lista.filter((s) => s.estado === e).length;
  const tabs: PTab<Filtro>[] = [
    { id: "todas", label: S.tabs.todas, contador: lista.length },
    { id: "en_evaluacion", label: S.tabs.en_evaluacion, contador: conteo("en_evaluacion"), contadorTono: "alerta" },
    { id: "aprobada", label: S.tabs.aprobada, contador: conteo("aprobada") },
    { id: "rechazada", label: S.tabs.rechazada, contador: conteo("rechazada") },
    { id: "convertida", label: S.tabs.convertida, contador: conteo("convertida") },
    { id: "retirada", label: S.tabs.retirada, contador: conteo("retirada") },
  ];

  async function resolver(sol: SolicitudStaff, aprobar: boolean, motivoTxt?: string) {
    const key = `${aprobar ? "aprobar" : "rechazar"}:${sol.id}`;
    if (busy) return;
    setAccion(key);
    try {
      const res = await fetch(`/api/solicitudes/${sol.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          aprobar ? { accion: "aprobar" } : { accion: "rechazar", motivo: motivoTxt },
        ),
      });
      const payload = (await res.json().catch(() => ({}))) as { resultado?: string };
      if (!res.ok || payload.resultado !== "ok") return void toast.error(S.error);
      toast.success(aprobar ? S.aprobadaOk : S.rechazadaOk);
      setDetalle(null);
      setRechazando(null);
      setMotivo("");
      router.refresh();
    } catch {
      toast.error(S.error);
    } finally {
      setAccion(null);
    }
  }

  async function convertir(sol: SolicitudStaff) {
    const key = `convertir:${sol.id}`;
    if (busy) return;
    setAccion(key);
    try {
      const res = await fetch(`/api/solicitudes/${sol.id}/convertir`, {
        method: "POST",
      });
      const payload = (await res.json().catch(() => ({}))) as {
        resultado?: string;
        oportunidadId?: string;
      };
      if (!res.ok || payload.resultado !== "ok" || !payload.oportunidadId)
        return void toast.error(S.error);
      toast.success(S.convertidaOk);
      // A completar la oportunidad recién creada (tasa, comisión, garantías).
      router.push(`${base}/admin/oportunidades/${payload.oportunidadId}`);
    } catch {
      toast.error(S.error);
    } finally {
      setAccion(null);
    }
  }

  function abrirRechazo(sol: SolicitudStaff) {
    setMotivo("");
    setRechazando(sol);
  }

  function confirmarRechazo() {
    if (!rechazando) return;
    if (motivo.trim().length < 3) return void toast.error(S.rechazoFaltaMotivo);
    void resolver(rechazando, false, motivo.trim());
  }

  const puedeResolver = (s: SolicitudStaff) => s.estado === "en_evaluacion";
  // Lista BLANCA (no negra): solo se convierte lo que sigue vivo. Con "todo menos
  // convertida/rechazada", una solicitud RETIRADA por la empresa habría salido
  // convertible. El server aplica la misma lista blanca (convertirSolicitud).
  const puedeConvertir = (s: SolicitudStaff) =>
    s.estado === "en_evaluacion" || s.estado === "aprobada";

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-portal text-2xl font-extrabold tracking-tight text-portal-ink sm:text-3xl">
          {S.titulo}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-portal-muted">{S.sub}</p>
      </div>

      <PTabs tabs={tabs} activa={filtro} onChange={setFiltro} label={S.titulo} className="mb-4" />

      <PCard className="p-0">
        {lista.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-portal-muted">{S.vacio}</p>
        ) : filtradas.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-portal-muted">{S.vacioFiltro}</p>
        ) : (
          <PTable>
            <PTHead>
              <th className="px-5 py-3">{S.empresaLabel}</th>
              <th className="px-5 py-3">{S.montoLabel}</th>
              <th className="px-5 py-3">{S.plazoLabel}</th>
              <th className="px-5 py-3">{S.fechaLabel}</th>
              <th className="px-5 py-3">{COPY.portales.historial.colEstado}</th>
              <th className="px-5 py-3 text-right">{COPY.portales.admin.prestatarios.colAcciones}</th>
            </PTHead>
            <tbody className="divide-y divide-portal-line">
              {filtradas.map((s) => (
                <tr key={s.id} className="align-middle hover:bg-portal-subtle/60">
                  <td className="px-5 py-3 font-semibold text-portal-ink">{s.prestatarioNombre}</td>
                  <td className="px-5 py-3 tabular-nums text-portal-ink2">
                    {s.monto != null ? toMoneda(s.monto, s.moneda) : "—"}
                  </td>
                  <td className="px-5 py-3 text-portal-ink2">
                    {s.plazoMeses ?? "—"} {COPY.portales.cliente.labels.plazoMeses}
                  </td>
                  <td className="px-5 py-3 text-portal-ink2">{toDate(s.createdAt)}</td>
                  <td className="px-5 py-3">
                    <PPill tone={TONO_SOLICITUD[s.estado]}>{S.estado[s.estado]}</PPill>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end">
                      <PButton variant="ghost" size="sm" pill onClick={() => setDetalle(s)}>
                        {S.verDetalle}
                      </PButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </PTable>
        )}
      </PCard>

      {/* Detalle + acciones */}
      <Dialog open={!!detalle} onClose={() => (busy ? undefined : setDetalle(null))} title={S.detalleTitulo}>
        {detalle && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <PPill tone={TONO_SOLICITUD[detalle.estado]}>{S.estado[detalle.estado]}</PPill>
              <span className="text-xs text-portal-muted">
                {S.fechaLabel} {toDate(detalle.createdAt)}
              </span>
            </div>

            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Campo label={S.empresaLabel} value={detalle.prestatarioNombre} />
              <Campo
                label={S.montoLabel}
                value={detalle.monto != null ? toMoneda(detalle.monto, detalle.moneda) : "—"}
              />
              <Campo
                label={S.plazoLabel}
                value={`${detalle.plazoMeses ?? "—"} ${COPY.portales.cliente.labels.plazoMeses}`}
              />
            </dl>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-portal-muted">
                {S.descripcionLabel}
              </p>
              <p className="mt-1 text-sm text-portal-ink2">
                {detalle.descripcion || S.sinDescripcion}
              </p>
            </div>

            {detalle.estado === "retirada" && (
              <p className="rounded-portal-sm bg-portal-subtle px-3.5 py-3 text-sm text-portal-ink2">
                {S.retiradaNota}
              </p>
            )}

            {detalle.estado === "rechazada" && detalle.motivoRechazo && (
              <div className="rounded-portal-sm border border-portal-danger/30 bg-portal-danger-soft px-3.5 py-3">
                <p className="text-xs font-bold uppercase tracking-wider text-portal-danger">
                  {S.motivoLabel}
                </p>
                <p className="mt-0.5 text-sm text-portal-ink2">{detalle.motivoRechazo}</p>
              </div>
            )}

            {/* Documentos */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-portal-muted">
                {S.docsLabel}
              </p>
              {detalle.docs.length === 0 ? (
                <p className="mt-1 text-sm text-portal-muted">{S.sinDocs}</p>
              ) : (
                <ul className="mt-2 divide-y divide-portal-line rounded-portal-sm border border-portal-line">
                  {detalle.docs.map((d) => (
                    <li key={d.id}>
                      <a
                        href={d.url ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-w-0 items-center gap-3 px-3.5 py-3 transition hover:bg-portal-subtle/60"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-chip bg-portal-primary-soft text-portal-primary-ink">
                          <FileText className="size-4" aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-portal-ink">
                            {labelDoc(d.tipo)}
                          </span>
                          <span className="block truncate text-xs text-portal-muted">
                            {[d.nombre, d.bytes ? toFileSize(d.bytes) : null]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {detalle && (
          <div className="mt-6 flex flex-col gap-2">
            {puedeConvertir(detalle) && (
              <PButton
                pill
                fullWidth
                leadingIcon={<ArrowRightCircle className="size-4" />}
                loading={accion === `convertir:${detalle.id}`}
                disabled={busy}
                onClick={() => convertir(detalle)}
              >
                {accion === `convertir:${detalle.id}` ? S.convirtiendo : S.crearOportunidad}
              </PButton>
            )}
            {puedeResolver(detalle) && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <PButton
                  variant="subtle"
                  pill
                  fullWidth
                  leadingIcon={<Check className="size-4" />}
                  loading={accion === `aprobar:${detalle.id}`}
                  disabled={busy}
                  onClick={() => resolver(detalle, true)}
                >
                  {accion === `aprobar:${detalle.id}` ? S.aprobando : S.aprobar}
                </PButton>
                <PButton
                  variant="danger"
                  pill
                  fullWidth
                  leadingIcon={<X className="size-4" />}
                  disabled={busy}
                  onClick={() => abrirRechazo(detalle)}
                >
                  {S.rechazar}
                </PButton>
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* Rechazo con motivo */}
      <Dialog
        open={!!rechazando}
        onClose={() => (busy ? undefined : setRechazando(null))}
        title={S.rechazoTitulo}
      >
        <div className="space-y-4">
          <PTextarea
            label={S.rechazoMotivo}
            hint={S.rechazoMotivoHint}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            requiredMark
          />
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          <PButton
            variant="danger"
            pill
            fullWidth
            loading={rechazando != null && accion === `rechazar:${rechazando.id}`}
            disabled={busy}
            onClick={confirmarRechazo}
          >
            {rechazando != null && accion === `rechazar:${rechazando.id}`
              ? S.rechazando
              : S.rechazoConfirmar}
          </PButton>
          <PButton variant="ghost" pill fullWidth disabled={busy} onClick={() => setRechazando(null)}>
            {COPY.portales.comun.cancelar}
          </PButton>
        </div>
      </Dialog>
    </div>
  );
}

function Campo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wider text-portal-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold text-portal-ink">{value}</dd>
    </div>
  );
}
