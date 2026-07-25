/**
 * Guards server-side de los PORTALES. Se usan en los layouts/pages de
 * las pantallas privadas del portal. Exigen sesión + membresía
 * ACTIVA del portal (y, según el guard, rol staff/admin). Ocultar links no es
 * seguridad; esto sí.
 *
 * La membresía se lee UNA vez por request (React.cache) desde `portal_miembros`
 * con la sesión del usuario (RLS `portal_miembros_lee_suyo` deja leer la fila
 * propia). El rol NUNCA sale de user_metadata: sale de la base.
 */

import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient, getUser } from "@/lib/supabase/server";
import { type PortalSlug } from "@/lib/portales/config";
import { basePortal, homePortal, loginPortal } from "@/lib/portales/rutas";
import { esStaffPortal, esAdminPortal, esEmpresario, type PortalRol } from "@/lib/portales/roles";

export interface PortalMiembro {
  portal: PortalSlug;
  userId: string;
  rol: PortalRol;
  nombre: string;
  asesorId: string | null;
  estado: "activo" | "inactivo";
}

/**
 * Membresía ACTIVA del usuario en el portal, o null. Cacheada por request:
 * el layout base y un sub-layout la piden en el mismo render → sin cache serían
 * dos viajes de red por navegación. Una fila inactiva se trata como null (no
 * tiene acceso), igual que el helper SQL `portal_mi_rol` (filtra estado='activo').
 */
const leerMiembro = cache(async (portal: PortalSlug): Promise<PortalMiembro | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("portal_miembros")
    .select("portal, user_id, rol, nombre, asesor_id, estado")
    .eq("portal", portal)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data || data.estado !== "activo") return null;
  return {
    portal: data.portal as PortalSlug,
    userId: data.user_id as string,
    rol: data.rol as PortalRol,
    nombre: data.nombre as string,
    asesorId: (data.asesor_id as string | null) ?? null,
    estado: "activo",
  };
});

/** Lectura pública (cacheada) de la membresía activa; null si no la hay. */
export function getPortalMiembro(portal: PortalSlug): Promise<PortalMiembro | null> {
  return leerMiembro(portal);
}

/**
 * Exige sesión + membresía activa del portal. Si falla, manda al login del
 * portal (no al login de Efectivo: son mundos separados). Devuelve la membresía.
 */
export async function requirePortalSession(portal: PortalSlug): Promise<PortalMiembro> {
  const miembro = await getPortalMiembro(portal);
  if (!miembro) redirect(loginPortal(portal));
  return miembro;
}

/** Exige que el miembro sea STAFF (asesor/admin) del portal. */
export async function requirePortalStaff(portal: PortalSlug): Promise<PortalMiembro> {
  const miembro = await requirePortalSession(portal);
  if (!esStaffPortal(miembro.rol)) redirect(basePortal(portal));
  return miembro;
}

/** Exige que el miembro sea ADMIN del portal. */
export async function requirePortalAdmin(portal: PortalSlug): Promise<PortalMiembro> {
  const miembro = await requirePortalSession(portal);
  if (!esAdminPortal(miembro.rol)) redirect(basePortal(portal));
  return miembro;
}

/**
 * Exige sesión + rol que ve la superficie del INVERSIONISTA (catálogo, reservas):
 * cliente o staff (rango superior). El EMPRESARIO NO ve el lado inversionista: se
 * le manda a su propio panel. Así ninguna pantalla de cliente (que reusa esta
 * guard) queda accesible para el empresario.
 */
export async function requirePortalCliente(portal: PortalSlug): Promise<PortalMiembro> {
  const miembro = await requirePortalSession(portal);
  if (esEmpresario(miembro.rol)) redirect(homePortal(portal, miembro.rol));
  return miembro;
}

/**
 * Exige que el miembro sea EMPRESARIO activo del portal. Si es otro rol, lo manda
 * a SU home (no al lado inversionista/staff). Solo se usa en las rutas
 * app/<portal>/empresario/**; esas rutas solo existen en verticales con prestatarios.
 */
export async function requirePortalEmpresario(portal: PortalSlug): Promise<PortalMiembro> {
  const miembro = await requirePortalSession(portal);
  if (!esEmpresario(miembro.rol)) redirect(homePortal(portal, miembro.rol));
  return miembro;
}
