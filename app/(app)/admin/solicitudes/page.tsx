import SolicitudesAdminPage from "@/components/portales/admin/SolicitudesAdminPage";
import { PORTAL_SLUG } from "@/lib/portales/config";

export default function Page() {
  return <SolicitudesAdminPage portal={PORTAL_SLUG} />;
}
