import CarteraPage from "@/components/portales/cliente/CarteraPage";
import { PORTAL_SLUG } from "@/lib/portales/config";

export default function Page() {
  return <CarteraPage portal={PORTAL_SLUG} />;
}
