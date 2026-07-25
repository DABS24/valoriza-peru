import { requirePortalAdmin } from "@/lib/portales/guards";
import { listarOportunidades } from "@/lib/portales/data";
import type { PortalSlug } from "@/lib/portales/config";
import { OportunidadesLista } from "@/components/portales/admin/OportunidadesLista";

/**
 * Lista de oportunidades del portal (SERVER). Re-gate ADMIN (defensa en profundidad,
 * el MISMO nivel que el layout de /admin) + carga server-side. El filtro por estado
 * vive en el client.
 */
export default async function OportunidadesPage({ portal }: { portal: PortalSlug }) {
  await requirePortalAdmin(portal);
  const oportunidades = await listarOportunidades(portal);
  return <OportunidadesLista portal={portal} oportunidades={oportunidades} />;
}
