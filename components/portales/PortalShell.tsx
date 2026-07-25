"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Compass,
  Clock,
  Settings,
  Users,
  CalendarCheck,
  LayoutDashboard,
  FileStack,
  HardHat,
  MessageCircle,
  Wallet,
  ClipboardList,
  ScrollText,
  LogOut,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/cn";
import { COPY } from "@/lib/copy";
import { createClient } from "@/lib/supabase/client";
import { PORTALES, waPortal, type PortalSlug } from "@/lib/portales/config";
import type { PortalRol } from "@/lib/portales/roles";
import { PortalWordmark } from "@/components/portales/PortalWordmark";
import { basePortal } from "@/lib/portales/rutas";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Ítems de navegación derivados del rol + config del portal (NUNCA hardcodeados
 * por portal: la sección Contratistas solo aparece si la vertical usa prestatarios).
 * El mismo set alimenta el sidebar (desktop), la bottom-nav (móvil) y el
 * precalentamiento (prefetch) de las otras pestañas: una sección nueva se agrega
 * acá y las tres cosas quedan en sincronía solas.
 */
function navPara(rol: PortalRol, base: string, cfg: (typeof PORTALES)[PortalSlug]): NavItem[] {
  const T = COPY.portales.nav;
  if (rol === "admin") {
    return [
      { href: `${base}/admin`, label: T.inicio, icon: LayoutDashboard },
      { href: `${base}/admin/oportunidades`, label: T.oportunidades, icon: FileStack },
      // La cola de reservas es operación diaria y el admin ES staff (la ruta ya lo
      // deja entrar): faltaba el link, así que solo llegaba escribiendo la URL.
      { href: `${base}/asesor/reservas`, label: T.reservas, icon: CalendarCheck },
      ...(cfg.prestatarios
        ? [
            { href: `${base}/admin/solicitudes`, label: T.solicitudes, icon: ClipboardList },
            {
              href: `${base}/admin/${cfg.prestatarios.ruta}`,
              label: cfg.prestatarios.label,
              icon: HardHat,
            },
          ]
        : []),
      { href: `${base}/admin/usuarios`, label: T.usuarios, icon: Users },
      // Bitácora: solo el admin del portal la lee (RLS portal_es_admin, 0089).
      { href: `${base}/admin/auditoria`, label: T.auditoria, icon: ScrollText },
      { href: `${base}/configuracion`, label: T.configuracion, icon: Settings },
    ];
  }
  if (rol === "asesor") {
    return [
      { href: `${base}/asesor`, label: T.inicio, icon: Home },
      { href: `${base}/asesor/clientes`, label: T.misClientes, icon: Users },
      { href: `${base}/asesor/reservas`, label: T.reservas, icon: CalendarCheck },
      { href: `${base}/cliente/oportunidades`, label: T.oportunidades, icon: Compass },
      { href: `${base}/configuracion`, label: T.configuracion, icon: Settings },
    ];
  }
  if (rol === "empresario") {
    // El empresario NO ve nada del lado inversionista ni admin: su panel, sus
    // solicitudes de financiamiento y su configuración (contraseña + 2FA). Menú de
    // menor alcance. Solicitudes solo aplica a verticales con prestatarios.
    return [
      { href: `${base}/empresario`, label: T.inicio, icon: Home },
      ...(cfg.prestatarios
        ? [{ href: `${base}/empresario/solicitudes`, label: T.solicitudes, icon: ClipboardList }]
        : []),
      { href: `${base}/configuracion`, label: T.configuracion, icon: Settings },
    ];
  }
  return [
    { href: `${base}/cliente`, label: T.inicio, icon: Home },
    { href: `${base}/cliente/oportunidades`, label: T.oportunidades, icon: Compass },
    { href: `${base}/cliente/cartera`, label: T.cartera, icon: Wallet },
    { href: `${base}/cliente/historial`, label: T.historial, icon: Clock },
    { href: `${base}/configuracion`, label: T.configuracion, icon: Settings },
  ];
}

/**
 * Cascarón de un portal: sidebar izquierdo en desktop, bottom-nav en móvil (sin
 * scroll horizontal). Marca propia del portal (wordmark de texto, sin mascota ni
 * "Don Gato" — la SAC madre figura solo en el pie legal). Tema InversionNPL vía
 * tokens `portal-*` (heredados del wrapper PortalTema). No decide permisos — eso
 * ya lo hicieron los guards del layout server-side.
 */
export function PortalShell({
  portal,
  rol,
  nombre,
  children,
}: {
  portal: PortalSlug;
  rol: PortalRol;
  nombre: string;
  children: ReactNode;
}) {
  const T = COPY.portales;
  const cfg = PORTALES[portal];
  const base = basePortal(portal);
  const pathname = usePathname();
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  const items = navPara(rol, base, cfg);
  const rolLabel =
    rol === "admin"
      ? T.roles.admin
      : rol === "asesor"
        ? T.roles.asesor
        : rol === "empresario"
          ? T.roles.empresario
          : T.roles.cliente;

  // Activo = el item cuyo href es el prefijo MÁS LARGO del pathname. Así "Inicio"
  // no queda encendido cuando estás en una subruta suya.
  const hrefActivo = items
    .filter((it) => pathname === it.href || pathname.startsWith(`${it.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const activo = (href: string) => href === hrefActivo;

  // ── Precalentamiento en segundo plano ──
  // Mientras el usuario lee la pantalla en la que está, en el tiempo OCIOSO del
  // navegador se prefetchean las OTRAS pestañas de su rol: al hacer click, el
  // esqueleto (loading.tsx) y la data ya están calientes y la vista aparece sin
  // espera. Las rutas salen del MISMO navPara() que arma el menú, así que una
  // pestaña nueva se precalienta sola (nunca una lista aparte que se desincronice).
  const hrefs = items.map((it) => it.href);
  // Clave estable del set de pestañas: el array cambia de identidad en cada
  // render, la cadena no. Así el efecto corre una vez por rol/portal, no por render.
  const hrefsKey = hrefs.join("|");
  // El pathname se lee por ref: sirve para NO prefetchear la pestaña donde ya
  // estás, pero no debe re-disparar el precalentamiento en cada navegación.
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    const pendientes = hrefsKey.split("|").filter((h) => h && h !== pathnameRef.current);
    // Escalonado: primero las más usadas y el resto un poco después, para no
    // disparar hasta 8 navegaciones contra el server de golpe (el menú del admin
    // en la vertical con empresas llega a 8, casi todas con query pesada).
    const prioritarias = pendientes.slice(0, 3);
    const resto = pendientes.slice(3);

    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const ric = win.requestIdleCallback;
    const prefetch = (lista: string[]) => lista.forEach((href) => router.prefetch(href));

    const ids: number[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];

    // 1) Prioritarias: primer tiempo ocioso (con fallback si no hay ric — Safari).
    if (typeof ric === "function") ids.push(ric(() => prefetch(prioritarias), { timeout: 2000 }));
    else timers.push(setTimeout(() => prefetch(prioritarias), 500));

    // 2) El resto: más tarde, para no competir con las prioritarias ni con la
    //    navegación real del usuario.
    if (resto.length) {
      timers.push(
        setTimeout(() => {
          if (typeof ric === "function") ids.push(ric(() => prefetch(resto), { timeout: 6000 }));
          else prefetch(resto);
        }, 2500),
      );
    }

    // Al desmontar (o al cambiar el set de pestañas) se cancelan callbacks y timers.
    return () => {
      ids.forEach((id) => win.cancelIdleCallback?.(id));
      timers.forEach((t) => clearTimeout(t));
    };
  }, [hrefsKey, router]);

  async function salir() {
    if (saliendo) return;
    setSaliendo(true);
    // El cierre REAL lo hace el server (borra la cookie en la respuesta HTTP).
    // Si solo se hiciera `signOut()` acá, `location.assign` podía salir con la
    // cookie todavía puesta y el guard devolvía al panel: el usuario creía haber
    // cerrado sesión sin cerrarla. Se espera la respuesta ANTES de navegar.
    try {
      await fetch(`/api/salir`, { method: "POST" });
    } catch {
      /* red caída: igual limpiamos local abajo y sacamos al usuario */
    }
    try {
      await createClient().auth.signOut();
    } catch {
      /* el estado local ya quedó sin cookie de sesión por la respuesta del server */
    }
    window.location.assign(`${base}/login`);
  }

  const marca = (
    <Link href={base} className="flex min-w-0 items-center">
      <PortalWordmark nombre={cfg.nombreCorto} size="sm" />
    </Link>
  );

  return (
    <div className="min-h-dvh bg-portal-bg lg:flex">
      {/* ── Sidebar (desktop) ── */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-portal-line bg-portal-surface lg:flex">
        <div className="border-b border-portal-line p-4">{marca}</div>

        {/* Ficha de usuario */}
        <div className="border-b border-portal-line px-4 py-3">
          <p className="truncate text-sm font-semibold text-portal-ink">{nombre}</p>
          <span className="mt-1 inline-block rounded-chip bg-portal-primary-soft px-2 py-0.5 text-2xs font-bold uppercase tracking-wide text-portal-primary-ink">
            {rolLabel}
          </span>
        </div>

        {/* Navegación */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={activo(it.href) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-portal-sm px-3 py-2.5 text-sm font-semibold transition",
                  activo(it.href)
                    ? "bg-portal-primary text-white shadow-portal"
                    : "text-portal-ink2 hover:bg-portal-primary-soft hover:text-portal-primary-ink",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{it.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Pie: WhatsApp + logout + marca legal */}
        <div className="space-y-1 border-t border-portal-line p-3">
          <a
            href={waPortal(portal)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-portal-sm px-3 py-2.5 text-sm font-semibold text-portal-ink2 transition hover:bg-portal-positive-soft hover:text-portal-positive"
          >
            <MessageCircle className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{T.nav.canal}</span>
          </a>
          <button
            type="button"
            onClick={salir}
            disabled={saliendo}
            className="flex w-full items-center gap-3 rounded-portal-sm px-3 py-2.5 text-sm font-semibold text-portal-ink2 transition hover:bg-portal-danger-soft hover:text-portal-danger disabled:opacity-50"
          >
            <LogOut className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{T.nav.salir}</span>
          </button>
          {/* Pie legal + términos del portal. El link vive acá (y no en el nav) a
              propósito: es letra chica, no una sección de trabajo, pero tiene que
              estar SIEMPRE alcanzable desde cualquier pantalla del portal. */}
          <p className="px-3 pt-2 text-2xs leading-tight text-portal-muted">
            {T.pieLegal}
            {" · "}
            <Link href={`${base}/terminos`} className="underline hover:text-portal-ink2">
              {T.nav.terminos}
            </Link>
          </p>
        </div>
      </aside>

      {/* ── Columna de contenido ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header móvil */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-portal-line bg-portal-surface/95 px-4 py-3 backdrop-blur lg:hidden">
          {marca}
          <div className="flex items-center gap-1">
            <a
              href={waPortal(portal)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={T.nav.canal}
              className="inline-flex items-center justify-center rounded-chip border border-portal-line2 p-2 text-portal-positive"
            >
              <MessageCircle className="size-5" aria-hidden />
            </a>
            <button
              type="button"
              onClick={salir}
              disabled={saliendo}
              aria-label={T.nav.salir}
              className="inline-flex items-center justify-center rounded-chip border border-portal-line2 p-2 text-portal-ink2 transition hover:border-portal-danger hover:text-portal-danger disabled:opacity-50"
            >
              <LogOut className="size-5" aria-hidden />
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
          {/* Pie legal (visible en móvil, donde el sidebar no está) */}
          <p className="mx-auto mt-10 w-full max-w-6xl text-center text-2xs text-portal-muted lg:hidden">
            {T.pieLegal}
            {" · "}
            <Link href={`${base}/terminos`} className="underline hover:text-portal-ink2">
              {T.nav.terminos}
            </Link>
          </p>
        </main>
      </div>

      {/* ── Bottom-nav (móvil) ──
          Cada ítem tiene un ancho MÍNIMO legible y la barra scrollea dentro de sí
          misma cuando no entran todos (el menú del admin llega a 8 en la vertical con
          empresas). Antes se repartía el ancho a partes iguales y en 375px las
          etiquetas quedaban cortadas a dos letras. El scroll es de la barra, nunca de
          la página. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch overflow-x-auto border-t border-portal-line bg-portal-surface/95 backdrop-blur lg:hidden">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={activo(it.href) ? "page" : undefined}
              className={cn(
                "flex min-w-[4.25rem] flex-1 flex-col items-center gap-1 px-1 py-2 text-3xs font-semibold transition",
                activo(it.href) ? "text-portal-primary" : "text-portal-muted",
              )}
            >
              <Icon
                className={cn("size-5 shrink-0", activo(it.href) && "text-portal-primary")}
                aria-hidden
              />
              <span className="w-full truncate text-center leading-tight">{it.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
