import { requirePortalSession } from "@/lib/portales/guards";
import { type PortalSlug } from "@/lib/portales/config";
import { PortalConfiguracion } from "@/components/portales/PortalConfiguracion";
import { loginPortal } from "@/lib/portales/rutas";

/** Configuración del portal (SERVER). Cualquier miembro activo; el login es el del portal. */
export default async function ConfiguracionPage({ portal }: { portal: PortalSlug }) {
  await requirePortalSession(portal);
  return <PortalConfiguracion loginHref={loginPortal(portal)} />;
}
