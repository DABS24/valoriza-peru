"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  FileText,
  FilePlus,
  Loader2,
  Trash2,
  MessageCircle,
  Inbox,
  Calculator,
  Pencil,
  XCircle,
} from "lucide-react";

import { PButton } from "@/components/portales/ui/PButton";
import { PCard } from "@/components/portales/ui/PCard";
import { PPill } from "@/components/portales/ui/PPill";
import { PConfirmDialog } from "@/components/portales/ui/PConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { PInput, PSelect, PTextarea } from "@/components/portales/ui/PField";
import { COPY } from "@/lib/copy";
import { ArchivoError } from "@/lib/files";
import { toMoneda, toDate, toFileSize } from "@/lib/formatters";
import { DOC_TIPOS_SUGERIDOS, labelDoc, TONO_SOLICITUD } from "@/lib/portales/constants";
import {
  crearSolicitudPortal,
  editarSolicitudPortal,
  retirarSolicitudPortal,
  subirDocSolicitud,
  borrarDocSolicitud,
} from "@/lib/portales/solicitudes-client";
import { SimuladorEmpresario } from "@/components/portales/empresario/SimuladorEmpresario";
import { FlujoDinero } from "@/components/portales/FlujoDinero";
import type { ReferenciaEmpresario } from "@/lib/portales/tasas";
import type { DocPortalRef } from "@/lib/portales/docs-client";
import { waPortal, type PortalSlug } from "@/lib/portales/config";
import type { SolicitudEmpresario } from "@/lib/portales/data";

interface FormState {
  monto: string;
  moneda: "PEN" | "USD";
  plazo: string;
  descripcion: string;
}

const FORM_VACIO: FormState = { monto: "", moneda: "USD", plazo: "", descripcion: "" };

/** Número positivo de un input de texto, o null (nunca NaN hacia el simulador). */
function num(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Panel de SOLICITUDES del empresario (client). Simula el costo antes de pedir, crea
 * una solicitud (dialog), lista las suyas con su estado y —solo mientras están EN
 * EVALUACIÓN— permite EDITARLA, RETIRARLA, subir/quitar documentos y avisar por
 * WhatsApp. Nada del lado inversionista ni del staff.
 *
 * Editar/retirar acá es UX: quien decide de verdad es el server (route handler con
 * service_role que acota a SU empresa y al estado en la misma sentencia). Si el staff
 * la resolvió mientras tanto, la acción falla y el mensaje pide recargar. La verdad
 * vive en el server (getMisSolicitudes) y se reconcilia con router.refresh.
 */
export function SolicitudesEmpresario({
  portal,
  empresaNombre,
  solicitudes,
  referencia,
}: {
  portal: PortalSlug;
  empresaNombre: string;
  solicitudes: SolicitudEmpresario[];
  /** Interés y comisión de referencia (del server) para la pre-calificación. */
  referencia: ReferenciaEmpresario;
}) {
  const S = COPY.portales.empresario.solicitudes;
  const SIM = COPY.portales.empresario.simulador;
  const router = useRouter();

  const [lista, setLista] = useState<SolicitudEmpresario[]>(solicitudes);
  // Reconcilia con el server tras cada router.refresh (p. ej. al crear una solicitud).
  useEffect(() => setLista(solicitudes), [solicitudes]);
  const [form, setForm] = useState<FormState | null>(null);
  // Id de la solicitud que se está editando (null ⇒ el dialog crea una nueva).
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  // Solicitud pendiente de confirmación para retirar (acción destructiva).
  const [retirando, setRetirando] = useState<SolicitudEmpresario | null>(null);
  // Simulador (pre-calificación): estado propio, independiente del form de envío.
  const [sim, setSim] = useState<FormState>(FORM_VACIO);
  // Estado de docs por solicitud: tipo elegido + subida/borrado en curso (anti doble).
  const [docTipo, setDocTipo] = useState<Record<string, string>>({});
  const [docBusy, setDocBusy] = useState<string | null>(null);

  const wa = waPortal(portal, S.waMensaje(empresaNombre));
  const set = (patch: Partial<FormState>) => setForm((f) => (f ? { ...f, ...patch } : f));

  function abrirNueva() {
    setEditandoId(null);
    setForm(FORM_VACIO);
  }

  function abrirEdicion(sol: SolicitudEmpresario) {
    setEditandoId(sol.id);
    setForm({
      monto: sol.monto != null ? String(sol.monto) : "",
      moneda: sol.moneda,
      plazo: sol.plazoMeses != null ? String(sol.plazoMeses) : "",
      descripcion: sol.descripcion ?? "",
    });
  }

  function cerrarForm() {
    if (guardando) return;
    setForm(null);
    setEditandoId(null);
  }

  /** Envía el form: crea una solicitud nueva o guarda la edición de una existente. */
  async function guardar() {
    if (guardando || !form) return;
    const monto = Number(form.monto);
    const plazo = Number(form.plazo);
    if (!Number.isFinite(monto) || monto <= 0) return void toast.error(S.form.faltaMonto);
    if (!Number.isInteger(plazo) || plazo < 1 || plazo > 120)
      return void toast.error(S.form.faltaPlazo);
    const editando = editandoId;
    const input = {
      portal,
      monto,
      moneda: form.moneda,
      plazoMeses: plazo,
      descripcion: form.descripcion,
    };
    setGuardando(true);
    try {
      const ok = editando
        ? await editarSolicitudPortal(editando, input)
        : Boolean(await crearSolicitudPortal(input));
      if (!ok) return void toast.error(editando ? S.form.errorEditar : S.form.error);
      toast.success(editando ? S.form.editada : S.form.creada);
      setForm(null);
      setEditandoId(null);
      router.refresh();
    } catch {
      toast.error(editando ? S.form.errorEditar : S.form.error);
    } finally {
      setGuardando(false);
    }
  }

  /** Retira la solicitud (confirmada). El server verifica que siga en evaluación. */
  async function retirar(sol: SolicitudEmpresario) {
    const ok = await retirarSolicitudPortal(sol.id).catch(() => false);
    if (!ok) return void toast.error(S.retiro.error);
    toast.success(S.retiro.ok);
    setRetirando(null);
    router.refresh();
  }

  async function onDoc(sol: SolicitudEmpresario, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || docBusy) return;
    const tipo = docTipo[sol.id] ?? DOC_TIPOS_SUGERIDOS[0];
    setDocBusy(sol.id);
    try {
      const ref = await subirDocSolicitud({ solicitudId: sol.id, tipo, file });
      if (!ref) return void toast.error(S.docs.error);
      actualizarDocs(sol.id, (docs) => [...docs, ref]);
    } catch (err) {
      toast.error(err instanceof ArchivoError ? err.message : S.docs.error);
    } finally {
      setDocBusy(null);
    }
  }

  async function quitarDoc(sol: SolicitudEmpresario, docId: string) {
    if (docBusy) return;
    setDocBusy(sol.id);
    try {
      const ok = await borrarDocSolicitud(sol.id, docId);
      if (!ok) return void toast.error(COPY.portales.comun.error);
      actualizarDocs(sol.id, (docs) => docs.filter((d) => d.id !== docId));
    } finally {
      setDocBusy(null);
    }
  }

  function actualizarDocs(solId: string, fn: (docs: DocPortalRef[]) => DocPortalRef[]) {
    setLista((prev) =>
      prev.map((s) => (s.id === solId ? { ...s, docs: fn(s.docs as DocPortalRef[]) } : s)),
    );
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-portal text-2xl font-extrabold tracking-tight text-portal-ink sm:text-3xl">
            {S.titulo}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-portal-muted">{S.sub}</p>
        </div>
        <PButton pill leadingIcon={<Plus className="size-4" />} onClick={abrirNueva}>
          {S.nueva}
        </PButton>
      </header>

      {/* Pre-calificación: simular el costo ANTES de enviar nada. */}
      <PCard className="mb-6">
        <h2 className="flex items-center gap-2 font-portal text-lg font-bold text-portal-ink">
          <Calculator className="size-5 shrink-0 text-portal-primary" aria-hidden />
          {SIM.titulo}
        </h2>
        <p className="mt-1 text-sm text-portal-muted">{SIM.sub}</p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <PInput
            label={SIM.monto}
            type="number"
            inputMode="decimal"
            min={0}
            value={sim.monto}
            onChange={(e) => setSim({ ...sim, monto: e.target.value })}
          />
          <PSelect
            label={SIM.moneda}
            value={sim.moneda}
            onChange={(e) => setSim({ ...sim, moneda: e.target.value as "PEN" | "USD" })}
          >
            <option value="USD">USD</option>
            <option value="PEN">PEN</option>
          </PSelect>
          <PInput
            label={SIM.plazo}
            type="number"
            inputMode="numeric"
            min={1}
            max={120}
            hint={SIM.plazoHint}
            value={sim.plazo}
            onChange={(e) => setSim({ ...sim, plazo: e.target.value })}
          />
        </div>

        <div className="mt-4">
          <SimuladorEmpresario
            monto={num(sim.monto)}
            plazoMeses={num(sim.plazo)}
            moneda={sim.moneda}
            referencia={referencia}
          />
        </div>

        {num(sim.monto) != null && num(sim.plazo) != null && (
          <PButton
            pill
            className="mt-4"
            leadingIcon={<FilePlus className="size-4" />}
            onClick={() => {
              setEditandoId(null);
              setForm({ ...sim, descripcion: "" });
            }}
          >
            {SIM.usarDatos}
          </PButton>
        )}
      </PCard>

      {/* Justo debajo del "Recibes": de dónde sale ese neto y a dónde va la comisión.
          Sin esto, "recibes = monto − comisión" se lee como que el dinero entra por
          una cuenta nuestra y nosotros repartimos. */}
      <FlujoDinero faceta="empresario" className="mb-6" />

      {lista.length === 0 ? (
        <PCard className="text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-chip bg-portal-primary-soft text-portal-primary-ink">
            <Inbox className="size-6" aria-hidden />
          </span>
          <p className="mx-auto mt-4 max-w-md text-sm text-portal-ink2">{S.vacio}</p>
          <PButton
            pill
            className="mt-5"
            leadingIcon={<Plus className="size-4" />}
            onClick={abrirNueva}
          >
            {S.nueva}
          </PButton>
        </PCard>
      ) : (
        <div className="space-y-4">
          {lista.map((sol) => {
            const enEvaluacion = sol.estado === "en_evaluacion";
            const tipoSel = docTipo[sol.id] ?? DOC_TIPOS_SUGERIDOS[0];
            const busy = docBusy === sol.id;
            return (
              <PCard key={sol.id} className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <PPill tone={TONO_SOLICITUD[sol.estado]}>{S.estado[sol.estado]}</PPill>
                      <span className="text-xs text-portal-muted">
                        {S.creadaLabel} {toDate(sol.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 font-portal text-lg font-bold tabular-nums text-portal-ink">
                      {sol.monto != null ? toMoneda(sol.monto, sol.moneda) : "—"}
                    </p>
                    <p className="text-sm text-portal-ink2">
                      {S.plazoLabel}: {sol.plazoMeses ?? "—"}{" "}
                      {COPY.portales.cliente.labels.plazoMeses}
                    </p>
                  </div>

                  {/* Editar / retirar: solo mientras sigue en evaluación. */}
                  {enEvaluacion && (
                    <div className="flex flex-wrap gap-2">
                      <PButton
                        variant="ghost"
                        size="sm"
                        pill
                        leadingIcon={<Pencil className="size-4" />}
                        onClick={() => abrirEdicion(sol)}
                      >
                        {S.editar}
                      </PButton>
                      <PButton
                        variant="ghost"
                        size="sm"
                        pill
                        leadingIcon={<XCircle className="size-4" />}
                        onClick={() => setRetirando(sol)}
                      >
                        {S.retirar}
                      </PButton>
                    </div>
                  )}
                </div>

                <p className="text-sm text-portal-muted">{S.estadoAyuda[sol.estado]}</p>

                {sol.descripcion && (
                  <p className="rounded-portal-sm bg-portal-subtle/60 px-3.5 py-3 text-sm text-portal-ink2">
                    {sol.descripcion}
                  </p>
                )}

                {sol.estado === "rechazada" && sol.motivoRechazo && (
                  <div className="rounded-portal-sm border border-portal-danger/30 bg-portal-danger-soft px-3.5 py-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-portal-danger">
                      {S.motivoLabel}
                    </p>
                    <p className="mt-0.5 text-sm text-portal-ink2">{sol.motivoRechazo}</p>
                  </div>
                )}

                {/* Documentos */}
                <div className="border-t border-portal-line pt-4">
                  <p className="font-portal text-sm font-bold text-portal-ink">{S.docs.titulo}</p>
                  <p className="mt-0.5 text-xs text-portal-muted">{S.docs.sub}</p>

                  {sol.docs.length === 0 ? (
                    <p className="mt-3 text-sm text-portal-muted">{S.docs.sinDocs}</p>
                  ) : (
                    <ul className="mt-3 divide-y divide-portal-line rounded-portal-sm border border-portal-line">
                      {sol.docs.map((d) => (
                        <li
                          key={d.id}
                          className="flex items-center justify-between gap-3 px-3.5 py-3"
                        >
                          <a
                            href={d.url ?? undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex min-w-0 items-center gap-3 text-left"
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
                          {enEvaluacion && (
                            <button
                              type="button"
                              onClick={() => quitarDoc(sol, d.id)}
                              disabled={busy}
                              className="shrink-0 rounded-chip p-2 text-portal-muted transition hover:bg-portal-danger-soft hover:text-portal-danger disabled:opacity-50"
                              aria-label={S.docs.quitar}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {enEvaluacion ? (
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                      <div className="flex-1">
                        <PSelect
                          label={S.docs.tipo}
                          value={tipoSel}
                          onChange={(e) => setDocTipo((t) => ({ ...t, [sol.id]: e.target.value }))}
                        >
                          {DOC_TIPOS_SUGERIDOS.map((t) => (
                            <option key={t} value={t}>
                              {labelDoc(t)}
                            </option>
                          ))}
                        </PSelect>
                      </div>
                      <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-portal-sm bg-portal-primary-soft px-5 py-3 font-portal text-sm font-semibold text-portal-primary-ink transition hover:bg-portal-primary/15">
                        {busy ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <FilePlus className="size-4" />
                        )}
                        <span>{busy ? S.docs.subiendo : S.docs.subir}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          className="sr-only"
                          onChange={(e) => onDoc(sol, e)}
                          disabled={busy}
                        />
                      </label>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-portal-muted">{S.docs.soloEnEvaluacion}</p>
                  )}
                </div>

                {enEvaluacion && (
                  <p className="text-xs text-portal-muted">{S.soloEnEvaluacionAcciones}</p>
                )}

                {/* WhatsApp (opcional) */}
                {enEvaluacion && (
                  <div className="border-t border-portal-line pt-4">
                    <PButton
                      as="link"
                      href={wa}
                      external
                      variant="ghost"
                      pill
                      size="sm"
                      leadingIcon={<MessageCircle className="size-4" />}
                    >
                      {S.waAviso}
                    </PButton>
                    <p className="mt-2 text-xs text-portal-muted">{S.waNota}</p>
                  </div>
                )}
              </PCard>
            );
          })}
        </div>
      )}

      {/* Dialog: nueva solicitud / editar la propia (el mismo form) */}
      <Dialog
        open={!!form}
        onClose={cerrarForm}
        title={editandoId ? S.form.tituloEditar : S.form.titulo}
      >
        {form && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <PInput
                label={S.form.monto}
                type="number"
                inputMode="decimal"
                value={form.monto}
                onChange={(e) => set({ monto: e.target.value })}
                requiredMark
              />
              <PSelect
                label={S.form.moneda}
                value={form.moneda}
                onChange={(e) => set({ moneda: e.target.value as "PEN" | "USD" })}
              >
                <option value="USD">USD</option>
                <option value="PEN">PEN</option>
              </PSelect>
            </div>
            <PInput
              label={S.form.plazo}
              type="number"
              inputMode="numeric"
              hint={S.form.plazoHint}
              value={form.plazo}
              onChange={(e) => set({ plazo: e.target.value })}
              requiredMark
            />
            <PTextarea
              label={S.form.descripcion}
              hint={S.form.descripcionHint}
              value={form.descripcion}
              onChange={(e) => set({ descripcion: e.target.value })}
            />

            {/* El mismo número del simulador, ahora sobre lo que va a enviar. */}
            <div className="border-t border-portal-line pt-4">
              <SimuladorEmpresario
                monto={num(form.monto)}
                plazoMeses={num(form.plazo)}
                moneda={form.moneda}
                referencia={referencia}
              />
            </div>
          </div>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          <PButton pill fullWidth loading={guardando} disabled={guardando} onClick={guardar}>
            {editandoId
              ? guardando
                ? S.form.guardando
                : S.form.guardar
              : guardando
                ? S.form.enviando
                : S.form.enviar}
          </PButton>
          <PButton variant="ghost" pill fullWidth disabled={guardando} onClick={cerrarForm}>
            {COPY.portales.comun.cancelar}
          </PButton>
        </div>
      </Dialog>

      {/* Retirar: destructivo ⇒ confirmación explícita (el guard anti doble-lanzamiento
          vive dentro de PConfirmDialog mientras la promesa esté pendiente). */}
      <PConfirmDialog
        open={!!retirando}
        onClose={() => setRetirando(null)}
        onConfirm={() => (retirando ? retirar(retirando) : undefined)}
        title={S.retiro.titulo}
        description={S.retiro.texto}
        confirmLabel={S.retiro.confirmar}
        cancelLabel={COPY.portales.comun.cancelar}
        variant="destructive"
      />
    </div>
  );
}
