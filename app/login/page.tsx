import { PortalLogin } from "@/components/portales/PortalLogin";
import { PortalTema } from "@/components/portales/PortalTema";
import { portalMetadata } from "@/lib/portales/metadata";
import { PORTAL_SLUG } from "@/lib/portales/config";

export const metadata = portalMetadata(PORTAL_SLUG);

export default function Page() {
  return (
    <PortalTema portal={PORTAL_SLUG} className="min-h-dvh">
      <PortalLogin portal={PORTAL_SLUG} />
    </PortalTema>
  );
}
