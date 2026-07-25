import Link from "next/link";

import { APP } from "@/lib/constants";
import { COPY } from "@/lib/copy";
import { PORTAL, PORTAL_SLUG, waPortal } from "@/lib/portales/config";
import { loginPortal } from "@/lib/portales/rutas";

/**
 * Landing pública del portal.
 *
 * 🔴 El límite que define esta pantalla no es de diseño, es regulatorio.
 * `docs-internal/ENCUADRE_LEGAL.md` marca como línea roja "registro abierto de
 * inversionistas o landing pública ofreciendo rentabilidades": eso sería oferta
 * pública y cambiaría el régimen (SMV).
 *
 * Por eso acá NO hay tasas, ni rentabilidades, ni plazos, ni oportunidades
 * listadas, ni formulario de registro. El único llamado a la acción va al login,
 * porque el acceso es por invitación. Todo el texto vive en `COPY.landing`.
 *
 * Si algún día alguien quiere "mostrar un ejemplo de rendimiento acá", eso no es
 * una mejora de conversión: es un cambio de régimen regulatorio.
 */

const T = COPY.landing;

function Seccion({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`w-full px-5 py-16 sm:px-8 sm:py-20 ${className}`}>
      <div className="mx-auto w-full max-w-5xl">{children}</div>
    </section>
  );
}

export default function Landing() {
  const login = loginPortal(PORTAL_SLUG);
  const wa = waPortal(PORTAL_SLUG, T.contacto.texto);
  const anio = new Date().getFullYear();

  return (
    <main className="min-h-dvh bg-portal-bg text-portal-ink">
      {/* Nav mínima: marca + una sola acción */}
      <header className="sticky top-0 z-10 border-b border-portal-line bg-portal-bg/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <span className="font-semibold tracking-tight">{PORTAL.nombre}</span>
          <Link
            href={login}
            className="rounded-portal-sm border border-portal-line px-4 py-2 text-sm font-semibold transition-colors hover:border-portal-primary hover:text-portal-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-primary"
          >
            {T.nav.acceder}
          </Link>
        </div>
      </header>

      {/* Hero — qué es, para quién, una acción. Sin números de rendimiento. */}
      <Seccion className="pt-14 sm:pt-20">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-portal-primary">
          {T.hero.eyebrow}
        </p>
        <h1 className="max-w-3xl text-balance text-3xl font-semibold leading-[1.15] tracking-tight sm:text-4xl md:text-5xl">
          {T.hero.titulo}
        </h1>
        <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-portal-ink2 sm:text-lg">
          {T.hero.sub}
        </p>
        <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <Link
            href={login}
            className="inline-flex min-h-11 items-center justify-center rounded-portal-sm bg-portal-primary px-6 py-3 text-sm font-semibold text-portal-primary-ink shadow-portal transition-colors hover:bg-portal-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-primary"
          >
            {T.hero.cta}
          </Link>
          <p className="text-sm text-portal-muted">{T.hero.nota}</p>
        </div>
      </Seccion>

      {/* Cómo funciona — el "ajá" en tres pasos */}
      <Seccion className="border-t border-portal-line bg-portal-surface">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{T.modelo.titulo}</h2>
        <p className="mt-3 max-w-2xl text-pretty text-portal-ink2">{T.modelo.sub}</p>
        <ol className="mt-10 grid gap-6 sm:grid-cols-3">
          {T.modelo.pasos.map((paso) => (
            <li key={paso.n} className="rounded-portal border border-portal-line bg-portal-bg p-6">
              <span
                aria-hidden="true"
                className="font-mono text-xs font-bold tracking-widest text-portal-primary"
              >
                {paso.n}
              </span>
              <h3 className="mt-3 text-base font-semibold">{paso.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-portal-ink2">{paso.texto}</p>
            </li>
          ))}
        </ol>
      </Seccion>

      {/* Qué somos y qué no — la transparencia ES el producto acá */}
      <Seccion className="border-t border-portal-line">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{T.encuadre.titulo}</h2>
        <p className="mt-3 max-w-2xl text-pretty text-portal-ink2">{T.encuadre.sub}</p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-portal border border-portal-positive-soft bg-portal-positive-soft/30 p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-portal-positive">
              {T.encuadre.si.titulo}
            </h3>
            <ul className="mt-4 space-y-3">
              {T.encuadre.si.items.map((item) => (
                <li key={item} className="text-sm leading-relaxed text-portal-ink2">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-portal border border-portal-line bg-portal-surface p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-portal-muted">
              {T.encuadre.no.titulo}
            </h3>
            <ul className="mt-4 space-y-3">
              {T.encuadre.no.items.map((item) => (
                <li key={item} className="text-sm leading-relaxed text-portal-ink2">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Seccion>

      {/* Riesgo — YMYL: se dice antes de que lo pregunten */}
      <Seccion className="border-t border-portal-line bg-portal-surface">
        <div className="rounded-portal border-l-4 border-portal-warning bg-portal-warning-soft/40 p-6">
          <h2 className="text-base font-bold">{T.riesgo.titulo}</h2>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-portal-ink2">
            {T.riesgo.texto}
          </p>
        </div>
      </Seccion>

      {/* Cierre */}
      <Seccion className="border-t border-portal-line">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {T.contacto.titulo}
            </h2>
            <p className="mt-2 text-portal-ink2">{T.contacto.texto}</p>
          </div>
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-portal-sm border border-portal-line px-6 py-3 text-sm font-semibold transition-colors hover:border-portal-primary hover:text-portal-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-primary"
          >
            {T.contacto.cta}
          </a>
        </div>
      </Seccion>

      {/* Pie — identidad legal verificable y la negativa de supervisión */}
      <footer className="border-t border-portal-line bg-portal-surface px-5 py-12 sm:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="text-sm text-portal-ink2">
              <p>
                {T.pie.operadoPor} <strong className="font-semibold">{APP.legalName}</strong>
              </p>
              <a
                href={APP.sunatConsultaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs underline underline-offset-2 hover:text-portal-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-primary"
              >
                {T.pie.verificar}
              </a>
            </div>
            <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <Link href="/legal/terminos" className="hover:text-portal-primary">
                {T.pie.links.terminos}
              </Link>
              <Link href="/legal/privacidad" className="hover:text-portal-primary">
                {T.pie.links.privacidad}
              </Link>
              <Link href="/legal/cookies" className="hover:text-portal-primary">
                {T.pie.links.cookies}
              </Link>
              <Link href="/libro-reclamaciones" className="hover:text-portal-primary">
                {T.pie.links.libro}
              </Link>
            </nav>
          </div>
          <p className="mt-8 border-t border-portal-line pt-6 text-xs leading-relaxed text-portal-muted">
            {T.pie.aviso}
          </p>
          <p className="mt-4 text-xs text-portal-muted">
            © {anio} {APP.legalName}. {T.pie.derechos}
          </p>
        </div>
      </footer>
    </main>
  );
}
