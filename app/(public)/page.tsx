import { redirect } from "next/navigation";

import Landing from "@/components/portales/Landing";
import { COPY } from "@/lib/copy";
import { PORTAL_SLUG } from "@/lib/portales/config";
import { getPortalMiembro } from "@/lib/portales/guards";
import { homePortal } from "@/lib/portales/rutas";

export const metadata = {
  title: COPY.landing.meta.titulo,
  description: COPY.landing.meta.descripcion,
};

/**
 * Raíz pública. Si ya hay sesión, se manda a cada quien a su home (lo que hacía
 * el índice gateado); si no, se muestra la landing institucional.
 *
 * El destino sale de `homePortal`, que es la fuente única compartida con el login
 * y los guards — escribirlo otra vez acá fue justo cómo el login terminó mandando
 * al admin a una pantalla distinta.
 */
export default async function Page() {
  const miembro = await getPortalMiembro(PORTAL_SLUG);
  if (miembro) redirect(homePortal(PORTAL_SLUG, miembro.rol));
  return <Landing />;
}
