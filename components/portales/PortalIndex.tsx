import { redirect } from "next/navigation";

import { requirePortalSession } from "@/lib/portales/guards";
import { homePortal } from "@/lib/portales/rutas";
import type { PortalSlug } from "@/lib/portales/config";

/**
 * Índice de un portal: manda a cada quien a su home según el rol. El destino sale
 * de `homePortal` (fuente única, compartida con el login y los guards): tenerlo
 * escrito acá otra vez fue justo cómo el login terminó mandando al admin a una
 * pantalla distinta.
 */
export default async function PortalIndex({ portal }: { portal: PortalSlug }): Promise<never> {
  const miembro = await requirePortalSession(portal);
  redirect(homePortal(portal, miembro.rol));
}
