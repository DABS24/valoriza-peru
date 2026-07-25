import { requirePortalStaff } from "@/lib/portales/guards";
import { kpisAsesor, alertasAsesor } from "@/lib/portales/data";
import { esAdminPortal } from "@/lib/portales/roles";
import type { PortalSlug } from "@/lib/portales/config";
import { AsesorDashboard } from "@/components/portales/asesor/AsesorDashboard";

/**
 * Inicio del asesor (SERVER). KPIs y alertas de SU cartera (acotadas a
 * asesor_id = él) en un solo Promise.all. Un admin también puede entrar (rango
 * superior): ve su propia cartera si tuviera clientes asignados, y además el
 * atajo para resolver las solicitudes sin revisar (esa sección es solo de admin;
 * el asesor ve el conteo pero no el link, porque el guard de la ruta lo rebotaría).
 */
export default async function AsesorPage({ portal }: { portal: PortalSlug }) {
  const miembro = await requirePortalStaff(portal);
  const [kpis, alertas] = await Promise.all([
    kpisAsesor(portal, miembro.userId),
    alertasAsesor(portal, miembro.userId),
  ]);
  return (
    <AsesorDashboard
      portal={portal}
      kpis={kpis}
      alertas={alertas}
      puedeResolverSolicitudes={esAdminPortal(miembro.rol)}
    />
  );
}
