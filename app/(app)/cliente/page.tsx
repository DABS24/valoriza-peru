import ClienteInicioPage from "@/components/portales/cliente/ClienteInicioPage";
import { PORTAL_SLUG } from "@/lib/portales/config";

export default function Page() {
  return <ClienteInicioPage portal={PORTAL_SLUG} />;
}
