import type { ReactNode } from "react";

import { requirePortalAdmin } from "@/lib/portales/guards";
import { PORTAL_SLUG } from "@/lib/portales/config";

export default async function Layout({ children }: { children: ReactNode }) {
  await requirePortalAdmin(PORTAL_SLUG);
  return <>{children}</>;
}
