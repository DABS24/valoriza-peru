"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

import { PButton } from "@/components/portales/ui/PButton";
import { PCard } from "@/components/portales/ui/PCard";
import { Dialog } from "@/components/ui/Dialog";
import { PInput, PSelect } from "@/components/portales/ui/PField";
import { PPill } from "@/components/portales/ui/PPill";
import { PTable, PTHead } from "@/components/portales/ui/PTable";
import { COPY } from "@/lib/copy";
import { toDate } from "@/lib/formatters";
import type { PortalRol } from "@/lib/portales/roles";
import type { MiembroRow, ProspectoRow } from "@/lib/portales/data";
// El mapa rol→tono vive en constants (SSOT): estaba duplicado en dos pantallas.
import { TONO_ROL } from "@/lib/portales/constants";

/** Traduce el código de error de la API a un texto del copy. */
function mensajeError(code: string | undefined, T: typeof COPY.portales.admin.usuarios): string {
  switch (code) {
    case "email_invalido":
    case "body_invalido":
      return T.correoInvalido;
    case "ya_es_miembro":
    case "email_ya_existe":
      return T.yaExiste;
    default:
      return T.errorCrear;
  }
}

export function UsuariosTabla({
  miembros,
  miId,
  prospectos = [],
}: {
  miembros: MiembroRow[];
  miId: string | null;
  /** Titulares sin cuenta del portal: al crear la cuenta se les liga el historial. */
  prospectos?: ProspectoRow[];
}) {
  const T = COPY.portales.admin.usuarios;
  const TR = COPY.portales.roles;
  const TE = COPY.portales.estados;
  const router = useRouter();

  const [lista, setLista] = useState<MiembroRow[]>(miembros);
  useEffect(() => setLista(miembros), [miembros]);

  // accion en curso: "crear" | "estado:<id>" | "asesor:<id>". busy = deshabilita todo.
  const [accion, setAccion] = useState<string | null>(null);
  const busy = accion !== null;

  const [crearAbierto, setCrearAbierto] = useState(false);
  const [reasignar, setReasignar] = useState<MiembroRow | null>(null);

  const asesores = useMemo(
    () => lista.filter((m) => m.rol !== "cliente" && m.estado === "activo"),
    [lista],
  );
  const nombrePorId = useMemo(() => new Map(lista.map((m) => [m.userId, m.nombre])), [lista]);

  // Form de creación.
  const [fNombre, setFNombre] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fTel, setFTel] = useState("");
  const [fRol, setFRol] = useState<PortalRol>("cliente");
  const [fAsesor, setFAsesor] = useState("");
  // Prospecto al que esta cuenta le da acceso (conversión, 0090). "" = ninguno.
  const [fProspecto, setFProspecto] = useState("");

  function resetForm() {
    setFNombre("");
    setFEmail("");
    setFTel("");
    setFRol("cliente");
    setFAsesor("");
    setFProspecto("");
  }

  /**
   * Al elegir un prospecto se precarga lo que ya se sabe de él (nombre, teléfono)
   * y se hereda SU asesor: la cuenta nueva tiene que quedar en la misma cartera
   * donde ya está su historial, si no el asesor que lo trabajó lo perdería de
   * vista justo cuando por fin tiene cuenta. Solo faltará el correo.
   */
  function elegirProspecto(id: string) {
    setFProspecto(id);
    const p = prospectos.find((x) => x.id === id);
    if (!p) return;
    setFNombre(p.nombre);
    setFTel(p.telefono);
    setFAsesor(p.asesorId);
  }

  async function crear() {
    if (busy) return;
    if (fNombre.trim().length < 2) return void toast.error(T.nombreCorto);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fEmail.trim())) return void toast.error(T.correoInvalido);
    setAccion("crear");
    try {
      const res = await fetch(`/api/usuarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: fNombre.trim(),
          email: fEmail.trim().toLowerCase(),
          telefono: fTel.trim() || undefined,
          rol: fRol,
          asesorId: fRol === "cliente" && fAsesor ? fAsesor : undefined,
          prospectoId: fRol === "cliente" && fProspecto ? fProspecto : undefined,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        correoEnviado?: boolean;
        reusado?: boolean;
        prospectoConvertido?: string | null;
      };
      if (!res.ok) {
        toast.error(mensajeError(payload.error, T));
        return;
      }
      toast.success(payload.reusado || payload.correoEnviado ? T.creado : T.creadoSinCorreo);
      // La cuenta ya está creada; si el historial NO se pudo ligar hay que decirlo,
      // no dejar que el admin crea que quedó todo hecho.
      if (fProspecto && !payload.prospectoConvertido) toast.error(T.prospectoNoLigado);
      setCrearAbierto(false);
      resetForm();
      router.refresh();
    } catch {
      toast.error(T.errorCrear);
    } finally {
      setAccion(null);
    }
  }

  async function cambiarEstado(m: MiembroRow) {
    if (busy) return;
    const nuevo = m.estado === "activo" ? "inactivo" : "activo";
    setAccion(`estado:${m.userId}`);
    try {
      const res = await fetch(`/api/usuarios/${m.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevo }),
      });
      if (!res.ok) return void toast.error(T.errorAccion);
      setLista((prev) => prev.map((x) => (x.userId === m.userId ? { ...x, estado: nuevo } : x)));
    } catch {
      toast.error(T.errorAccion);
    } finally {
      setAccion(null);
    }
  }

  async function guardarAsesor(nuevoAsesor: string) {
    if (busy || !reasignar) return;
    const m = reasignar;
    setAccion(`asesor:${m.userId}`);
    try {
      const res = await fetch(`/api/usuarios/${m.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asesorId: nuevoAsesor }),
      });
      if (!res.ok) return void toast.error(T.errorAccion);
      setLista((prev) =>
        prev.map((x) => (x.userId === m.userId ? { ...x, asesorId: nuevoAsesor || null } : x)),
      );
      setReasignar(null);
    } catch {
      toast.error(T.errorAccion);
    } finally {
      setAccion(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-portal text-2xl font-extrabold tracking-tight text-portal-ink sm:text-3xl">{T.titulo}</h1>
          <p className="mt-1 max-w-2xl text-sm text-portal-muted">{T.sub}</p>
        </div>
        <PButton pill leadingIcon={<UserPlus className="size-4" />} onClick={() => setCrearAbierto(true)}>
          {T.crear}
        </PButton>
      </div>

      <PCard className="p-0">
        {lista.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-portal-muted">{T.vacio}</p>
        ) : (
          <PTable>
            <PTHead>
              <th className="px-5 py-3">{T.colNombre}</th>
              <th className="px-5 py-3">{T.colRol}</th>
              <th className="px-5 py-3">{T.colAsesor}</th>
              <th className="px-5 py-3">{T.colEstado}</th>
              <th className="px-5 py-3 text-right">{T.colAcciones}</th>
            </PTHead>
            <tbody className="divide-y divide-portal-line">
              {lista.map((m) => (
                <tr key={m.userId} className="align-middle hover:bg-portal-subtle/60">
                  <td className="px-5 py-3">
                    <span className="font-semibold text-portal-ink">{m.nombre}</span>
                    {m.userId === miId && (
                      <span className="ml-2 rounded-chip bg-portal-primary-soft px-2 py-0.5 text-[10px] font-bold text-portal-primary-ink">
                        {T.tuMismo}
                      </span>
                    )}
                    {m.telefono && <p className="text-xs text-portal-muted">{m.telefono}</p>}
                  </td>
                  <td className="px-5 py-3">
                    <PPill tone={TONO_ROL[m.rol]}>{TR[m.rol]}</PPill>
                  </td>
                  <td className="px-5 py-3 text-sm text-portal-ink2">
                    {m.rol === "cliente" ? (nombrePorId.get(m.asesorId ?? "") ?? "—") : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <PPill tone={m.estado === "activo" ? "money" : "neutral"}>
                      {m.estado === "activo" ? TE.activo : TE.inactivo}
                    </PPill>
                    <p className="mt-1 text-[11px] text-portal-muted">{toDate(m.createdAt)}</p>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      {m.rol === "cliente" && (
                        <PButton
                          variant="ghost"
                          size="sm"
                          pill
                          disabled={busy}
                          onClick={() => setReasignar(m)}
                        >
                          {T.reasignar}
                        </PButton>
                      )}
                      {m.userId !== miId && (
                        <PButton
                          variant={m.estado === "activo" ? "danger" : "primary"}
                          size="sm"
                          pill
                          loading={accion === `estado:${m.userId}`}
                          disabled={busy}
                          onClick={() => cambiarEstado(m)}
                        >
                          {m.estado === "activo" ? T.desactivar : T.activar}
                        </PButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </PTable>
        )}
      </PCard>

      {/* Crear usuario */}
      <Dialog open={crearAbierto} onClose={() => (busy ? undefined : setCrearAbierto(false))} title={T.crearTitulo}>
        <div className="space-y-4">
          {/* Conversión: la cuenta se crea para alguien que el asesor ya trabajaba.
              Al elegirlo se precarga su ficha y su historial queda ligado. */}
          {fRol === "cliente" && prospectos.length > 0 && (
            <PSelect
              label={T.prospectoLabel}
              hint={T.prospectoHint}
              value={fProspecto}
              onChange={(e) => elegirProspecto(e.target.value)}
            >
              <option value="">{T.prospectoNinguno}</option>
              {prospectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.documento ? `${p.nombre} · ${p.documento}` : p.nombre}
                </option>
              ))}
            </PSelect>
          )}
          <PInput label={T.nombre} value={fNombre} onChange={(e) => setFNombre(e.target.value)} requiredMark />
          <PInput
            label={T.correo}
            type="email"
            value={fEmail}
            onChange={(e) => setFEmail(e.target.value)}
            requiredMark
          />
          <PInput label={T.telefono} value={fTel} onChange={(e) => setFTel(e.target.value)} />
          <PSelect label={T.rol} value={fRol} onChange={(e) => setFRol(e.target.value as PortalRol)}>
            <option value="cliente">{TR.cliente}</option>
            <option value="asesor">{TR.asesor}</option>
            <option value="admin">{TR.admin}</option>
          </PSelect>
          {fRol === "cliente" && (
            <PSelect label={T.asesorAsignado} value={fAsesor} onChange={(e) => setFAsesor(e.target.value)}>
              <option value="">{T.sinAsesor}</option>
              {asesores.map((a) => (
                <option key={a.userId} value={a.userId}>
                  {a.nombre}
                </option>
              ))}
            </PSelect>
          )}
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          <PButton pill fullWidth loading={accion === "crear"} disabled={busy} onClick={crear}>
            {accion === "crear" ? T.creando : T.crearCta}
          </PButton>
          <PButton variant="ghost" pill fullWidth disabled={busy} onClick={() => setCrearAbierto(false)}>
            {COPY.portales.comun.cancelar}
          </PButton>
        </div>
      </Dialog>

      {/* Reasignar asesor */}
      <Dialog open={!!reasignar} onClose={() => (busy ? undefined : setReasignar(null))} title={T.reasignarTitulo}>
        {reasignar && (
          <div className="space-y-4">
            <p className="text-sm text-portal-ink2">{reasignar.nombre}</p>
            <PSelect
              label={T.asesorAsignado}
              defaultValue={reasignar.asesorId ?? ""}
              onChange={(e) => guardarAsesor(e.target.value)}
              disabled={busy}
            >
              <option value="">{T.sinAsesor}</option>
              {asesores.map((a) => (
                <option key={a.userId} value={a.userId}>
                  {a.nombre}
                </option>
              ))}
            </PSelect>
          </div>
        )}
        <div className="mt-6">
          <PButton variant="ghost" pill fullWidth disabled={busy} onClick={() => setReasignar(null)}>
            {COPY.portales.comun.cancelar}
          </PButton>
        </div>
      </Dialog>
    </div>
  );
}
