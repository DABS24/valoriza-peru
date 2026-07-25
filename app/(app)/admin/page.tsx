import TableroPage from "@/components/portales/admin/TableroPage";
import { PORTAL_SLUG } from "@/lib/portales/config";

export default function Page() {
  return <TableroPage portal={PORTAL_SLUG} />;
}
