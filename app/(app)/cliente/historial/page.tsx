import HistorialPage from "@/components/portales/cliente/HistorialPage";
import { PORTAL_SLUG } from "@/lib/portales/config";

export default function Page() {
  return <HistorialPage portal={PORTAL_SLUG} />;
}
