import type { ReactNode } from "react";

import { PortalTema } from "@/components/portales/PortalTema";
import { PORTAL_SLUG } from "@/lib/portales/config";

/**
 * Shell público.
 *
 * 🔴 Cuelga de `PortalTema` a propósito: los tokens `portal-*` están scopeados a
 * `.portal-theme`, así que FUERA de este wrapper la landing renderiza sin acento,
 * sin la fuente de marca y sin ninguno de los colores del tema. Fue exactamente
 * lo que pasó cuando se escribió: se veía como HTML sin estilar.
 */
export default function Layout({ children }: { children: ReactNode }) {
  return <PortalTema portal={PORTAL_SLUG}>{children}</PortalTema>;
}
