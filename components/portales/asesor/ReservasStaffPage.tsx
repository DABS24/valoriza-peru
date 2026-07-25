import { requirePortalStaff } from "@/lib/portales/guards";
import { listarReservasStaff } from "@/lib/portales/data";
import { esAdminPortal } from "@/lib/portales/roles";
import type { PortalSlug } from "@/lib/portales/config";
import { ReservasCola } from "@/components/portales/asesor/ReservasCola";

/**
 * Cola de reservas del staff (SERVER). Carga en un solo Promise.all las ACTIVAS
 * (pendientes de confirmar) y las CONFIRMADAS (pendientes de marcar financiada,
 * cierre del ciclo). El filtro "solo mis clientes" es local. El asesor arranca
 * viendo las suyas; el admin, todas.
 */
export default async function ReservasStaffPage({ portal }: { portal: PortalSlug }) {
  const miembro = await requirePortalStaff(portal);
  const [activas, confirmadas] = await Promise.all([
    listarReservasStaff(portal, { estado: "activa" }),
    listarReservasStaff(portal, { estado: "confirmada" }),
  ]);
  return (
    <ReservasCola
      activas={activas}
      confirmadas={confirmadas}
      miId={miembro.userId}
      defaultSoloMias={!esAdminPortal(miembro.rol)}
    />
  );
}
