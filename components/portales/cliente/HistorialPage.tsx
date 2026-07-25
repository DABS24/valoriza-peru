import { requirePortalCliente } from "@/lib/portales/guards";
import { listarReservasCliente } from "@/lib/portales/data";
import type { PortalSlug } from "@/lib/portales/config";
import { HistorialCliente } from "@/components/portales/cliente/HistorialCliente";

/** Historial de reservas del inversionista (SERVER). El cliente lee solo las suyas. */
export default async function HistorialPage({ portal }: { portal: PortalSlug }) {
  await requirePortalCliente(portal);
  const reservas = await listarReservasCliente(portal);
  return <HistorialCliente portal={portal} reservas={reservas} />;
}
