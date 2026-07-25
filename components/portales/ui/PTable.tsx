import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Chrome de tabla del TEMA de portal. Igual criterio que components/ui/Table
 * (el `overflow-x-auto` viene incluido para no provocar scroll horizontal en
 * móvil), pero con tokens `portal-*` en la cabecera para que la tabla respire el
 * tema en vez del gris cálido de Efectivo. Las celdas siguen siendo tuyas.
 */
export function PTable({
  children,
  className,
  wrapperClassName,
}: {
  children: ReactNode;
  className?: string;
  wrapperClassName?: string;
}) {
  return (
    <div className={cn("overflow-x-auto", wrapperClassName)}>
      <table className={cn("w-full text-left text-sm", className)}>{children}</table>
    </div>
  );
}

/** Cabecera de tabla del portal (incluye el `<tr>`: se le pasan los `<th>`). */
export function PTHead({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <thead
      className={cn(
        "border-b border-portal-line bg-portal-subtle text-xs uppercase tracking-wider text-portal-muted",
        className,
      )}
    >
      <tr>{children}</tr>
    </thead>
  );
}
