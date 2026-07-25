import CatalogoPage from "@/components/portales/cliente/CatalogoPage";
import { PORTAL_SLUG } from "@/lib/portales/config";

export default function Page() {
  return <CatalogoPage portal={PORTAL_SLUG} />;
}
