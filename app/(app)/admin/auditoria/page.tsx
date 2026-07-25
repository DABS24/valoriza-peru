import AuditoriaPage from "@/components/portales/admin/AuditoriaPage";
import { PORTAL_SLUG } from "@/lib/portales/config";

export default function Page() {
  return <AuditoriaPage portal={PORTAL_SLUG} />;
}
