import type { ReactNode } from "react";

/**
 * Shell público. No lleva nav ni pie propios: la landing trae los suyos, y las
 * páginas legales usan `LegalShell`. Existe para separar el grupo público del
 * gateado, no para envolver nada.
 */
export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
