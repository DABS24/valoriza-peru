import { notFound } from "next/navigation";

import { requirePortalCliente } from "@/lib/portales/guards";
import { getOportunidadCliente, getMiAsesor, titularesDeAsesor } from "@/lib/portales/data";
import { esClientePortal, esStaffPortal } from "@/lib/portales/roles";
import type { PortalSlug } from "@/lib/portales/config";
import { DetalleCliente } from "@/components/portales/cliente/DetalleCliente";

/**
 * Ficha del inversionista (SERVER). getOportunidadCliente devuelve null (→404) si
 * la oportunidad no es pública o no es de este portal. Nunca trae notas internas.
 * Si quien mira es STAFF, en la misma ronda se carga SU cartera para poder
 * bloquear a nombre de alguien desde acá (0090).
 */
export default async function DetalleClientePage({
  portal,
  id,
}: {
  portal: PortalSlug;
  id: string;
}) {
  const miembro = await requirePortalCliente(portal);
  const esStaff = esStaffPortal(miembro.rol);
  const [op, asesor, titulares] = await Promise.all([
    getOportunidadCliente(portal, id),
    getMiAsesor(portal),
    esStaff ? titularesDeAsesor(portal, miembro.userId) : Promise.resolve([]),
  ]);
  if (!op) notFound();
  return (
    <DetalleCliente
      portal={portal}
      op={op}
      miId={miembro.userId}
      asesor={asesor}
      esCliente={esClientePortal(miembro.rol)}
      esStaff={esStaff}
      titulares={titulares}
    />
  );
}
