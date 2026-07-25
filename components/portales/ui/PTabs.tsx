import Link from "next/link";

import { cn } from "@/lib/cn";

/**
 * Fila de pestañas tipo chip del TEMA de portal. Espeja la API de
 * components/ui/Tabs pero con tokens `portal-*` (chip activo = azul/teal del
 * portal, no navy de Efectivo). Vive en el namespace de portal para no acoplar el
 * primitivo compartido de Efectivo ni cambiar su look.
 *
 * Igual que Tabs, sirve para los dos modos de navegación:
 *  - `href`    → pestaña que cambia la URL (deja la página como Server Component).
 *  - `onChange`→ pestaña de estado local.
 */

export type PTab<T extends string = string> = {
  id: T;
  label: string;
  /** Contador opcional a la derecha (pendientes, cantidad de filas). */
  contador?: number;
  /** `alerta` pinta el contador en ámbar cuando la pestaña NO está activa: sirve
   *  para "hay trabajo esperando acá". Activa ya se ve, así que ahí no aporta. */
  contadorTono?: "normal" | "alerta";
  /** Si se define, la pestaña navega en vez de manejar estado local. */
  href?: string;
};

interface PTabsProps<T extends string> {
  tabs: readonly PTab<T>[];
  activa: T;
  onChange?: (id: T) => void;
  /** Etiqueta accesible del grupo (obligatoria: un tablist sin nombre no se
   *  entiende con lector de pantalla). */
  label: string;
  className?: string;
}

const CHIP_BASE =
  "rounded-chip px-3 py-1.5 font-portal text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal-primary/40";
const CHIP_ON = "border border-portal-primary bg-portal-primary text-white";
const CHIP_OFF =
  "border border-portal-line2 bg-portal-surface text-portal-ink2 hover:border-portal-primary hover:text-portal-primary";

export function PTabs<T extends string>({ tabs, activa, onChange, label, className }: PTabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className={cn("flex flex-wrap items-center gap-2", className)}>
      {tabs.map((t) => {
        const on = t.id === activa;
        const contenido = (
          <>
            {t.label}
            {t.contador != null && (
              <span
                className={cn(
                  "ml-1.5 rounded-full px-1.5 font-mono text-xs tabular-nums",
                  on
                    ? "bg-white/20 text-white"
                    : t.contadorTono === "alerta" && t.contador > 0
                      ? "bg-portal-warning-soft text-portal-warning"
                      : "bg-portal-subtle text-portal-muted",
                )}
              >
                {t.contador}
              </span>
            )}
          </>
        );
        const clase = cn(CHIP_BASE, "inline-flex items-center gap-1.5", on ? CHIP_ON : CHIP_OFF);

        return t.href ? (
          <Link key={t.id} href={t.href} role="tab" aria-selected={on} className={clase}>
            {contenido}
          </Link>
        ) : (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={on}
            className={clase}
            onClick={() => onChange?.(t.id)}
          >
            {contenido}
          </button>
        );
      })}
    </div>
  );
}
