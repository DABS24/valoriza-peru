import Link from "next/link";

import { Reveal } from "@/components/portales/Reveal";
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
 *
 * Sobre lo visual: cero fotos de stock, por decisión de marca — ver
 * `docs-internal/BRANDING.md` §6. La textura sale de degradados del acento y de
 * una retícula SVG inline: pesa nada, se adapta al tema y se ve propia.
 */

const T = COPY.landing;

/** Retícula de fondo: SVG inline, hereda el color por `currentColor`. */
function Reticula({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={`pointer-events-none absolute inset-0 size-full ${className}`}>
      <defs>
        <pattern id="vp-grid" width="56" height="56" patternUnits="userSpaceOnUse">
          <path d="M56 0H0V56" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#vp-grid)" />
    </svg>
  );
}

function Seccion({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`relative w-full px-5 py-20 sm:px-8 sm:py-28 ${className}`}>
      <div className="mx-auto w-full max-w-5xl">{children}</div>
    </section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 flex items-center gap-2 text-2xs font-bold uppercase tracking-[0.16em] text-portal-primary">
      <span aria-hidden="true" className="inline-block h-px w-6 bg-portal-primary" />
      {children}
    </p>
  );
}

export default function Landing() {
  const login = loginPortal(PORTAL_SLUG);
  const wa = waPortal(PORTAL_SLUG, T.contacto.texto);
  const anio = new Date().getFullYear();

  return (
    <main className="min-h-dvh bg-portal-bg text-portal-ink">
      {/* ── Nav: marca + una sola acción ─────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-portal-line/70 bg-portal-bg/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <span className="flex items-center gap-2.5 font-portal text-base font-extrabold tracking-tight">
            <span
              aria-hidden="true"
              className="grid size-7 place-items-center rounded-portal-sm bg-portal-primary text-portal-primary-ink"
            >
              <span className="text-xs font-black">V</span>
            </span>
            {PORTAL.nombre}
          </span>
          <Link
            href={login}
            className="rounded-portal-sm px-4 py-2 text-sm font-bold text-portal-ink transition-colors hover:bg-portal-primary-soft hover:text-portal-primary-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-primary"
          >
            {T.nav.acceder}
          </Link>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <Reticula className="text-portal-line/60 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-portal-primary/10 blur-3xl"
        />
        {/* El hero entra con animación CSS pura (`animate-fade-up`), no con
            `Reveal`: es lo primero que se ve, y no puede quedar esperando a que
            hidrate el JS. `motion-safe:` lo apaga si el usuario pidió menos
            movimiento; sin JS, la animación corre igual. */}
        <Seccion className="pt-16 sm:pt-24">
          <div className="motion-safe:animate-fade-up">
            <Eyebrow>{T.hero.eyebrow}</Eyebrow>
          </div>
          {/* Escala del sistema (`3xl`/`hero` ya son fluidas con clamp), no
              tamaños sueltos: un cambio de escala se hace en un solo lugar. */}
          <h1 className="max-w-3xl text-balance font-portal text-3xl font-extrabold tracking-tight motion-safe:animate-fade-up motion-safe:[animation-delay:90ms] sm:text-hero">
            {T.hero.titulo}
          </h1>
          <p className="mt-7 max-w-2xl text-pretty text-base leading-relaxed text-portal-ink2 motion-safe:animate-fade-up motion-safe:[animation-delay:180ms] sm:text-lg">
            {T.hero.sub}
          </p>
          <div className="mt-10 flex flex-col items-start gap-4 motion-safe:animate-fade-up motion-safe:[animation-delay:270ms] sm:flex-row sm:items-center">
            <Link
              href={login}
              className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-portal-sm bg-portal-primary px-7 py-3.5 text-sm font-bold text-portal-primary-ink shadow-portal transition-all hover:bg-portal-primary-hover hover:shadow-portal-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-primary motion-safe:hover:-translate-y-0.5"
            >
              {T.hero.cta}
              <span
                aria-hidden="true"
                className="transition-transform motion-safe:group-hover:translate-x-0.5"
              >
                →
              </span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-portal-muted">{T.hero.nota}</p>
          </div>
        </Seccion>
      </div>

      {/* ── Cómo funciona ────────────────────────────────────────────────── */}
      <Seccion className="border-t border-portal-line bg-portal-surface">
        <Reveal>
          <Eyebrow>{T.modelo.titulo}</Eyebrow>
          <h2 className="max-w-2xl text-balance font-portal text-2xl font-extrabold tracking-tight sm:text-3xl">
            {T.modelo.sub}
          </h2>
        </Reveal>
        {/* `as="li"`: el envoltorio de la animación ES el ítem de la lista. Un
            <div> acá rompería el <ol> y la lista dejaría de anunciarse. */}
        <ol className="mt-12 grid gap-5 sm:grid-cols-3">
          {T.modelo.pasos.map((paso, i) => (
            <Reveal
              as="li"
              key={paso.n}
              delay={i * 90}
              className="group rounded-portal border border-portal-line bg-portal-bg p-7 hover:border-portal-primary/40"
            >
              <span
                aria-hidden="true"
                className="font-mono text-3xl font-black leading-none text-portal-primary/25 transition-colors group-hover:text-portal-primary/50"
              >
                {paso.n}
              </span>
              <h3 className="mt-5 font-portal text-base font-bold leading-snug">{paso.titulo}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-portal-ink2">{paso.texto}</p>
            </Reveal>
          ))}
        </ol>
      </Seccion>

      {/* ── Qué somos y qué no ───────────────────────────────────────────── */}
      <Seccion className="border-t border-portal-line">
        <Reveal>
          <Eyebrow>{T.encuadre.titulo}</Eyebrow>
          <h2 className="max-w-2xl text-balance font-portal text-2xl font-extrabold tracking-tight sm:text-3xl">
            {T.encuadre.sub}
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <Reveal className="h-full">
            <div className="h-full rounded-portal border border-portal-primary/25 bg-portal-primary-soft/25 p-7">
              <h3 className="text-2xs font-bold uppercase tracking-[0.14em] text-portal-primary">
                {T.encuadre.si.titulo}
              </h3>
              <ul className="mt-5 space-y-3.5">
                {T.encuadre.si.items.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-portal-ink2">
                    <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-portal-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={90} className="h-full">
            <div className="h-full rounded-portal border border-portal-line bg-portal-surface p-7">
              <h3 className="text-2xs font-bold uppercase tracking-[0.14em] text-portal-muted">
                {T.encuadre.no.titulo}
              </h3>
              <ul className="mt-5 space-y-3.5">
                {T.encuadre.no.items.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-portal-ink2">
                    <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-portal-line2" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </Seccion>

      {/* ── Riesgo · YMYL: se dice antes de que lo pregunten ─────────────── */}
      <Seccion className="border-t border-portal-line bg-portal-surface py-16 sm:py-20">
        <Reveal>
          <div className="rounded-portal border-l-[3px] border-portal-warning bg-portal-warning-soft/30 p-7">
            <h2 className="font-portal text-base font-bold">{T.riesgo.titulo}</h2>
            <p className="mt-2.5 max-w-3xl text-pretty text-sm leading-relaxed text-portal-ink2">
              {T.riesgo.texto}
            </p>
          </div>
        </Reveal>
      </Seccion>

      {/* ── Cierre ───────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-t border-portal-line">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-portal-primary/10 blur-3xl"
        />
        <Seccion>
          <Reveal>
            <div className="flex flex-col items-start gap-7 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="max-w-lg text-balance font-portal text-xl font-extrabold tracking-tight sm:text-2xl">
                  {T.contacto.titulo}
                </h2>
                <p className="mt-2.5 max-w-md text-pretty leading-relaxed text-portal-ink2">
                  {T.contacto.texto}
                </p>
              </div>
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-portal-sm border border-portal-line bg-portal-bg px-7 py-3.5 text-sm font-bold transition-all hover:border-portal-primary hover:text-portal-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-primary motion-safe:hover:-translate-y-0.5"
              >
                {T.contacto.cta}
              </a>
            </div>
          </Reveal>
        </Seccion>
      </div>

      {/* ── Pie: identidad legal verificable + negativa de supervisión ───── */}
      <footer className="border-t border-portal-line bg-portal-surface px-5 py-14 sm:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="text-sm text-portal-ink2">
              <p>
                {T.pie.operadoPor} <strong className="font-bold text-portal-ink">{APP.legalName}</strong>
              </p>
              <a
                href={APP.sunatConsultaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-2xs text-portal-muted underline underline-offset-4 transition-colors hover:text-portal-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-primary"
              >
                {T.pie.verificar}
              </a>
            </div>
            <nav aria-label="Legal" className="flex flex-wrap gap-x-6 gap-y-2.5 text-sm">
              <Link href="/legal/terminos" className="transition-colors hover:text-portal-primary">
                {T.pie.links.terminos}
              </Link>
              <Link href="/legal/privacidad" className="transition-colors hover:text-portal-primary">
                {T.pie.links.privacidad}
              </Link>
              <Link href="/legal/cookies" className="transition-colors hover:text-portal-primary">
                {T.pie.links.cookies}
              </Link>
              <Link href="/libro-reclamaciones" className="transition-colors hover:text-portal-primary">
                {T.pie.links.libro}
              </Link>
            </nav>
          </div>
          <p className="mt-10 max-w-4xl border-t border-portal-line pt-7 text-2xs leading-relaxed text-portal-muted">
            {T.pie.aviso}
          </p>
          <p className="mt-4 text-2xs text-portal-muted">
            © {anio} {APP.legalName}. {T.pie.derechos}
          </p>
        </div>
      </footer>
    </main>
  );
}
