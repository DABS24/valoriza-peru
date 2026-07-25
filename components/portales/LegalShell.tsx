import Link from "next/link";

import { APP } from "@/lib/constants";
import { COPY } from "@/lib/copy";
import { PORTAL } from "@/lib/portales/config";

/**
 * Chrome compartido de las páginas legales públicas. Existe para que las cuatro
 * se vean igual y para que ninguna se olvide del enlace de vuelta ni del pie:
 * es el mismo principio del default correcto de un primitivo.
 */
export default function LegalShell({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  const anio = new Date().getFullYear();
  return (
    <main className="min-h-dvh bg-portal-bg text-portal-ink">
      <header className="border-b border-portal-line">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="font-semibold tracking-tight hover:text-portal-primary">
            {PORTAL.nombre}
          </Link>
        </div>
      </header>
      <div className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{titulo}</h1>
        <div className="mt-8 space-y-8">{children}</div>
      </div>
      <footer className="border-t border-portal-line px-5 py-8 sm:px-8">
        <p className="mx-auto w-full max-w-3xl text-xs leading-relaxed text-portal-muted">
          {COPY.landing.pie.aviso}
        </p>
        <p className="mx-auto mt-4 w-full max-w-3xl text-xs text-portal-muted">
          © {anio} {APP.legalName}.
        </p>
      </footer>
    </main>
  );
}
