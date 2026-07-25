import AsesorPage from "@/components/portales/asesor/AsesorPage";
import { PORTAL_SLUG } from "@/lib/portales/config";

export default function Page() {
  return <AsesorPage portal={PORTAL_SLUG} />;
}
