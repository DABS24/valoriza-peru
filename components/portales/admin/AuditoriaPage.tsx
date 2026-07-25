import { requirePortalAdmin } from "@/lib/portales/guards";
import { AuditoriaTabla } from "@/components/portales/admin/AuditoriaTabla";
import type { PortalSlug } from "@/lib/portales/config";

/**
 * Bitácora del portal (SERVER). Doble gate, igual que UsuariosPage: el layout de
 * /admin ya exigió administrador y esto lo vuelve a exigir — si algún día la ruta se
 * mueve fuera de ese layout, la pantalla no queda abierta por accidente.
 *
 * No resuelve datos: la tabla se lee desde el navegador con la sesión del usuario,
 * porque la RLS `portal_es_admin(portal)` (0089) es la barrera real y la pantalla es
 * pura interacción (filtros, paginación, detalle).
 */
export default async function AuditoriaPage({ portal }: { portal: PortalSlug }) {
  await requirePortalAdmin(portal);
  return <AuditoriaTabla portal={portal} />;
}
