import { notFound } from "next/navigation";

import { requirePortalStaff } from "@/lib/portales/guards";
import { getClienteDeAsesor } from "@/lib/portales/data";
import type { PortalSlug } from "@/lib/portales/config";
import { FichaCliente } from "@/components/portales/asesor/FichaCliente";

/**
 * Ficha 360 de un cliente (SERVER). SOLO se abre si el cliente pertenece a la
 * cartera del asesor (getClienteDeAsesor verifica asesor_id = él); si no, 404 —
 * un UUID válido de otro cliente NO da acceso (anti-IDOR). Con la sesión (RLS staff).
 */
export default async function FichaClientePage({ portal, id }: { portal: PortalSlug; id: string }) {
  const miembro = await requirePortalStaff(portal);
  const ficha = await getClienteDeAsesor(portal, miembro.userId, id);
  if (!ficha) notFound();
  return <FichaCliente portal={portal} ficha={ficha} />;
}
