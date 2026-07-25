import OportunidadesPage from "@/components/portales/admin/OportunidadesPage";
import { PORTAL_SLUG } from "@/lib/portales/config";

export default function Page() {
  return <OportunidadesPage portal={PORTAL_SLUG} />;
}
