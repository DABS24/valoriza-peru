import SolicitudesEmpresarioPage from "@/components/portales/empresario/SolicitudesEmpresarioPage";
import { PORTAL_SLUG } from "@/lib/portales/config";

export default function Page() {
  return <SolicitudesEmpresarioPage portal={PORTAL_SLUG} />;
}
