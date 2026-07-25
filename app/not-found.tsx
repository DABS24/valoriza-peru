import { PortalNoEncontrado } from "@/components/portales/PortalNoEncontrado";
import { PORTAL_SLUG } from "@/lib/portales/config";

/** 404 del portal: URL que no matchea ninguna ruta. */
export default function NotFound() {
  return <PortalNoEncontrado portal={PORTAL_SLUG} />;
}
