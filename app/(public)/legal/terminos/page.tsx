import TerminosPage from "@/components/portales/TerminosPage";
import { COPY } from "@/lib/copy";
import { PORTAL_SLUG } from "@/lib/portales/config";

export const metadata = { title: COPY.portales.terminos.titulo };

export default function Page() {
  return <TerminosPage portal={PORTAL_SLUG} />;
}
