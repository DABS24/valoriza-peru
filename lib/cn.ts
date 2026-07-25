import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Mergea classnames con resolución correcta de conflictos Tailwind.
 * Uso: cn("px-2 py-1", isActive && "bg-money", className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
