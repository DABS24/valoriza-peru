import FichaClientePage from "@/components/portales/asesor/FichaClientePage";
import { PORTAL_SLUG } from "@/lib/portales/config";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FichaClientePage portal={PORTAL_SLUG} id={id} />;
}
