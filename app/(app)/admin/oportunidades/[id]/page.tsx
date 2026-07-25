import OportunidadEditarPage from "@/components/portales/admin/OportunidadEditarPage";
import { PORTAL_SLUG } from "@/lib/portales/config";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OportunidadEditarPage portal={PORTAL_SLUG} id={id} />;
}
