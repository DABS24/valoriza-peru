import PrestatariosPage from "@/components/portales/admin/PrestatariosPage";
import { PORTAL_SLUG } from "@/lib/portales/config";

export default function Page() {
  return <PrestatariosPage portal={PORTAL_SLUG} />;
}
