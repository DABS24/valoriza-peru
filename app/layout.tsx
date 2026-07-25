import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";

import { PORTAL } from "@/lib/portales/config";

import "./globals.css";

/**
 * Layout raíz del portal. A diferencia del monorepo de donde salió, acá NO hay
 * marca madre envolviendo: la app entera ES ValorizaPeru, así que la fuente y el
 * tema los pone `PortalTema` en cada rama (login y zona autenticada) y este
 * layout solo monta el documento y el Toaster.
 *
 * La metadata concreta (título, ícono, noindex) sale de `portalMetadata()` en
 * cada página; acá va solo lo que no puede vivir por-página.
 */

export const metadata: Metadata = {
  // El portal es privado y por invitación: no se indexa, no se comparte, no
  // tiene vista previa de enlace. Esto es una línea del encuadre legal, no una
  // preferencia de SEO — ver docs-internal/ENCUADRE_LEGAL.md.
  robots: { index: false, follow: false },
  applicationName: PORTAL.nombreCorto,
  formatDetection: { email: false, address: false, telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-PE" suppressHydrationWarning>
      <body className="min-h-dvh">
        {children}
        <Toaster
          position="top-right"
          theme="light"
          richColors
          closeButton
          toastOptions={{ className: "font-portal" }}
        />
      </body>
    </html>
  );
}
