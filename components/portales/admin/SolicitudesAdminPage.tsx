import { notFound } from "next/navigation";

import { requirePortalAdmin } from "@/lib/portales/guards";
import { listarSolicitudesStaff } from "@/lib/portales/data";
import { portalPorSlug, type PortalSlug } from "@/lib/portales/config";
import { SolicitudesAdmin } from "@/components/portales/admin/SolicitudesAdmin";

/**
 * Solicitudes de financiamiento del portal (SERVER). Solo aplica a verticales con
 * prestatarios (si no, 404). Re-gate ADMIN + carga server-side. El filtro por estado
 * y las acciones viven en el client.
 *
 * ADMIN, no staff: el layout de /admin ya exige administrador, y una defensa en
 * profundidad MÁS DÉBIL que la que defiende no defiende nada. Acá además desalineaba
 * la UI de la API — resolver una solicitud (`PATCH /solicitudes/[id]`) exige admin,
 * así que un asesor habría visto botones que devuelven 403.
 */
export default async function SolicitudesAdminPage({ portal }: { portal: PortalSlug }) {
  if (!portalPorSlug(portal)?.prestatarios) notFound();
  await requirePortalAdmin(portal);
  const solicitudes = await listarSolicitudesStaff(portal);
  return <SolicitudesAdmin portal={portal} solicitudes={solicitudes} />;
}
