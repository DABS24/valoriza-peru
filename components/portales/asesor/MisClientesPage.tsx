import { requirePortalStaff } from "@/lib/portales/guards";
import { listarClientesDeAsesorEnriquecido, listarProspectosDeAsesor } from "@/lib/portales/data";
import type { PortalSlug } from "@/lib/portales/config";
import { MisClientes } from "@/components/portales/asesor/MisClientes";

/**
 * Mis clientes (SERVER). Su cartera COMPLETA: los inversionistas con cuenta y los
 * que todavía no la tienen (prospectos, 0090) — que en el flujo real son la
 * mayoría al principio, porque la cuenta se crea recién cuando ya operaron. Las
 * dos listas van enriquecidas igual y en una sola ronda (§6). Acotado a
 * asesor_id = él (RLS staff + la cláusula).
 */
export default async function MisClientesPage({ portal }: { portal: PortalSlug }) {
  const miembro = await requirePortalStaff(portal);
  const [clientes, prospectos] = await Promise.all([
    listarClientesDeAsesorEnriquecido(portal, miembro.userId),
    listarProspectosDeAsesor(portal, miembro.userId),
  ]);
  return <MisClientes portal={portal} clientes={clientes} prospectos={prospectos} />;
}
