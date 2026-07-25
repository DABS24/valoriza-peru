"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock } from "lucide-react";

import { Dialog } from "@/components/ui/Dialog";
import { PButton } from "@/components/portales/ui/PButton";
import { PInput, PSelect } from "@/components/portales/ui/PField";
import { PPill } from "@/components/portales/ui/PPill";
import { PTabs, type PTab } from "@/components/portales/ui/PTabs";
import { COPY } from "@/lib/copy";
import { esTelefonoValido } from "@/lib/portales/constants";
import type { OpcionTitular } from "@/lib/portales/data";

type Modo = "existente" | "nuevo";

/** Valor del <select>: "tipo:id", para no necesitar dos estados acoplados. */
function claveDe(o: OpcionTitular): string {
  return `${o.tipo}:${o.id}`;
}

/**
 * EL ACTO CENTRAL DEL ASESOR: bloquear una operación A NOMBRE DE alguien.
 *
 * El negocio es presencial y se cierra por teléfono; hasta ahora el asesor solo
 * podía MIRAR el pool y la reserva la tenía que hacer el inversionista desde su
 * cuenta —cuenta que muchas veces todavía no existe, porque la regla del negocio
 * es que se crea recién cuando ya operó—. Por eso hay dos caminos:
 *   · De su cartera → un cliente con cuenta o un prospecto que ya registró.
 *   · Registrar nuevo → lo da de alta y bloquea en el mismo acto (el caso real:
 *     está al teléfono con alguien que no está en el sistema).
 *
 * Acá NO se decide ningún permiso: el bloqueo lo arbitra `portal_reservar_para`
 * en la base (claim atómico sobre 'disponible' + la cartera se re-verifica en
 * SQL). Esta pantalla solo recoge datos y muestra el resultado.
 *
 * Anti doble-submit (§4): `enviando` bloquea el botón y el diálogo no se cierra
 * mientras corre. Mobile-first: el formulario apila en 375 y va a dos columnas
 * en pantallas grandes.
 */
export function BloquearPara({
  oportunidadId,
  titulares,
  fullWidth = false,
}: {
  oportunidadId: string;
  /** Su cartera: clientes con cuenta + prospectos sin convertir. */
  titulares: OpcionTitular[];
  fullWidth?: boolean;
}) {
  const T = COPY.portales.asesor.bloqueo;
  const router = useRouter();

  const [abierto, setAbierto] = useState(false);
  const [modo, setModo] = useState<Modo>(titulares.length > 0 ? "existente" : "nuevo");
  const [clave, setClave] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [tipoDoc, setTipoDoc] = useState("dni");
  const [documento, setDocumento] = useState("");
  const [enviando, setEnviando] = useState(false);

  const tabs: PTab<Modo>[] = [
    { id: "existente", label: T.tabExistente, contador: titulares.length },
    { id: "nuevo", label: T.tabNuevo },
  ];

  function cerrar() {
    if (enviando) return;
    setAbierto(false);
  }

  async function bloquear() {
    if (enviando) return;

    let titular: Record<string, unknown>;
    if (modo === "existente") {
      const elegido = titulares.find((t) => claveDe(t) === clave);
      if (!elegido) return void toast.error(T.faltaTitular);
      titular = { tipo: elegido.tipo, id: elegido.id };
    } else {
      if (nombre.trim().length < 2) return void toast.error(T.faltaNombre);
      if (!esTelefonoValido(telefono)) return void toast.error(T.faltaTelefono);
      titular = {
        tipo: "nuevo",
        datos: {
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          tipo_documento: documento.trim() ? tipoDoc : "",
          documento: documento.trim(),
        },
      };
    }

    setEnviando(true);
    try {
      const res = await fetch(`/api/reservas/asesor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oportunidadId, titular }),
      });
      const p = (await res.json().catch(() => ({}))) as { resultado?: string; error?: string };
      if (!res.ok) {
        toast.error(p.error === "documento_duplicado" ? T.documentoDuplicado : T.error);
        return;
      }
      if (p.resultado === "no_disponible") {
        toast.error(T.noDisponible);
        setAbierto(false);
        router.refresh();
        return;
      }
      if (p.resultado !== "ok") {
        toast.error(T.sinAcceso);
        return;
      }
      toast.success(modo === "nuevo" ? T.okConProspecto(nombre.trim()) : T.ok);
      setAbierto(false);
      setNombre("");
      setTelefono("");
      setDocumento("");
      setClave("");
      router.refresh();
    } catch {
      toast.error(T.error);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <PButton
        variant="primary"
        size="sm"
        pill
        fullWidth={fullWidth}
        leadingIcon={<Lock className="size-4" />}
        onClick={() => setAbierto(true)}
      >
        {T.cta}
      </PButton>

      <Dialog
        open={abierto}
        onClose={cerrar}
        title={T.titulo}
        hideTitle
        maxWidthClassName="max-w-lg"
        panelClassName="bg-portal-surface"
      >
        <div className="flex flex-col gap-1">
          <h2 className="font-portal text-xl font-bold text-portal-ink">{T.titulo}</h2>
          <p className="text-sm leading-relaxed text-portal-ink2">{T.sub}</p>
        </div>

        <div className="mt-5">
          <PTabs tabs={tabs} activa={modo} onChange={setModo} label={T.titulo} />
        </div>

        {modo === "existente" ? (
          <div className="mt-5">
            {titulares.length === 0 ? (
              <p className="rounded-portal-sm border border-dashed border-portal-line2 bg-portal-subtle p-5 text-center text-sm text-portal-muted">
                {T.sinTitulares}
              </p>
            ) : (
              <PSelect
                label={T.seleccionaLabel}
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                requiredMark
              >
                <option value="">{T.seleccionaPlaceholder}</option>
                {titulares.map((t) => (
                  <option key={claveDe(t)} value={claveDe(t)}>
                    {t.conCuenta ? t.nombre : `${t.nombre} · ${T.sinCuentaBadge}`}
                  </option>
                ))}
              </PSelect>
            )}
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <PInput
                label={T.nombreLabel}
                placeholder={T.nombrePlaceholder}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                maxLength={120}
                requiredMark
              />
            </div>
            <div className="sm:col-span-2">
              <PInput
                label={T.telefonoLabel}
                placeholder={T.telefonoPlaceholder}
                type="tel"
                inputMode="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                maxLength={16}
                requiredMark
              />
            </div>
            <PSelect
              label={T.tipoDocumentoLabel}
              value={tipoDoc}
              onChange={(e) => setTipoDoc(e.target.value)}
            >
              {(Object.keys(T.docTipos) as (keyof typeof T.docTipos)[]).map((k) => (
                <option key={k} value={k}>
                  {T.docTipos[k]}
                </option>
              ))}
            </PSelect>
            <PInput
              label={T.documentoLabel}
              hint={T.documentoHint}
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              maxLength={20}
            />
          </div>
        )}

        <div className="mt-5 flex items-start gap-2">
          <PPill tone="gold" className="shrink-0">
            {T.holdBadge}
          </PPill>
          <p className="text-xs leading-relaxed text-portal-muted">{T.nota}</p>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          <PButton pill fullWidth loading={enviando} disabled={enviando} onClick={bloquear}>
            {T.confirmar}
          </PButton>
          <PButton variant="ghost" pill fullWidth disabled={enviando} onClick={cerrar}>
            {COPY.portales.comun.cancelar}
          </PButton>
        </div>
      </Dialog>
    </>
  );
}
