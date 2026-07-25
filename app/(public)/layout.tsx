import type { ReactNode } from "react";
import type { Metadata } from "next";

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

/**
 * 🔴 Única excepción al `noindex` global del layout raíz (decisión de Diego,
 * 2026-07-25). El default del sitio sigue siendo NO indexar; acá se abre a
 * propósito y solo para este grupo.
 *
 * Por qué: quien recibe una invitación busca "ValorizaPeru" para confirmar que
 * la empresa existe antes de entregar dinero. Una landing invisible obliga a
 * confiar sin poder verificar, y la verificabilidad es un objetivo de marca
 * (`docs-internal/OBJETIVOS_MARCA.md` L5/M7), no una táctica de posicionamiento.
 *
 * ⚠️ El grupo `(public)` son exactamente 5 páginas: la landing, las 3 legales y
 * el libro de reclamaciones. `login` y `nueva-clave` viven FUERA del grupo, así
 * que siguen heredando el `noindex` del raíz — que es lo correcto. Si algún día
 * se agrega una página acá dentro, queda indexable sin que nadie lo decida:
 * verificá que corresponda antes de ponerla en este grupo.
 *
 * Lo que NO cambia: el portal privado sigue invisible. Eso sale del encuadre
 * legal ("privado y por invitación"), no de una preferencia.
 */
export const metadata: Metadata = {
  robots: { index: true, follow: true },
  // Una URL canónica por contenido. `'./'` resuelve relativo a `metadataBase`
  // (layout raíz) y a la ruta de cada página, así que las 5 páginas del grupo
  // quedan con su canonical correcto sin repetirlo una por una.
  alternates: { canonical: "./" },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <PortalTema portal={PORTAL_SLUG}>{children}</PortalTema>;
}
