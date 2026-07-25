import type { MetadataRoute } from "next";

import { APP } from "@/lib/constants";

/**
 * robots.txt.
 *
 * 🔴 Acá NO se listan las rutas privadas, aunque sea lo intuitivo. `robots.txt`
 * es público: un `Disallow: /admin` le anuncia al mundo que ese panel existe y
 * dónde está. Y además no protege nada — es una cortesía para rastreadores
 * educados, no una barrera.
 *
 * Quien de verdad mantiene el portal fuera de los buscadores es el `noindex` de
 * la metadata (layout raíz + `portalMetadata()`), y quien impide el ACCESO es el
 * guard server-side de `lib/portales/guards.ts`. Este archivo solo apunta al
 * sitemap de lo que sí es público.
 */
export default function robots(): MetadataRoute.Robots {
  const base = APP.url.replace(/\/$/, "");
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${base}/sitemap.xml`,
  };
}
