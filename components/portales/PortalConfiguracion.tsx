"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

import { PCard } from "@/components/portales/ui/PCard";
import { PButton } from "@/components/portales/ui/PButton";
import { PPassword } from "@/components/portales/ui/PField";
import { COPY } from "@/lib/copy";
import { passwordFuerte } from "@/lib/auth/password";

/**
 * Configuración del portal (cliente / asesor / admin): cambiar contraseña.
 *
 * ⚠️ La verificación en dos pasos se RETIRÓ el 2026-07-25, y no fue una decisión
 * de producto sino de honestidad. Se podía activar, pero:
 *   · el login NUNCA ejecutaba el desafío, así que la sesión quedaba en AAL1 con
 *     acceso completo — el segundo factor no protegía nada;
 *   · no se podía desactivar, porque su endpoint se quedó del otro lado cuando
 *     este repo se separó del monorepo.
 *
 * Un control de seguridad que la interfaz ofrece y que no protege es PEOR que no
 * ofrecerlo: le da confianza falsa a quien lo activó. Vuelve cuando el login
 * ejecute el desafío (`crearChallenge`/`verificarChallenge`) y exista la ruta de
 * baja con re-autenticación server-side.
 */
export function PortalConfiguracion({ loginHref }: { loginHref: string }) {
  const T = COPY.portales.seguridad;
  const H = COPY.portales.config;
  const P = T.password;

  const [pwActual, setPwActual] = useState("");
  const [pwNueva, setPwNueva] = useState("");
  const [pwConfirmar, setPwConfirmar] = useState("");
  const [cambiandoPw, setCambiandoPw] = useState(false);

  async function cambiarPassword() {
    if (pwNueva !== pwConfirmar) {
      toast.error(P.noCoincide);
      return;
    }
    if (!passwordFuerte(pwNueva)) {
      toast.error(P.debil);
      return;
    }
    setCambiandoPw(true);
    try {
      const res = await fetch("/api/auth/cambiar-clave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actual: pwActual, nueva: pwNueva }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        if (data.error === "clave_incorrecta") toast.error(P.actualIncorrecta);
        else if (data.error === "clave_debil") toast.error(P.debil);
        else toast.error(P.error);
        return;
      }
      // Cambiar la clave cierra TODAS las sesiones (incluida esta): se manda al
      // login DEL PORTAL, no al de otro producto.
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
      <h1 className="font-portal text-2xl font-extrabold tracking-tight text-portal-ink sm:text-3xl">
        {H.titulo}
      </h1>
      <p className="mt-1 text-sm text-portal-muted">{H.sub}</p>

      <PCard className="mt-6">
        <div className="flex items-start gap-3">
          <KeyRound className="mt-0.5 size-6 shrink-0 text-portal-primary" />
          <div>
            <p className="font-portal text-base font-bold text-portal-ink">{P.title}</p>
            <p className="mt-1 text-sm text-portal-ink2">{P.desc}</p>
          </div>
        </div>
        <div className="mt-5 space-y-4 border-t border-portal-line pt-5">
          <PPassword
            label={P.actual}
            autoComplete="current-password"
            value={pwActual}
            onChange={(e) => setPwActual(e.target.value)}
          />
          <PPassword
            label={P.nueva}
            autoComplete="new-password"
            hint={P.hint}
            value={pwNueva}
            onChange={(e) => setPwNueva(e.target.value)}
          />
          <PPassword
            label={P.confirmar}
            autoComplete="new-password"
            value={pwConfirmar}
            onChange={(e) => setPwConfirmar(e.target.value)}
            error={pwConfirmar.length > 0 && pwConfirmar !== pwNueva ? P.noCoincide : undefined}
          />
          <PButton
            pill
            onClick={cambiarPassword}
            disabled={cambiandoPw || !pwActual || !pwNueva || !pwConfirmar}
          >
            {cambiandoPw ? COPY.portales.comun.guardando : P.guardar}
          </PButton>
        </div>
        <p className="mt-6 border-t border-portal-line pt-4 text-xs text-portal-muted">
          {T.sesionInfo}
        </p>
      </PCard>
    </div>
  );
}
