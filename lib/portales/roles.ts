/**
 * Roles del portal privado.
 *
 * Ojo: NO son los roles del producto Efectivo (lib/auth/roles.ts). Un portal es
 * un mundo aparte: un mismo humano puede ser `admin` de un portal y `cliente` de
 * otro, y su rol de Efectivo (`perfiles.rol`) no le da NINGÚN poder acá. La
 * membresía y el rol viven SOLO en `portal_miembros`, resueltos server-side por
 * los helpers SQL `portal_es_staff()/portal_es_admin()` (0076).
 *
 * Espejo SQL: enum `portal_rol` (0076). Si agregas un rol staff, actualízalo en
 * los DOS lados (acá y el helper `portal_es_staff` de la base).
 */

/**
 * Todos los roles de un portal. El orden no es significativo.
 *
 * `empresario` (0080) es el PRESTATARIO (contratista) con su propia cuenta y un
 * dashboard de solo-ver: NO es staff ni inversionista, es su propio rol de menor
 * alcance. Solo aplica a verticales con prestatarios (config flag `prestatarios`).
 */
export const PORTAL_ROLES = ["cliente", "asesor", "admin", "empresario"] as const;
export type PortalRol = (typeof PORTAL_ROLES)[number];

/**
 * Roles con capacidades de STAFF: gestionan oportunidades, ven a todos los
 * miembros del portal. WHITELIST explícita — mínimo privilegio por defecto.
 * Espejo de `portal_es_staff()` en SQL.
 */
export const PORTAL_ROLES_STAFF = ["asesor", "admin"] as const satisfies readonly PortalRol[];

/** ¿Este rol tiene capacidades de staff en el portal? */
export function esStaffPortal(rol: PortalRol | null | undefined): boolean {
  return rol != null && (PORTAL_ROLES_STAFF as readonly string[]).includes(rol);
}

/** ¿Es admin del portal? */
export function esAdminPortal(rol: PortalRol | null | undefined): boolean {
  return rol === "admin";
}

/** ¿Es el EMPRESARIO (prestatario con cuenta)? Rol de menor alcance, aparte del inversionista. */
export function esEmpresario(rol: PortalRol | null | undefined): boolean {
  return rol === "empresario";
}

/**
 * ¿Es el INVERSIONISTA (cliente)? EXPLÍCITO: `rol === "cliente"`. No se define como
 * "todo lo que no es staff" porque el empresario tampoco es staff y NO debe caer
 * en la superficie del inversionista (reservar, catálogo). Un rol desconocido NO
 * es cliente → mínimo privilegio real (no acceso), no "cliente por defecto".
 */
export function esClientePortal(rol: PortalRol | null | undefined): boolean {
  return rol === "cliente";
}

/** Rango jerárquico (para ordenar / comparar). empresario < cliente < asesor < admin. */
export const RANGO_PORTAL_ROL: Record<PortalRol, number> = {
  empresario: 0,
  cliente: 1,
  asesor: 2,
  admin: 3,
};
