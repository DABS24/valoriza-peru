import UsuariosPage from "@/components/portales/admin/UsuariosPage";
import { PORTAL_SLUG } from "@/lib/portales/config";

export default function Page() {
  return <UsuariosPage portal={PORTAL_SLUG} />;
}
