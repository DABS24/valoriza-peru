import PortalIndex from "@/components/portales/PortalIndex";
import { PORTAL_SLUG } from "@/lib/portales/config";

export default function Page() {
  return <PortalIndex portal={PORTAL_SLUG} />;
}
