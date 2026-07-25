import { notFound } from "next/navigation";

import { requirePortalAdmin } from "@/lib/portales/guards";
import { getOportunidad, listarPrestatariosOpciones } from "@/lib/portales/data";
import { portalPorSlug, type PortalSlug } from "@/lib/portales/config";
import { OportunidadForm } from "@/components/portales/admin/OportunidadForm";

/**
 * Edición de una oportunidad (SERVER wrapper): carga la data y monta el form.
 * Re-gate ADMIN, el mismo nivel que el layout de /admin (un re-gate más débil que
 * el que defiende no defiende nada).
 */
export default async function OportunidadEditarPage({
  portal,
  id,
}: {
  portal: PortalSlug;
  id: string;
}) {
  await requirePortalAdmin(portal);
  const [op, prestatarios] = await Promise.all([
    getOportunidad(portal, id),
    portalPorSlug(portal)?.prestatarios ? listarPrestatariosOpciones(portal) : Promise.resolve([]),
  ]);
  if (!op) notFound();
  return (
    <OportunidadForm
      portal={portal}
      oportunidadId={op.id}
      inicial={op}
      prestatarios={prestatarios}
    />
  );
}
