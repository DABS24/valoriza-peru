/**
 * Rutas de un portal: dónde empieza cada quien. Módulo aparte —y sin nada de
 * server— para que lo puedan usar TANTO los guards del server COMO el login, que
 * es un componente de navegador.
 *
 * POR QUÉ EXISTE: "a qué pantalla entra cada rol" estaba escrito tres veces
 * (guards, índice del portal y login) y ya había divergido: el login mandaba al
 * admin a `/admin/oportunidades` y el redirect del guard a `/admin`, así que el
 * mismo administrador caía en pantallas distintas según por dónde entrara. Una
 * regla de navegación duplicada no se mantiene sincronizada sola.
 */

import type { PortalSlug } from "@/lib/portales/config";
import type { PortalRol } from "@/lib/portales/roles";

/**
 * Base pública del portal. La vertical está montada en la RAÍZ de su dominio, así
 * que la base es vacía y todo lo de acá sale como `/login`, `/admin`, `/cliente`.
 *
 * Sigue siendo una función (en vez de inlinear "") porque es el ÚNICO lugar que
 * decide dónde está montado el portal: el día que convivan dos verticales en este
 * dominio, se le devuelve su prefijo acá y ninguna pantalla se toca.
 */
export function basePortal(_portal: PortalSlug): string {
  return "";
}

/** URL del login del portal. */
export function loginPortal(portal: PortalSlug): string {
  return `${basePortal(portal)}/login`;
}

/**
 * Home de cada rol dentro del portal. FUENTE ÚNICA: la usan el login, el índice
 * del portal y los redirects de los guards.
 *
 * El admin entra al TABLERO (`/admin`), no al listado de operaciones: es el primer
 * ítem de su menú ("Inicio") y la pantalla que resume el portal completo —cola de
 * trabajo y números del negocio—, la que responde "¿cómo va esto?" al entrar. Un
 * rol desconocido cae en la superficie del inversionista, la de menor alcance.
 */
export function homePortal(portal: PortalSlug, rol: PortalRol): string {
  const base = basePortal(portal);
  if (rol === "admin") return `${base}/admin`;
  if (rol === "asesor") return `${base}/asesor`;
  if (rol === "empresario") return `${base}/empresario`;
  return `${base}/cliente`;
}
