import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * KPI / stat del tema de portal. Espeja la API de components/ui/Stat pero con
 * tokens `portal-*`. Único lugar del formato de KPIs del portal (truncate + tamaño
 * acotado para que no se desborden).
 */
const TONE = {
  ink: "text-portal-ink",
  primary: "text-portal-primary",
  positive: "text-portal-positive",
  danger: "text-portal-danger",
} as const;

export function PStat({
  label,
  value,
  sub,
  tone = "ink",
  title,
  wrap = false,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: keyof typeof TONE;
  title?: string;
  /**
   * Deja que el valor use dos líneas en vez de truncar con "…". Para stats que NO
   * son KPIs de dinero (ej. el plazo "2–4 meses"): esas no deben desbordar, pero
   * tampoco cortarse. El truncate agresivo es solo para montos compactos.
   */
  wrap?: boolean;
}) {
  return (
    <div className="rounded-portal-sm border border-portal-line bg-portal-surface p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-portal-muted">{label}</p>
      <p
        className={cn(
          "mt-1 font-portal text-lg font-bold tabular-nums sm:text-xl",
          wrap ? "leading-tight" : "truncate",
          TONE[tone],
        )}
        title={title ?? (typeof value === "string" ? value : undefined)}
      >
        {value}
      </p>
      {sub != null && <p className="mt-1 text-[11px] text-portal-muted">{sub}</p>}
    </div>
  );
}
