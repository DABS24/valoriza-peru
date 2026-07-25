import type { MetadataRoute } from "next";

import { APP } from "@/lib/constants";

/**
 * Sitemap de lo PÚBLICO. Son exactamente las 5 páginas del grupo `(public)`:
 * la landing y las 4 legales.
 *
 * 🔴 Acá nunca entra una ruta del portal. El portal es privado por invitación
 * (`docs-internal/ENCUADRE_LEGAL.md` §1); listarlo sería anunciar su existencia
 * y sus rutas, que es justo lo contrario.
 *
 * Se escribe a mano y no se genera de las rutas a propósito: derivarlo del
 * árbol de `app/` haría que cualquier página nueva entrara al sitemap sin que
 * nadie lo decida. Son 5 URLs — el costo de mantenerlas es menor que el de un
 * descuido.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = APP.url.replace(/\/$/, "");
  const rutas = ["", "/legal/terminos", "/legal/privacidad", "/legal/cookies", "/libro-reclamaciones"];

  return rutas.map((ruta) => ({
    url: `${base}${ruta}`,
    changeFrequency: "monthly",
    priority: ruta === "" ? 1 : 0.5,
  }));
}
