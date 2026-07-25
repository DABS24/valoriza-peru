import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Pill / badge del tema de portal. Acepta los mismos `tone` que el catálogo de
 * estados (lib/portales/constants.ts → tono "neutral"|"navy"|"money"|"gold"|"alert")
 * para no tener que traducir en cada consumidor, pero los pinta con tokens
 * `portal-*` (azul/verde/ámbar/rojo armonizados).
 */
type Tone = "neutral" | "navy" | "money" | "gold" | "alert";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-portal-subtle text-portal-ink2",
  navy: "bg-portal-primary-soft text-portal-primary-ink",
  money: "bg-portal-positive-soft text-portal-positive",
  gold: "bg-portal-warning-soft text-portal-warning",
  alert: "bg-portal-danger-soft text-portal-danger",
};

export function PPill({
  children,
  tone = "neutral",
  leadingIcon,
  className,
  title,
}: {
  children: ReactNode;
  tone?: Tone;
  leadingIcon?: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-chip px-3 py-1 text-xs font-semibold",
        toneClasses[tone],
        className,
      )}
    >
      {leadingIcon && <span className="shrink-0">{leadingIcon}</span>}
      {children}
    </span>
  );
}
