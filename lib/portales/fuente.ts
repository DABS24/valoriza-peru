/**
 * Tipografía de los PORTALES de inversión (marca aparte de Don Gato Efectivo).
 *
 * Sans moderna geométrica-amigable distinta a la de Efectivo (Geist/Inter):
 * Plus Jakarta Sans, vía next/font (self-hosted, sin request externo). Se expone
 * como variable CSS `--font-portal-sans` y se aplica SOLO al subtree de portal
 * (el wrapper `.portal-theme`), nunca al root de la app. Cambiar la fuente del
 * portal = tocar solo este archivo.
 */
import { Plus_Jakarta_Sans } from "next/font/google";

export const fuentePortal = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-portal-sans",
  display: "swap",
});
