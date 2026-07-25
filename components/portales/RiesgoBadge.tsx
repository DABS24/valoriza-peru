import { cn } from "@/lib/cn";
import { nivelRiesgo } from "@/lib/portales/constants";
import type { PortalNivelRiesgo } from "@/lib/portales/config";

/**
 * Badge del nivel de riesgo. El color sale SIEMPRE de NIVELES_RIESGO
 * (lib/portales/constants) — única fuente de la escala verde→rojo. No recibe
 * clase de color por prop: así ninguna pantalla puede pintar un riesgo alto de
 * verde por accidente.
 */
export function RiesgoBadge({
  nivel,
  size = "md",
  className,
}: {
  nivel: PortalNivelRiesgo | null | undefined;
  size?: "sm" | "md";
  className?: string;
}) {
  const def = nivelRiesgo(nivel);
  if (!def) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-chip font-semibold",
        size === "sm" ? "px-2.5 py-0.5 text-2xs" : "px-3 py-1 text-xs",
        def.badge,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", def.punto)} aria-hidden />
      {def.label}
    </span>
  );
}
