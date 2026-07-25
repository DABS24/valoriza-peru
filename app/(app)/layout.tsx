import type { ReactNode } from "react";

import PortalGatedLayout from "@/components/portales/PortalGatedLayout";
import { portalMetadata } from "@/lib/portales/metadata";
import { PORTAL_SLUG } from "@/lib/portales/config";

export const metadata = portalMetadata(PORTAL_SLUG);

export default function Layout({ children }: { children: ReactNode }) {
  return <PortalGatedLayout portal={PORTAL_SLUG}>{children}</PortalGatedLayout>;
}
