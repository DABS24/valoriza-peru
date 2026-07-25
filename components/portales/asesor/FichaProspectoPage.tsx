import { notFound } from "next/navigation";

import { requirePortalStaff } from "@/lib/portales/guards";
import { getProspectoDeAsesor } from "@/lib/portales/data";
import type { PortalSlug } from "@/lib/portales/config";
import { FichaProspecto } from "@/components/portales/asesor/FichaProspecto";

/**
 * Ficha 360 de un titular SIN cuenta (SERVER). SOLO se abre si el prospecto es de
 * la cartera del asesor (getProspectoDeAsesor verifica asesor_id = él); si no, 404
 * — un uuid válido de otro asesor NO da acceso (anti-IDOR), y el 404 no distingue
 * "no existe" de "no es tuyo". Con la sesión (RLS staff + cartera).
 */
export default async function FichaProspectoPage({
  portal,
  id,
}: {
  portal: PortalSlug;
  id: string;
}) {
  const miembro = await requirePortalStaff(portal);
  const ficha = await getProspectoDeAsesor(portal, miembro.userId, id);
  if (!ficha) notFound();
  return <FichaProspecto portal={portal} ficha={ficha} />;
}
