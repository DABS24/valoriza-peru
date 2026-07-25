"use client";

import { useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

import { COPY } from "@/lib/copy";
import { passwordFuerte } from "@/lib/auth/password";
import { guardarNuevaClave, useSesionRecuperacion } from "@/lib/auth/nuevaClave";
import { PORTALES, type PortalSlug } from "@/lib/portales/config";
import { PortalWordmark } from "@/components/portales/PortalWordmark";
import { PCard } from "@/components/portales/ui/PCard";
import { PButton } from "@/components/portales/ui/PButton";
import { PPassword } from "@/components/portales/ui/PField";
import { PNota } from "@/components/portales/ui/PNota";
import { loginPortal } from "@/lib/portales/rutas";

/**
 * Establecer contraseña de una cuenta de PORTAL, desde el enlace de la invitación.
 *
 * Existe porque el alta de un inversionista estaba rota de punta a punta: el
 * correo mandaba a la pantalla del otro producto (cuando este portal vivía en su
 * monorepo) y, al terminar, a un login donde el inversionista no tiene perfil: rebotaba sin llegar nunca a
 * su portal. Acá el ciclo se cierra dentro del portal: misma mecánica de token
 * (lib/auth/nuevaClave, compartida), marca del portal, y al final su propio login.
 */
export function PortalNuevaClave({ portal }: { portal: PortalSlug }) {
  const T = COPY.portales.nuevaClave;
  const cfg = PORTALES[portal];
  const loginHref = loginPortal(portal);

  const estado = useSesionRecuperacion();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!passwordFuerte(password)) return void toast.error(T.passwordDebil);
    if (password !== password2) return void toast.error(T.passwordNoCoincide);
    setGuardando(true);
    const ok = await guardarNuevaClave(password);
    if (!ok) {
      toast.error(T.errorGenerico);
      setGuardando(false);
      return;
    }
    toast.success(T.success);
    window.location.assign(loginHref);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-portal-bg">
      <header className="border-b border-portal-line bg-portal-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <PortalWordmark nombre={cfg.nombreCorto} size="sm" />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center">
            <h1 className="font-portal text-2xl font-extrabold tracking-tight text-portal-ink">
              {T.titulo}
            </h1>
            <p className="mt-2 text-sm text-portal-ink2">
              {estado === "validando" ? T.validando : estado === "invalido" ? T.errorLink : T.sub}
            </p>
          </div>

          {estado === "listo" && (
            <PCard className="mt-6">
              <form onSubmit={guardar} className="space-y-4">
                <PPassword
                  label={T.passwordLabel}
                  autoComplete="new-password"
                  hint={T.passwordHint}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <PPassword
                  label={T.password2Label}
                  autoComplete="new-password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  error={
                    password2.length > 0 && password2 !== password
                      ? T.passwordNoCoincide
                      : undefined
                  }
                />
                <PButton
                  type="submit"
                  fullWidth
                  pill
                  size="lg"
                  loading={guardando}
                  disabled={guardando}
                >
                  {guardando ? T.guardando : T.cta}
                </PButton>
              </form>
            </PCard>
          )}

          {estado === "invalido" && (
            <PNota className="mt-6" icon={KeyRound}>
              {COPY.portales.login.nota}
            </PNota>
          )}

          {/* A propósito <a> y NO <Link>: acá se sale de una sesión de recuperación,
              y la navegación tiene que ser DURA para que el login lea la cookie
              recién escrita — igual que el `window.location.assign` de arriba. Un
              soft-nav llegaría al login con el estado viejo del cliente. */}
          <p className="mt-6 text-center text-sm">
            <a href={loginHref} className="font-semibold text-portal-primary hover:underline">
              {T.irAlLogin}
            </a>
          </p>

          <p className="mt-6 text-center text-2xs text-portal-muted">{COPY.portales.pieLegal}</p>
        </div>
      </main>
    </div>
  );
}
