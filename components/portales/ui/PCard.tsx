import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Tarjeta del TEMA de portal (InversionNPL): superficie blanca, radio 20px,
 * sombra suave. Default terminado (§8): en su forma más corta ya se ve completa.
 * Solo tokens `portal-*`.
 */
export function PCard({
  children,
  className,
  hover = false,
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  /** Realce al pasar el cursor (para tarjetas clicables). */
  hover?: boolean;
  as?: "div" | "article" | "section";
}) {
  return (
    <As
      className={cn(
        "rounded-portal border border-portal-line bg-portal-surface p-6 shadow-portal",
        hover && "transition hover:-translate-y-0.5 hover:shadow-portal-hover",
        className,
      )}
    >
      {children}
    </As>
  );
}
