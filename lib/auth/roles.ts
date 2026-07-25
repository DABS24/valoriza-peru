/**
 * Fuente ÚNICA de verdad de los roles del sistema.
 *
 * Toda decisión de "quién es staff / quién es cliente" sale de aquí — nunca se
 * enumeran roles sueltos por el código. Agregar un rol nuevo (ej: "supervisor")
 * se hace en UN solo lugar: se añade al arreglo ROLES y, si tiene poderes de
 * staff, a ROLES_STAFF. El resto (guards, resolución de perfiles, redirects)
 * sigue funcionando sin tocarse.
 *
 * CONTRAPARTE SQL: la whitelist ROLES_STAFF tiene su espejo en la función
 * public.es_staff() (supabase/migrations/0001_initial_schema.sql), que es la que
 * habilita las policies RLS para staff. Si agregás un rol staff, actualizá los
 * DOS lugares: ROLES_STAFF acá y public.es_staff() en la base. Son los únicos.
 */

/** Todos los roles del sistema. El orden no es significativo. */
export const ROLES = ["cliente", "asesor", "admin"] as const;
export type Rol = (typeof ROLES)[number];

/**
 * Roles con capacidades de STAFF: ven la data de todos los clientes, operan la
 * cola, resuelven KYC, etc. WHITELIST explícita — un rol nuevo NO gana poderes
 * de staff hasta que se agregue aquí (fallar-seguro: mínimo privilegio por
 * defecto). Espejo del lado de la base: public.es_staff().
 */
export const ROLES_STAFF = ["asesor", "admin"] as const satisfies readonly Rol[];

/** ¿Este rol tiene capacidades de staff? Rol-agnóstico: la lista manda. */
export function esStaff(rol: Rol | null | undefined): boolean {
  return rol != null && (ROLES_STAFF as readonly string[]).includes(rol);
}

/**
 * ¿Este rol es un cliente final (no staff)? Definido como "todo lo que no es
 * staff" a propósito: si mañana existe un rol nuevo sin listar, se trata como
 * cliente (mínimo privilegio) en vez de filtrarse como staff por accidente.
 */
export function esCliente(rol: Rol | null | undefined): boolean {
  return rol != null && !esStaff(rol);
}

/**
 * FACETAS (modelo jerárquico). Un rol "contiene" al inmediato inferior: el asesor
 * tiene también su faceta de cliente; el admin, las tres. Es la base del selector
 * "operar como" y del filtro por faceta del panel de usuarios (buscar "clientes"
 * incluye al staff, porque el staff también opera como cliente).
 *
 * SSOT del rango — antes vivía como `NIVEL_ROL` local en AppShell; ahora lo dueño
 * es este módulo para que UI y filtros no diverjan.
 */
export const RANGO_ROL: Record<Rol, number> = { cliente: 0, asesor: 1, admin: 2 };

/** Facetas que este rol posee (la suya y todas las inferiores), en orden ascendente. */
export function facetasDeRol(rol: Rol): Rol[] {
  return ROLES.filter((r) => RANGO_ROL[r] <= RANGO_ROL[rol]);
}

/** ¿El rol posee la faceta pedida? (admin tiene faceta cliente/asesor/admin). */
export function tieneFaceta(rol: Rol, faceta: Rol): boolean {
  return RANGO_ROL[faceta] <= RANGO_ROL[rol];
}
