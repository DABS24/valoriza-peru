"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { AlarmClock } from "lucide-react";

import { cn } from "@/lib/cn";
import { COPY } from "@/lib/copy";

/**
 * Chrome COMPARTIDO de los paneles de pendientes (AlertasAsesor · AlertasAdmin).
 *
 * Los dos paneles son espejos deliberados: misma forma, distinto alcance (el
 * asesor ve su cartera, el admin todo el portal). Lo que NO debe ser espejo es el
 * código —cuando lo fue, el admin ganó el tope de filas y el asesor se quedó sin
 * él—, así que el encabezado y el reloj viven acá una sola vez.
 */

/**
 * Cuántas filas se listan en un panel de pendientes antes de cortar. Un panel es
 * una cola de trabajo, no la sección completa: sin tope, un asesor con 80 reservas
 * por vencer pinta 80 filas y el tablero deja de ser un resumen.
 */
export const MAX_FILAS = 5;

/**
 * Pie que declara cuántas filas quedaron fuera. Va SIEMPRE que se corte con
 * MAX_FILAS: truncar en silencio hace creer que eso es todo lo que hay, y en una
 * cola de trabajo esa creencia se paga con reservas vencidas.
 */
export function FilasRestantes({ total }: { total: number }) {
  const ocultas = total - MAX_FILAS;
  if (ocultas <= 0) return null;
  return (
    <p className="border-t border-portal-line px-5 py-3 text-xs text-portal-muted">
      {COPY.portales.comun.masFilas(ocultas)}
    </p>
  );
}

/** Encabezado de una tarjeta de pendientes (chip de ícono + título + bajada). */
export function CabeceraPendiente({
  icon: Icon,
  tono,
  titulo,
  sub,
  extra,
}: {
  icon: typeof AlarmClock;
  /** Clases del chip del ícono (par fondo+texto de un token `portal-*`). */
  tono: string;
  titulo: string;
  sub: string;
  /** Contenido a la derecha (contador, pill de alerta). Sin él el bloque se
   *  alinea igual a la izquierda: `justify-between` con un solo hijo no mueve nada. */
  extra?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-portal-line p-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-chip", tono)}>
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="font-portal text-base font-bold text-portal-ink">{titulo}</h3>
          <p className="mt-0.5 text-xs text-portal-muted">{sub}</p>
        </div>
      </div>
      {extra}
    </div>
  );
}

/**
 * "Ahora" en milisegundos, refrescado cada minuto. Los paneles pintan urgencia
 * (<6 h) y cuenta regresiva: sin este latido, el panel envejece en pantalla y
 * dice "faltan 3 h" cuando ya venció. Arranca desde `Date.now()` y se re-siembra
 * en el efecto para no arrastrar la hora del render del server (hidratación).
 */
export function useAhoraPorMinuto(): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    setAhora(Date.now());
    const t = setInterval(() => setAhora(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  return ahora;
}
