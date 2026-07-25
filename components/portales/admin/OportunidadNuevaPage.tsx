import { requirePortalAdmin } from "@/lib/portales/guards";
import { portalPorSlug, type PortalSlug } from "@/lib/portales/config";
import { listarPrestatariosOpciones } from "@/lib/portales/data";
import { OportunidadForm } from "@/components/portales/admin/OportunidadForm";

/**
 * Alta de una oportunidad (SERVER wrapper del form). Re-gate ADMIN, el mismo nivel
 * que el layout de /admin.
 */
export default async function OportunidadNuevaPage({ portal }: { portal: PortalSlug }) {
  await requirePortalAdmin(portal);
  const prestatarios = portalPorSlug(portal)?.prestatarios
    ? await listarPrestatariosOpciones(portal)
    : [];
  return <OportunidadForm portal={portal} prestatarios={prestatarios} />;
}
