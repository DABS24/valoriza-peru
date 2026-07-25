import DetalleClientePage from "@/components/portales/cliente/DetalleClientePage";
import { PORTAL_SLUG } from "@/lib/portales/config";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DetalleClientePage portal={PORTAL_SLUG} id={id} />;
}
