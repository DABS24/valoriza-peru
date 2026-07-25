import ConfiguracionPage from "@/components/portales/ConfiguracionPage";
import { PORTAL_SLUG } from "@/lib/portales/config";

export default function Page() {
  return <ConfiguracionPage portal={PORTAL_SLUG} />;
}
