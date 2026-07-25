"use client";

/**
 * Lógica compartida de "establecer contraseña desde el enlace del correo".
 *
 * Vive acá y no dentro de una pantalla porque hay DOS pantallas con el mismo
 * mecanismo: la pantalla pública `app/nueva-clave`
 * y la de cada PORTAL de inversión (`app/<ruta>/nueva-clave`). Lo único que
 * cambia entre ellas es el chrome y a qué login vuelven; el manejo del token no
 * puede divergir — si diverge, uno de los dos flujos se rompe en silencio.
 */

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export type EstadoNuevaClave = "validando" | "listo" | "invalido";

/**
 * Abre la sesión temporal a partir del enlace del correo. El token puede venir
 * de dos formas según cómo lo emita Supabase: en el HASH (#access_token=…&
 * refresh_token=…, flujo implícito — es lo que produce admin.generateLink) o en
 * el QUERY (?code=…, flujo PKCE). Si no hay token válido, el enlace venció o se
 * abrió en otro navegador.
 */
export function useSesionRecuperacion(): EstadoNuevaClave {
  const [estado, setEstado] = useState<EstadoNuevaClave>("validando");

  useEffect(() => {
    let vivo = true;

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    if (hash.get("error") || query.get("error")) {
      setEstado("invalido");
      return;
    }

    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      setEstado("invalido");
      return;
    }

    async function abrirSesion(): Promise<boolean> {
      const at = hash.get("access_token");
      const rt = hash.get("refresh_token");
      const code = query.get("code");
      if (at && rt) {
        const { error } = await supabase.auth.setSession({ access_token: at, refresh_token: rt });
        return !error;
      }
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        return !error;
      }
      // Fallback: por si el cliente ya detectó la sesión desde la URL.
      const { data } = await supabase.auth.getSession();
      return !!data.session;
    }

    abrirSesion()
      .then((ok) => {
        if (!vivo) return;
        setEstado(ok ? "listo" : "invalido");
        // Limpia el token del address bar por seguridad (queda en el historial si no).
        if (ok && window.location.hash) {
          window.history.replaceState(null, "", window.location.pathname);
        }
      })
      .catch(() => {
        if (vivo) setEstado("invalido");
      });

    return () => {
      vivo = false;
    };
  }, []);

  return estado;
}

/**
 * Guarda la contraseña nueva y deja la sesión de recuperación cerrada, para que
 * el usuario entre limpio (y vuelva a pasar 2FA si lo tiene activo).
 *
 * Libera el lockout ANTES de cerrar la sesión (la ruta se apoya en ella). Sin
 * esto, a quien bloquearon a propósito no le alcanzaba con cambiar su contraseña:
 * quedaba igual de afuera. Best-effort: si falla, el bloqueo se libera por tiempo.
 */
export async function guardarNuevaClave(password: string): Promise<boolean> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return false;
    await fetch("/api/auth/desbloquear", { method: "POST" }).catch(() => {});
    await supabase.auth.signOut();
    return true;
  } catch {
    return false;
  }
}
