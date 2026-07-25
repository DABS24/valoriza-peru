"use client";

import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";

import { PCard } from "@/components/portales/ui/PCard";
import { PButton } from "@/components/portales/ui/PButton";
import { PInput, PPassword } from "@/components/portales/ui/PField";
import { PPill } from "@/components/portales/ui/PPill";
import { PConfirmDialog } from "@/components/portales/ui/PConfirmDialog";
import { COPY } from "@/lib/copy";
import { passwordFuerte } from "@/lib/auth/password";
import { desactivarTotp, estadoTotp, inscribirTotp, verificarTotp } from "@/lib/data/mfa";

type Enroll = { factorId: string; qr: string; secret: string };

/**
 * Configuración del portal (cliente / asesor / admin): cambiar contraseña +
 * verificación en dos pasos (TOTP). REUSA la LÓGICA de Don Gato Efectivo —
 * `lib/data/mfa.ts` (mismo Supabase Auth) y los endpoints
 * `/api/cliente/desactivar-2fa`, `/api/auth/2fa-activado` y
 * `/api/auth/cambiar-clave` (solo exigen sesión, sin asumir rol). Reusar la ruta NO
 * significa reusar la bitácora: cada una registra en la del producto al que
 * pertenece la cuenta, así que estas tres acciones quedan en la bitácora DEL PORTAL.
 *
 * El COPY, en cambio, es propio del portal (COPY.portales.seguridad): compartir el
 * de Efectivo hacía que un ajuste de texto de un producto se colara en el otro. Al
 * cambiar la clave se cierran todas las sesiones y se manda al login DEL PORTAL
 * (loginHref).
 */
export function PortalConfiguracion({ loginHref }: { loginHref: string }) {
  const T = COPY.portales.seguridad;
  const H = COPY.portales.config;

  const [cargando, setCargando] = useState(true);
  const [activo, setActivo] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enroll, setEnroll] = useState<Enroll | null>(null);
  const [codigo, setCodigo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [confirmarDesactivar, setConfirmarDesactivar] = useState(false);

  const [pwActual, setPwActual] = useState("");
  const [pwNueva, setPwNueva] = useState("");
  const [pwConfirmar, setPwConfirmar] = useState("");
  const [cambiandoPw, setCambiandoPw] = useState(false);

  useEffect(() => {
    estadoTotp().then(({ activo, factorId }) => {
      setActivo(activo);
      setFactorId(factorId);
      setCargando(false);
    });
  }, []);

  async function iniciarAlta() {
    setOcupado(true);
    try {
      setEnroll(await inscribirTotp());
      setCodigo("");
    } catch {
      toast.error(T.errorGenerico);
    } finally {
      setOcupado(false);
    }
  }

  async function confirmar() {
    if (!enroll || codigo.length !== 6) return;
    setOcupado(true);
    try {
      await verificarTotp(enroll.factorId, codigo);
      setActivo(true);
      setFactorId(enroll.factorId);
      setEnroll(null);
      toast.success(T.activada);
    } catch {
      toast.error(T.errorCodigo);
    } finally {
      setOcupado(false);
    }
  }

  async function desactivar(clave?: string) {
    if (!factorId || !clave) return;
    setOcupado(true);
    try {
      await desactivarTotp(factorId, clave);
      setActivo(false);
      setFactorId(null);
      setConfirmarDesactivar(false);
      toast.success(T.desactivada);
    } catch (e) {
      toast.error((e as Error)?.message === "clave_incorrecta" ? T.claveIncorrecta : T.errorGenerico);
    } finally {
      setOcupado(false);
    }
  }

  async function cambiarPassword() {
    if (cambiandoPw) return;
    const P = T.password;
    if (!passwordFuerte(pwNueva)) return void toast.error(P.debil);
    if (pwNueva !== pwConfirmar) return void toast.error(P.noCoincide);
    setCambiandoPw(true);
    try {
      const res = await fetch("/api/auth/cambiar-clave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actual: pwActual, nueva: pwNueva }),
      });
      if (!res.ok) {
        const code = await res
          .json()
          .then((d) => (d?.error as string) ?? "")
          .catch(() => "");
        toast.error(
          code === "actual_incorrecta" ? P.actualIncorrecta : code === "debil" ? P.debil : P.error,
        );
        return;
      }
      setPwActual("");
      setPwNueva("");
      setPwConfirmar("");
      // Cambiar la clave cierra TODAS las sesiones (incluida esta). Se manda al
      // login del portal en vez de dejar una sesión zombi.
      toast.success(P.okSesionesCerradas);
      setTimeout(() => window.location.assign(loginHref), 1500);
    } catch {
      toast.error(P.error);
    } finally {
      setCambiandoPw(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-portal text-2xl font-extrabold tracking-tight text-portal-ink sm:text-3xl">{H.titulo}</h1>
      <p className="mt-1 text-sm text-portal-muted">{H.sub}</p>

      <PCard className="mt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {activo ? (
              <ShieldCheck className="mt-0.5 size-6 shrink-0 text-portal-positive" />
            ) : (
              <ShieldOff className="mt-0.5 size-6 shrink-0 text-portal-muted" />
            )}
            <div>
              <p className="font-portal text-base font-bold text-portal-ink">{T.dosFactores}</p>
              <p className="mt-1 text-sm text-portal-ink2">{T.desc}</p>
            </div>
          </div>
          <PPill tone={activo ? "money" : "neutral"}>{activo ? T.estadoActivo : T.estadoInactivo}</PPill>
        </div>

        {!cargando && !activo && !enroll && (
          <PButton pill className="mt-5" onClick={iniciarAlta} disabled={ocupado}>
            {T.activar}
          </PButton>
        )}

        {activo && (
          <PButton pill variant="ghost" className="mt-5" onClick={() => setConfirmarDesactivar(true)} disabled={ocupado}>
            {T.desactivar}
          </PButton>
        )}

        <PConfirmDialog
          open={confirmarDesactivar}
          onClose={() => setConfirmarDesactivar(false)}
          onConfirm={desactivar}
          title={T.desactivarConfirmTitulo}
          description={T.desactivarConfirmTexto}
          confirmLabel={T.desactivar}
          cancelLabel={COPY.portales.comun.cancelar}
          variant="destructive"
          passwordLabel={T.claveActual}
        />

        {enroll && (
          <div className="mt-6 space-y-4 border-t border-portal-line pt-6">
            <div>
              <p className="text-sm font-semibold text-portal-ink">{T.paso1}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enroll.qr} alt="QR" className="mt-3 size-44 rounded-portal border border-portal-line bg-white p-2" />
            </div>
            <div>
              <p className="text-sm font-semibold text-portal-ink">{T.paso2}</p>
              <code className="mt-1 block break-all rounded-portal-sm bg-portal-subtle px-3 py-2 font-mono text-sm text-portal-ink">
                {enroll.secret}
              </code>
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold text-portal-ink">{T.paso3}</p>
              <PInput
                label={T.codigo}
                inputMode="numeric"
                maxLength={6}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <PButton pill fullWidth onClick={confirmar} disabled={ocupado || codigo.length !== 6}>
                {T.confirmar}
              </PButton>
              <PButton pill fullWidth variant="ghost" onClick={() => setEnroll(null)} disabled={ocupado}>
                {T.cancelar}
              </PButton>
            </div>
          </div>
        )}

        <p className="mt-6 border-t border-portal-line pt-4 text-xs text-portal-muted">{T.sesionInfo}</p>
      </PCard>

      <PCard className="mt-6">
        <div className="flex items-start gap-3">
          <KeyRound className="mt-0.5 size-6 shrink-0 text-portal-primary" />
          <div>
            <p className="font-portal text-base font-bold text-portal-ink">{T.password.title}</p>
            <p className="mt-1 text-sm text-portal-ink2">{T.password.desc}</p>
          </div>
        </div>
        <div className="mt-5 space-y-4 border-t border-portal-line pt-5">
          <PPassword
            label={T.password.actual}
            autoComplete="current-password"
            value={pwActual}
            onChange={(e) => setPwActual(e.target.value)}
          />
          <PPassword
            label={T.password.nueva}
            autoComplete="new-password"
            hint={T.password.hint}
            value={pwNueva}
            onChange={(e) => setPwNueva(e.target.value)}
          />
          <PPassword
            label={T.password.confirmar}
            autoComplete="new-password"
            value={pwConfirmar}
            onChange={(e) => setPwConfirmar(e.target.value)}
            error={pwConfirmar.length > 0 && pwConfirmar !== pwNueva ? T.password.noCoincide : undefined}
          />
          <PButton pill onClick={cambiarPassword} disabled={cambiandoPw || !pwActual || !pwNueva || !pwConfirmar}>
            {T.password.guardar}
          </PButton>
        </div>
      </PCard>
    </div>
  );
}
