"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { NotebookPen, Plus, Check, RotateCcw, Trash2, Lock, AlarmClock } from "lucide-react";

import { PButton } from "@/components/portales/ui/PButton";
import { PCard } from "@/components/portales/ui/PCard";
import { PPill } from "@/components/portales/ui/PPill";
import { PTextarea, PInput } from "@/components/portales/ui/PField";
import { PConfirmDialog } from "@/components/portales/ui/PConfirmDialog";
import { COPY } from "@/lib/copy";
import { cn } from "@/lib/cn";
import { toDate, toDateTime } from "@/lib/formatters";
import { fechaRecordatorioISO, recordatorioVencido } from "@/lib/portales/asesor";
import type { RefTitular } from "@/lib/portales/asesor";
import { crearNotaPortal, marcarNotaPortal, borrarNotaPortal } from "@/lib/portales/notas-client";
import type { NotaCliente } from "@/lib/portales/data";

/**
 * Libreta del asesor sobre UN sujeto de su cartera: un cliente con cuenta o un
 * PROSPECTO que todavía no la tiene (0086/0090) — la misma libreta, porque el
 * seguimiento arranca antes de que exista la cuenta. Client porque escribe y
 * porque la urgencia del recordatorio es time-relative (se recalcula al montar).
 * La lista llega YA autorizada desde el server (la ficha solo se abre si el sujeto
 * es suyo) y toda escritura se re-autoriza server-side: acá no se decide permiso,
 * solo se pinta y se deshabilita lo que no corresponde.
 *
 * Estado de carga POR ACCIÓN (§4): `accion` guarda el id de lo que está corriendo;
 * mientras tanto todo queda deshabilitado y solo esa fila muestra su spinner.
 * Mobile-first: la nota apila su texto y sus acciones; en desktop van en fila.
 */
export function NotasCliente({ sujeto, notas }: { sujeto: RefTitular; notas: NotaCliente[] }) {
  const T = COPY.portales.asesor.notas;

  const [lista, setLista] = useState<NotaCliente[]>(notas);
  // Reconcilia con el server tras un refresh de la página (la verdad es el server).
  useEffect(() => setLista(notas), [notas]);

  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [fecha, setFecha] = useState("");
  const [accion, setAccion] = useState<string | null>(null);
  const [porBorrar, setPorBorrar] = useState<NotaCliente | null>(null);
  const ocupado = accion !== null;

  // La urgencia se calcula con un `ahora` de estado (no en el render del server):
  // así el HTML del server y el del cliente coinciden y no hay salto de hidratación.
  const [ahora, setAhora] = useState<number | null>(null);
  useEffect(() => setAhora(Date.now()), []);

  async function guardar() {
    if (ocupado) return;
    if (!texto.trim()) return void toast.error(T.faltaTexto);
    setAccion("nueva");
    try {
      const nota = await crearNotaPortal({
        sujeto,
        texto,
        recordarEn: fechaRecordatorioISO(fecha),
      });
      if (!nota) return void toast.error(T.error);
      setLista((prev) => [nota, ...prev]);
      setTexto("");
      setFecha("");
      setAbierto(false);
      toast.success(T.creada);
    } catch {
      toast.error(T.error);
    } finally {
      setAccion(null);
    }
  }

  async function alternarHecha(nota: NotaCliente) {
    if (ocupado) return;
    setAccion(nota.id);
    try {
      const ok = await marcarNotaPortal(nota.id, !nota.hecha);
      if (!ok) return void toast.error(T.error);
      setLista((prev) => prev.map((n) => (n.id === nota.id ? { ...n, hecha: !nota.hecha } : n)));
    } catch {
      toast.error(T.error);
    } finally {
      setAccion(null);
    }
  }

  async function borrar(nota: NotaCliente) {
    if (ocupado) return;
    setAccion(nota.id);
    try {
      const ok = await borrarNotaPortal(nota.id);
      if (!ok) return void toast.error(T.error);
      setLista((prev) => prev.filter((n) => n.id !== nota.id));
      toast.success(T.borrada);
    } catch {
      toast.error(T.error);
    } finally {
      setAccion(null);
      setPorBorrar(null);
    }
  }

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-portal text-lg font-bold text-portal-ink">
            <NotebookPen className="size-5 text-portal-primary" aria-hidden />
            {T.titulo}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-portal-muted">{T.sub}</p>
        </div>
        {!abierto && (
          <PButton
            pill
            size="sm"
            disabled={ocupado}
            leadingIcon={<Plus className="size-4" />}
            onClick={() => setAbierto(true)}
          >
            {T.nueva}
          </PButton>
        )}
      </div>

      {abierto && (
        <PCard className="mb-4 space-y-4">
          <PTextarea
            label={T.textoLabel}
            placeholder={T.textoPlaceholder}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={2000}
            rows={3}
            requiredMark
          />
          <PInput
            label={T.recordarLabel}
            hint={T.recordarHint}
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <PButton
              pill
              fullWidth
              loading={accion === "nueva"}
              disabled={ocupado}
              onClick={guardar}
            >
              {accion === "nueva" ? T.guardando : T.guardar}
            </PButton>
            <PButton
              variant="ghost"
              pill
              fullWidth
              disabled={ocupado}
              onClick={() => setAbierto(false)}
            >
              {T.cancelar}
            </PButton>
          </div>
        </PCard>
      )}

      {lista.length === 0 ? (
        <p className="rounded-portal border border-dashed border-portal-line2 bg-portal-surface p-8 text-center text-sm text-portal-muted">
          {T.vacio}
        </p>
      ) : (
        <ul className="space-y-3">
          {lista.map((n) => {
            const urge = ahora != null && recordatorioVencido(n.recordarEn, n.hecha, ahora);
            const cargando = accion === n.id;
            return (
              <li key={n.id}>
                <PCard
                  className={cn("p-5", n.hecha && "opacity-70", urge && "border-portal-danger/40")}
                >
                  <p className="whitespace-pre-wrap break-words text-sm text-portal-ink">
                    {n.texto}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-portal-muted">{toDateTime(n.createdAt)}</span>
                    {n.recordarEn && (
                      <PPill
                        tone={n.hecha ? "neutral" : urge ? "alert" : "gold"}
                        leadingIcon={<AlarmClock className="size-3.5" aria-hidden />}
                      >
                        {T.proximaAccion(toDate(n.recordarEn))}
                      </PPill>
                    )}
                    {urge && <PPill tone="alert">{T.vencida}</PPill>}
                    {n.hecha && <PPill tone="money">{T.hechaBadge}</PPill>}
                  </div>

                  {n.mia ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <PButton
                        variant="ghost"
                        size="sm"
                        pill
                        loading={cargando}
                        disabled={ocupado}
                        leadingIcon={
                          n.hecha ? <RotateCcw className="size-4" /> : <Check className="size-4" />
                        }
                        onClick={() => alternarHecha(n)}
                      >
                        {n.hecha ? T.reabrir : T.marcarHecha}
                      </PButton>
                      <PButton
                        variant="ghost"
                        size="sm"
                        pill
                        disabled={ocupado}
                        leadingIcon={<Trash2 className="size-4" />}
                        onClick={() => setPorBorrar(n)}
                      >
                        {T.borrar}
                      </PButton>
                    </div>
                  ) : (
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-portal-muted">
                      <Lock className="size-3.5 shrink-0" aria-hidden />
                      {T.soloAutor}
                    </p>
                  )}
                </PCard>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-3 flex items-center gap-1.5 text-xs text-portal-muted">
        <Lock className="size-3.5 shrink-0" aria-hidden />
        {T.privacidad}
      </p>

      <PConfirmDialog
        open={porBorrar != null}
        onClose={() => setPorBorrar(null)}
        onConfirm={() => (porBorrar ? borrar(porBorrar) : undefined)}
        title={T.borrarTitulo}
        description={T.borrarTexto}
        confirmLabel={T.borrarConfirmar}
        cancelLabel={T.cancelar}
        variant="destructive"
      />
    </section>
  );
}
