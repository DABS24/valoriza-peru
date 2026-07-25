import type { ComponentType, ReactNode } from "react";
import { Lightbulb } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * Nota / tip NEUTRO del portal (sin mascota,
 * ícono simple). Un solo lugar para el estilo del aviso informativo del portal.
 */
export function PNota({
  children,
  icon: Icon = Lightbulb,
  className,
}: {
  children: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-portal border border-portal-line bg-portal-surface p-4 shadow-portal",
        className,
      )}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-chip bg-portal-primary-soft text-portal-primary-ink">
        <Icon className="size-4" />
      </span>
      <p className="text-sm text-portal-ink2">{children}</p>
    </div>
  );
}
