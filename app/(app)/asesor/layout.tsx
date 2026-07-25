import type { ReactNode } from "react";

import { requirePortalStaff } from "@/lib/portales/guards";
import { PORTAL_SLUG } from "@/lib/portales/config";

export default async function Layout({ children }: { children: ReactNode }) {
  await requirePortalStaff(PORTAL_SLUG);
  return <>{children}</>;
}
