"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";
import { COPY } from "@/lib/copy";

/** Devuelve el texto del tiempo restante hasta `hasta` (ISO), o vencida. */
function restante(hasta: string): { texto: string; vencida: boolean } {
  const T = COPY.portales.reserva;
  const ms = new Date(hasta).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return { texto: T.vencida, vencida: true };
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return { texto: T.vence(h, m), vencida: false };
  return { texto: T.venceMinutos(m), vencida: false };
}

/**
 * Cuenta regresiva del hold de 24h. Se refresca cada 30s en el cliente. La verdad
 * la tiene el server (la op vuelve al pool sola vía portal_liberar_vencidas); esto
 * es solo el display. `prefijo` antepone "Vence en" cuando corresponde.
 */
export function CuentaRegresiva({
  hasta,
  conPrefijo = false,
  className,
}: {
  hasta: string;
  conPrefijo?: boolean;
  className?: string;
}) {
  const [estado, setEstado] = useState(() => restante(hasta));

  useEffect(() => {
    setEstado(restante(hasta));
    const t = setInterval(() => setEstado(restante(hasta)), 30000);
    return () => clearInterval(t);
  }, [hasta]);

  const T = COPY.portales.reserva;
  return (
    <span className={cn("tabular-nums", estado.vencida && "text-portal-danger", className)}>
      {conPrefijo && !estado.vencida ? `${T.vencePrefijo} ` : ""}
      {estado.texto}
    </span>
  );
}
