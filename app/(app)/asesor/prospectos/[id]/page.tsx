import FichaProspectoPage from "@/components/portales/asesor/FichaProspectoPage";
import { PORTAL_SLUG } from "@/lib/portales/config";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FichaProspectoPage portal={PORTAL_SLUG} id={id} />;
}
