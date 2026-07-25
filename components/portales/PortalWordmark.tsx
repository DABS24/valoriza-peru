import { cn } from "@/lib/cn";

/**
 * Wordmark de un portal: monograma cuadrado (inicial del nombre sobre el azul del
 * portal) + el nombre en texto. Sin mascota: el tono del portal es sobrio.
 * El nombre es dato de catálogo (config.ts → nombreCorto): fuente única.
 */
export function PortalWordmark({
  nombre,
  size = "md",
  className,
}: {
  nombre: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const inicial = nombre.trim().charAt(0).toUpperCase();
  const cuadrado =
    size === "lg"
      ? "size-11 text-xl rounded-portal-sm"
      : size === "md"
        ? "size-9 text-base rounded-portal-sm"
        : "size-8 text-sm rounded-[10px]";
  const texto = size === "lg" ? "text-xl" : size === "md" ? "text-lg" : "text-sm";

  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span
        aria-hidden
        className={cn(
          "grid shrink-0 place-items-center bg-portal-primary font-portal font-extrabold text-white shadow-portal",
          cuadrado,
        )}
      >
        {inicial}
      </span>
      <span
        className={cn("truncate font-portal font-extrabold tracking-tight text-portal-ink", texto)}
      >
        {nombre}
      </span>
    </span>
  );
}
