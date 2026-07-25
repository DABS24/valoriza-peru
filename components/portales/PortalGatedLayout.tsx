import type { ReactNode } from "react";

import { requirePortalSession } from "@/lib/portales/guards";
import type { PortalSlug } from "@/lib/portales/config";
import { PortalShell } from "@/components/portales/PortalShell";
import { PortalTema } from "@/components/portales/PortalTema";

/**
 * Layout de la zona autenticada de un portal (SERVER). Exige membresía activa
 * (redirige al login del portal si no) y monta el cascarón con el nav por rol.
 * El login vive FUERA de este layout (route group) para no entrar en loop.
 */
export default async function PortalGatedLayout({
  portal,
  children,
}: {
  portal: PortalSlug;
  children: ReactNode;
}) {
  const miembro = await requirePortalSession(portal);
  return (
    <PortalTema portal={portal} className="min-h-dvh">
      <PortalShell portal={portal} rol={miembro.rol} nombre={miembro.nombre}>
        {children}
      </PortalShell>
    </PortalTema>
  );
}
