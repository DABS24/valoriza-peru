import EmpresarioInicioPage from "@/components/portales/empresario/EmpresarioInicioPage";
import { PORTAL_SLUG } from "@/lib/portales/config";

export default function Page() {
  return <EmpresarioInicioPage portal={PORTAL_SLUG} />;
}
