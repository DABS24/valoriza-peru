/**
 * Metadata (título de pestaña + noindex) del PORTAL, fuente ÚNICA.
 *
 * El `<title>` es el `nombreCorto` del config: renombrar la marca se hace SOLO en
 * lib/portales/config.ts y se propaga acá.
 *
 * Va `title.absolute`, NO `title.default`: `default` sí lo envuelve el `template`
 * de un layout padre, y este portal no hereda el título de nadie. (Cuando vivía en
 * el monorepo de Don Gato la pestaña decía "ValorizaPeru · Don Gato Efectivo", que
 * es exactamente lo que un portal por invitación no puede decir.) El `template` que
 * se declara acá sigue aplicando a las páginas internas (`%s · ValorizaPeru`).
 *
 * El portal va `noindex`: es privado, por invitación, fuera de buscadores.
 */

import type { Metadata } from "next";

import { portalPorSlug, type PortalSlug } from "@/lib/portales/config";

/** Metadata base del portal: título de la marca + noindex. */
export function portalMetadata(portal: PortalSlug): Metadata {
  const cfg = portalPorSlug(portal);
  const nombre = cfg?.nombreCorto ?? "";
  return {
    title: { absolute: nombre, template: `%s · ${nombre}` },
    // Ícono del portal (monograma de la marca, app/icon.tsx). Declararlo acá
    // además del archivo NO es redundante: fija el ícono que usa iOS al agregar
    // el portal a la pantalla de inicio, en vez de dejar que herede otro.
    icons: { icon: [{ url: "/icon", type: "image/png", sizes: "64x64" }] },
    description: cfg?.tagline ?? "",
    applicationName: nombre,
    // Sin vista previa de enlace: un portal privado no necesita tarjeta al
    // pegarlo en WhatsApp, y no tener preview es mejor que tener una equivocada.
    openGraph: null,
    twitter: null,
    robots: { index: false, follow: false },
  };
}
