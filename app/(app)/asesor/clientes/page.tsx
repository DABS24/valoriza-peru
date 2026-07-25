import MisClientesPage from "@/components/portales/asesor/MisClientesPage";
import { PORTAL_SLUG } from "@/lib/portales/config";

export default function Page() {
  return <MisClientesPage portal={PORTAL_SLUG} />;
}
