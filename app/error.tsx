"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

import { PButton } from "@/components/portales/ui/PButton";
import { PortalTema } from "@/components/portales/PortalTema";
import { COPY } from "@/lib/copy";
import { PORTAL_SLUG } from "@/lib/portales/config";

const T = COPY.pages.error;

/**
 * Error boundary del portal. Va con el TEMA del portal (no el de la app madre de
 * donde salió este código) y no muestra nada técnico: el mensaje, el stack y la
 * ref quedan en el log del servidor, no en la pantalla de un inversionista.
 *
 * Tampoco hay botón de "reportar": en el repo anterior el reporte se mandaba por
 * correo DESDE EL NAVEGADOR. Cuando haya monitoreo (Sentry), el enganche va en el
 * `useEffect` de acá, server-side y sin pedirle nada al usuario.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[valorizaperu] error:", error);
    }
  }, [error]);

  return (
    <PortalTema portal={PORTAL_SLUG}>
      <main className="flex min-h-dvh flex-col items-center justify-center bg-portal-bg p-6 text-center">
        <span className="grid size-14 place-items-center rounded-portal bg-portal-primary-soft text-portal-primary-ink">
          <TriangleAlert className="size-7" aria-hidden />
        </span>
        <h1 className="mt-6 font-portal text-2xl font-extrabold tracking-tight text-portal-ink sm:text-3xl">
          {T.title}
        </h1>
        <p className="mt-3 max-w-md text-balance text-sm text-portal-muted">{T.sub}</p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <PButton onClick={reset} pill>
            {T.retry}
          </PButton>
          <PButton as="link" href="/" variant="ghost" pill>
            {T.home}
          </PButton>
        </div>

        <p className="mt-10 text-xs text-portal-muted">{COPY.portales.pieLegal}</p>
      </main>
    </PortalTema>
  );
}
