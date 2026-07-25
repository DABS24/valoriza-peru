"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";

import { COPY } from "@/lib/copy";
import { createClient, safeGetUser } from "@/lib/supabase/client";
import { marcarLogin } from "@/lib/auth/session";
import { PORTALES, type PortalSlug } from "@/lib/portales/config";
import { homePortal } from "@/lib/portales/rutas";
import type { PortalRol } from "@/lib/portales/roles";
import { PortalWordmark } from "@/components/portales/PortalWordmark";
import { PCard } from "@/components/portales/ui/PCard";
import { PButton } from "@/components/portales/ui/PButton";
import { PInput, PPassword } from "@/components/portales/ui/PField";
import { PNota } from "@/components/portales/ui/PNota";

/**
 * Login propio del portal (marca aparte de Don Gato Efectivo: wordmark de texto,
 * sin mascota). Autentica con Supabase (signInWithPassword) y, antes de dejar
 * entrar, verifica que el usuario sea MIEMBRO ACTIVO de ESTE portal — su rol de
 * Efectivo no le da acceso. Si no es miembro: cierra sesión y avisa "No tienes
 * acceso a este portal" (sin revelar si el correo existe o no).
 *
 * El destino por rol sale de `homePortal` (lib/portales/rutas), NO de una tabla
 * propia: acá vivía una tercera copia que ya había divergido —el admin entraba a
 * `/admin/oportunidades` por login y a `/admin` por redirect del guard—, o sea que
 * el mismo administrador aterrizaba en pantallas distintas según por dónde entrara.
 */
export function PortalLogin({ portal }: { portal: PortalSlug }) {
  const T = COPY.portales.login;
  const cfg = PORTALES[portal];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  /** Verifica membresía activa y devuelve su destino, o null si no es miembro. */
  async function destinoSiMiembro(userId: string): Promise<string | null> {
    const { data } = await createClient()
      .from("portal_miembros")
      .select("rol, estado")
      .eq("portal", portal)
      .eq("user_id", userId)
      .maybeSingle();
    if (!data || data.estado !== "activo") return null;
    return homePortal(portal, data.rol as PortalRol);
  }

  // Sesión vencida por el tope de 1 hora (el middleware manda acá con la marca):
  // decirlo, para que volver al login no se lea como una falla.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("sesion") === "expirada") {
      toast.error(T.sesionExpirada);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si ya hay sesión y es miembro de este portal, entrar directo.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const supabase = createClient();
        const auth = await safeGetUser(supabase);
        if (!auth.user || !vivo) return;
        const dest = await destinoSiMiembro(auth.user.id);
        if (dest && vivo) window.location.assign(dest);
      } catch {
        /* Supabase no configurado: se muestra el formulario igual */
      }
    })();
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error(T.faltaCredenciales);
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error || !data.user) {
        toast.error(T.errorCredenciales);
        setLoading(false);
        return;
      }
      const dest = await destinoSiMiembro(data.user.id);
      if (!dest) {
        // Autenticó pero no es miembro de ESTE portal: cerrar sesión y avisar.
        await supabase.auth.signOut();
        toast.error(T.sinAcceso);
        setLoading(false);
        return;
      }
      marcarLogin();
      window.location.assign(dest);
    } catch {
      toast.error(T.errorGenerico);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-portal-bg">
      {/* Sin "volver al inicio": ese link llevaba a la landing de Don Gato
          Efectivo, o sea, la puerta de un portal secreto ofrecía la salida hacia
          otro negocio. El portal no tiene home pública a dónde volver. */}
      <header className="border-b border-portal-line bg-portal-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <PortalWordmark nombre={cfg.nombreCorto} size="sm" />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center">
            <h1 className="font-portal text-2xl font-extrabold tracking-tight text-portal-ink">
              {cfg.nombreCorto}
            </h1>
            <p className="mt-2 text-sm text-portal-ink2">{cfg.tagline}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-portal-muted">
              {T.subtitulo}
            </p>
          </div>

          <PCard className="mt-6">
            <form onSubmit={entrar} className="space-y-4">
              <PInput
                label={T.emailLabel}
                type="email"
                autoComplete="email"
                placeholder={T.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <PPassword
                label={T.passwordLabel}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <PButton type="submit" fullWidth pill size="lg" loading={loading} disabled={loading}>
                {loading ? T.entrando : T.cta}
              </PButton>
            </form>
          </PCard>

          {/* Nota neutra: ícono simple + aviso de portal privado. */}
          <PNota className="mt-6" icon={Lock}>
            {T.nota}
          </PNota>

          <p className="mt-6 text-center text-[11px] text-portal-muted">{COPY.portales.pieLegal}</p>
        </div>
      </main>
    </div>
  );
}
