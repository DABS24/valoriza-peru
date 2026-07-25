import { requirePortalCliente } from "@/lib/portales/guards";
import { listarReservasCliente, contarDisponiblesCliente, getMiAsesor } from "@/lib/portales/data";
import type { PortalSlug } from "@/lib/portales/config";
import { ClienteDashboard } from "@/components/portales/cliente/ClienteDashboard";

/**
 * Inicio del inversionista (SERVER). Carga en un solo Promise.all sus reservas, el
 * conteo de disponibles y su asesor. Deriva activas/confirmadas de las reservas
 * (SSOT: no se guarda un contador aparte). "En proceso" = activas + confirmadas:
 * son las que muestran su timeline (reservada → confirmada → financiada).
 */
export default async function ClienteInicioPage({ portal }: { portal: PortalSlug }) {
  const miembro = await requirePortalCliente(portal);
  const [reservas, disponibles, asesor] = await Promise.all([
    listarReservasCliente(portal),
    contarDisponiblesCliente(portal),
    getMiAsesor(portal),
  ]);
  const enProceso = reservas.filter((r) => r.estado === "activa" || r.estado === "confirmada");
  const activasCount = reservas.filter((r) => r.estado === "activa").length;
  const confirmadasCount = reservas.filter((r) => r.estado === "confirmada").length;
  return (
    <ClienteDashboard
      portal={portal}
      nombre={miembro.nombre}
      enProceso={enProceso}
      activasCount={activasCount}
      confirmadasCount={confirmadasCount}
      disponibles={disponibles}
      asesor={asesor}
    />
  );
}
