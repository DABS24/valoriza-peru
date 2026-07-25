import { requirePortalCliente } from "@/lib/portales/guards";
import { catalogoParaCliente, getMiAsesor, titularesDeAsesor } from "@/lib/portales/data";
import { esClientePortal, esStaffPortal } from "@/lib/portales/roles";
import type { PortalSlug } from "@/lib/portales/config";
import { CatalogoCliente } from "@/components/portales/cliente/CatalogoCliente";

/**
 * Catálogo del inversionista (SERVER). Solo oportunidades públicas, sin notas.
 * Carga en un solo Promise.all las oportunidades y el asesor asignado (para el
 * WhatsApp de una reserva propia).
 *
 * El STAFF entra por rango superior, y acá es donde barre el pool: por eso ve la
 * acción de BLOQUEAR a nombre de alguien (0090) en lugar del "Reservar" del
 * inversionista. Su cartera se carga en la misma ronda y SOLO para él: pedirla
 * para un cliente sería traer datos que no le corresponden.
 */
export default async function CatalogoPage({ portal }: { portal: PortalSlug }) {
  const miembro = await requirePortalCliente(portal);
  const esStaff = esStaffPortal(miembro.rol);
  const [oportunidades, asesor, titulares] = await Promise.all([
    catalogoParaCliente(portal),
    getMiAsesor(portal),
    esStaff ? titularesDeAsesor(portal, miembro.userId) : Promise.resolve([]),
  ]);
  return (
    <CatalogoCliente
      portal={portal}
      oportunidades={oportunidades}
      miId={miembro.userId}
      asesor={asesor}
      esCliente={esClientePortal(miembro.rol)}
      esStaff={esStaff}
      titulares={titulares}
    />
  );
}
