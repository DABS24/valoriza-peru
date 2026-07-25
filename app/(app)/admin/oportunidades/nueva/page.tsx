import OportunidadNuevaPage from "@/components/portales/admin/OportunidadNuevaPage";
import { PORTAL_SLUG } from "@/lib/portales/config";

export default function Page() {
  return <OportunidadNuevaPage portal={PORTAL_SLUG} />;
}
