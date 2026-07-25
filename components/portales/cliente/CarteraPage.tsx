import { requirePortalCliente } from "@/lib/portales/guards";
import { carteraCliente } from "@/lib/portales/data";
import type { PortalSlug } from "@/lib/portales/config";
import { CarteraCliente } from "@/components/portales/cliente/CarteraCliente";

/**
 * "Mi cartera" del inversionista (SERVER). carteraCliente resuelve, acotado a SUS
 * reservas, el monto comprometido, la ganancia esperada al plazo y el calendario
 * de cobros. Nunca toca datos internos.
 */
export default async function CarteraPage({ portal }: { portal: PortalSlug }) {
  await requirePortalCliente(portal);
  const cartera = await carteraCliente(portal);
  return <CarteraCliente portal={portal} cartera={cartera} />;
}
