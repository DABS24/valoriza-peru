"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus, ShieldCheck } from "lucide-react";

import { PButton } from "@/components/portales/ui/PButton";
import { PCard } from "@/components/portales/ui/PCard";
import { Dialog } from "@/components/ui/Dialog";
import { PInput, PSelect, PTextarea } from "@/components/portales/ui/PField";
import { PPill } from "@/components/portales/ui/PPill";
import { PTable, PTHead } from "@/components/portales/ui/PTable";
import { COPY } from "@/lib/copy";
import { toInt } from "@/lib/formatters";
import { NIVELES_RIESGO, RATINGS } from "@/lib/portales/constants";
import { RiesgoBadge } from "@/components/portales/RiesgoBadge";
import type { PrestatarioLite } from "@/lib/portales/data";

interface FormState {
  id: string | null;
  nombre: string;
  ruc: string;
  nivel: string;
  scoring: string;
  rating: string;
  notas: string;
  estado: "activo" | "inactivo";
  /** ¿El contratista que se edita YA tiene cuenta de acceso? (solo lectura). */
  yaTieneCuenta: boolean;
  /** ¿Crear cuenta de acceso (empresario) al guardar? */
  crearCuenta: boolean;
  email: string;
  telefono: string;
}

const VACIO: FormState = {
  id: null,
  nombre: "",
  ruc: "",
  nivel: "",
  scoring: "",
  rating: "",
  notas: "",
  estado: "activo",
  yaTieneCuenta: false,
  crearCuenta: false,
  email: "",
  telefono: "",
};

export function PrestatariosTabla({
  prestatarios,
}: {
  prestatarios: PrestatarioLite[];
}) {
  const P = COPY.portales.admin.prestatarios;
  const TE = COPY.portales.estados;
  const router = useRouter();

  const [lista, setLista] = useState<PrestatarioLite[]>(prestatarios);
  useEffect(() => setLista(prestatarios), [prestatarios]);

  const [form, setForm] = useState<FormState | null>(null);
  const [guardando, setGuardando] = useState(false);
  const set = (patch: Partial<FormState>) => setForm((f) => (f ? { ...f, ...patch } : f));

  function abrirNuevo() {
    setForm(VACIO);
  }
  function abrirEditar(p: PrestatarioLite) {
    setForm({
      id: p.id,
      nombre: p.nombre,
      ruc: p.ruc ?? "",
      nivel: p.nivelRiesgo ?? "",
      scoring: p.scoringPago?.toString() ?? "",
      rating: p.rating ?? "",
      notas: p.notasInternas ?? "",
      estado: p.estado,
      yaTieneCuenta: p.tieneCuenta,
      crearCuenta: false,
      email: "",
      telefono: "",
    });
  }

  /** Crea la cuenta de acceso (empresario) de un contratista ya guardado. Devuelve
   *  true si el flujo puede cerrarse (éxito o el usuario no pidió cuenta). */
  async function crearCuentaAcceso(prestatarioId: string): Promise<boolean> {
    const email = form!.email.trim();
    if (!email) {
      toast.error(P.cuentaFaltaEmail);
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error(P.cuentaEmailInvalido);
      return false;
    }
    const res = await fetch(`/api/prestatarios/${prestatarioId}/cuenta`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, telefono: form!.telefono.trim() || undefined }),
    });
    if (!res.ok) {
      const code = await res
        .json()
        .then((d) => (d?.error as string) ?? "")
        .catch(() => "");
      toast.error(
        code === "ya_es_miembro" || code === "email_ya_existe"
          ? P.cuentaYaExiste
          : code === "ya_tiene_cuenta"
            ? P.cuentaYaTiene
            : P.cuentaError,
      );
      return false;
    }
    const data = await res.json().catch(() => ({}));
    toast.success(
      data?.reusado ? P.cuentaVinculada : data?.correoEnviado ? P.cuentaCreada : P.cuentaCreadaSinCorreo,
    );
    return true;
  }

  async function guardar() {
    if (guardando || !form) return;
    if (form.nombre.trim().length < 2) return void toast.error(P.faltaNombre);
    if (form.ruc.trim() && !/^\d{11}$/.test(form.ruc.trim())) return void toast.error(P.rucInvalido);
    const conCuenta = form.crearCuenta && !form.yaTieneCuenta;
    setGuardando(true);
    try {
      const editando = !!form.id;
      const url = editando
        ? `/api/prestatarios/${form.id}`
        : `/api/prestatarios`;
      const res = await fetch(url, {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          ruc: form.ruc.trim() || undefined,
          nivel_riesgo: form.nivel || undefined,
          scoring_pago: form.scoring || undefined,
          rating: form.rating || undefined,
          notas_internas: form.notas.trim() || undefined,
          estado: form.estado,
        }),
      });
      if (!res.ok) return void toast.error(P.errorGuardar);
      // El id del contratista: del POST (nuevo) o del propio form (edición).
      const guardado = await res.json().catch(() => ({}));
      const prestatarioId = (editando ? form.id : (guardado?.id as string)) ?? null;
      toast.success(editando ? P.actualizado : P.creado);

      // Cuenta de acceso (opcional). Si falla, el contratista YA quedó guardado: no
      // se revierte; se avisa el error de la cuenta y el asesor puede reintentar.
      if (conCuenta && prestatarioId) await crearCuentaAcceso(prestatarioId);

      setForm(null);
      router.refresh();
    } catch {
      toast.error(P.errorGuardar);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-portal text-2xl font-extrabold tracking-tight text-portal-ink sm:text-3xl">{P.titulo}</h1>
          <p className="mt-1 max-w-2xl text-sm text-portal-muted">{P.sub}</p>
        </div>
        <PButton pill leadingIcon={<UserPlus className="size-4" />} onClick={abrirNuevo}>
          {P.crear}
        </PButton>
      </div>

      <PCard className="p-0">
        {lista.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-portal-muted">{P.vacio}</p>
        ) : (
          <PTable>
            <PTHead>
              <th className="px-5 py-3">{P.colNombre}</th>
              <th className="px-5 py-3">{P.colRuc}</th>
              <th className="px-5 py-3">{P.colRiesgo}</th>
              <th className="px-5 py-3">{P.colScoring}</th>
              <th className="px-5 py-3">{P.colOperaciones}</th>
              <th className="px-5 py-3">{P.colAcceso}</th>
              <th className="px-5 py-3">{P.colEstado}</th>
              <th className="px-5 py-3 text-right">{P.colAcciones}</th>
            </PTHead>
            <tbody className="divide-y divide-portal-line">
              {lista.map((p) => (
                <tr key={p.id} className="align-middle hover:bg-portal-subtle/60">
                  <td className="px-5 py-3">
                    <span className="font-semibold text-portal-ink">{p.nombre}</span>
                    {p.rating && <p className="text-xs text-portal-muted">Rating {p.rating}</p>}
                  </td>
                  <td className="px-5 py-3 font-mono text-sm tabular-nums text-portal-ink2">{p.ruc ?? "—"}</td>
                  <td className="px-5 py-3">{p.nivelRiesgo ? <RiesgoBadge nivel={p.nivelRiesgo} size="sm" /> : "—"}</td>
                  <td className="px-5 py-3 font-mono text-sm font-bold tabular-nums text-portal-ink">
                    {p.scoringPago != null ? p.scoringPago : P.sinScoring}
                  </td>
                  <td className="px-5 py-3 text-sm text-portal-ink2">{toInt(p.numOperaciones)}</td>
                  <td className="px-5 py-3">
                    <PPill tone={p.tieneCuenta ? "navy" : "neutral"}>
                      {p.tieneCuenta ? P.conAcceso : P.sinCuenta}
                    </PPill>
                  </td>
                  <td className="px-5 py-3">
                    <PPill tone={p.estado === "activo" ? "money" : "neutral"}>
                      {p.estado === "activo" ? TE.activo : TE.inactivo}
                    </PPill>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end">
                      <PButton variant="ghost" size="sm" pill onClick={() => abrirEditar(p)}>
                        {P.editar}
                      </PButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </PTable>
        )}
      </PCard>

      <Dialog
        open={!!form}
        onClose={() => (guardando ? undefined : setForm(null))}
        title={form?.id ? P.editarTitulo : P.crearTitulo}
      >
        {form && (
          <div className="space-y-4">
            <PInput label={P.nombre} value={form.nombre} onChange={(e) => set({ nombre: e.target.value })} requiredMark />
            <PInput label={P.ruc} inputMode="numeric" hint={P.rucHint} value={form.ruc} onChange={(e) => set({ ruc: e.target.value })} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <PSelect label={P.nivelRiesgo} value={form.nivel} onChange={(e) => set({ nivel: e.target.value })}>
                <option value="">{P.sinRiesgo}</option>
                {NIVELES_RIESGO.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </PSelect>
              <PInput
                label={P.scoringPago}
                type="number"
                inputMode="numeric"
                hint={P.scoringHint}
                value={form.scoring}
                onChange={(e) => set({ scoring: e.target.value })}
              />
              <PSelect label={P.rating} value={form.rating} onChange={(e) => set({ rating: e.target.value })}>
                <option value="">{P.sinRating}</option>
                {RATINGS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </PSelect>
              <PSelect
                label={P.estado}
                value={form.estado}
                onChange={(e) => set({ estado: e.target.value as "activo" | "inactivo" })}
              >
                <option value="activo">{TE.activo}</option>
                <option value="inactivo">{TE.inactivo}</option>
              </PSelect>
            </div>
            <PTextarea label={P.notasInternas} hint={P.notasHint} value={form.notas} onChange={(e) => set({ notas: e.target.value })} />

            {/* ── Cuenta de acceso (empresario) ── */}
            <div className="rounded-portal-sm border border-portal-line bg-portal-subtle/50 p-4">
              {form.yaTieneCuenta ? (
                <p className="flex items-center gap-2 text-sm text-portal-ink2">
                  <ShieldCheck className="size-4 shrink-0 text-portal-positive" aria-hidden />
                  {P.cuentaYaTiene}
                </p>
              ) : (
                <>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={form.crearCuenta}
                      onChange={(e) => set({ crearCuenta: e.target.checked })}
                      className="mt-0.5 size-4 shrink-0 accent-portal-primary"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-portal-ink">{P.cuentaToggle}</span>
                      <span className="mt-0.5 block text-xs text-portal-muted">{P.cuentaSub}</span>
                    </span>
                  </label>
                  {form.crearCuenta && (
                    <div className="mt-4 space-y-4">
                      <PInput
                        label={P.cuentaEmail}
                        type="email"
                        inputMode="email"
                        autoComplete="off"
                        value={form.email}
                        onChange={(e) => set({ email: e.target.value })}
                        requiredMark
                      />
                      <PInput
                        label={P.cuentaTelefono}
                        inputMode="tel"
                        hint={P.cuentaTelefonoHint}
                        value={form.telefono}
                        onChange={(e) => set({ telefono: e.target.value })}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          <PButton pill fullWidth loading={guardando} disabled={guardando} onClick={guardar}>
            {guardando ? P.guardando : P.guardar}
          </PButton>
          <PButton variant="ghost" pill fullWidth disabled={guardando} onClick={() => setForm(null)}>
            {COPY.portales.comun.cancelar}
          </PButton>
        </div>
      </Dialog>
    </div>
  );
}
