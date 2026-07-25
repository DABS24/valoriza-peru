import { FileQuestion } from "lucide-react";

import { PButton } from "@/components/portales/ui/PButton";
import { PortalTema } from "@/components/portales/PortalTema";
import { COPY } from "@/lib/copy";
import type { PortalSlug } from "@/lib/portales/config";
import { basePortal } from "@/lib/portales/rutas";

/**
 * 404 del portal.
 *
 * Se envuelve en `PortalTema` porque el 404 puede renderizarse FUERA del layout
 * autenticado (Next lo monta en el segmento, sin el shell), así que los tokens
 * `portal-*` no vendrían heredados y la página saldría sin tema.
 *
 * ⚠️ ALCANCE REAL (verificado en vivo, no asumido): un `not-found.tsx` de segmento
 * captura los `notFound()` EXPLÍCITOS — que es el caso que ocurre de verdad:
 * recurso inexistente o ajeno a tu cartera (el guard anti-IDOR de la ficha del
 * cliente termina acá). Una URL que no matchea NINGUNA ruta cae en el
 * `app/not-found.tsx` raíz; así funciona el App Router.
 */
export function PortalNoEncontrado({ portal }: { portal: PortalSlug }) {
  const T = COPY.portales.noEncontrado;

  return (
    <PortalTema portal={portal}>
      <main className="flex min-h-dvh flex-col items-center justify-center bg-portal-bg p-6 text-center">
        <span className="grid size-14 place-items-center rounded-portal bg-portal-primary-soft text-portal-primary-ink">
          <FileQuestion className="size-7" aria-hidden />
        </span>
        <h1 className="mt-6 font-portal text-2xl font-extrabold tracking-tight text-portal-ink sm:text-3xl">
          {T.titulo}
        </h1>
        <p className="mt-3 max-w-md text-balance text-sm text-portal-muted">{T.sub}</p>
        <PButton as="link" href={basePortal(portal) || "/"} pill className="mt-8">
          {T.cta}
        </PButton>
        <p className="mt-10 text-xs text-portal-muted">{COPY.portales.pieLegal}</p>
      </main>
    </PortalTema>
  );
}
