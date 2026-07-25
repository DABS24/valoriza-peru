import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { fuentePortal } from "@/lib/portales/fuente";
import { cssTema } from "@/lib/portales/tema";
import type { PortalSlug } from "@/lib/portales/config";

/**
 * Envoltura de TEMA de un portal. Marca el subtree con `.portal-theme` +
 * `data-portal` (para el acento por-portal), aplica la fuente Jakarta y estampa
 * el CSS del tema una vez. Todo el estilo InversionNPL cuelga de acá: fuera de
 * este wrapper el look de Don Gato Efectivo queda intacto.
 *
 * Server component: sin estado, solo inyecta el `<style>` estático de cssTema().
 */
export function PortalTema({
  portal,
  className,
  children,
}: {
  portal: PortalSlug;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-portal={portal}
      className={cn("portal-theme font-portal", fuentePortal.variable, className)}
    >
      {/* Tokens del tema (scopeados por los selectores .portal-theme de cssTema). */}
      <style dangerouslySetInnerHTML={{ __html: cssTema() }} />
      {children}
    </div>
  );
}
