import { notFound } from "next/navigation";

import { requirePortalAdmin } from "@/lib/portales/guards";
import { listarPrestatarios } from "@/lib/portales/data";
import { portalPorSlug, type PortalSlug } from "@/lib/portales/config";
import { PrestatariosTabla } from "@/components/portales/admin/PrestatariosTabla";

/**
 * Gestión de PRESTATARIOS (contratistas) del portal (SERVER). Solo aplica a
 * verticales con prestatarios (config); si no, 404. Re-gate ADMIN (el mismo que el
 * layout de /admin) + carga server-side; la interacción vive en PrestatariosTabla.
 */
export default async function PrestatariosPage({ portal }: { portal: PortalSlug }) {
  if (!portalPorSlug(portal)?.prestatarios) notFound();
  await requirePortalAdmin(portal);
  const prestatarios = await listarPrestatarios(portal);
  return <PrestatariosTabla prestatarios={prestatarios} />;
}
