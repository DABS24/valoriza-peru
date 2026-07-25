import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { esPortalSlug, type PortalSlug } from "@/lib/portales/config";
import type { PortalRol } from "@/lib/portales/roles";

/**
 * ¿A qué producto pertenece una cuenta: a Don Gato Efectivo o a un PORTAL?
 *
 * Existe porque hay rutas COMPARTIDAS por los dos productos (cambiar contraseña,
 * apagar el doble factor) que necesitan saberlo para mandar el correo con la marca
 * correcta y —desde ahora— para escribir en la bitácora correcta. Antes esta
 * pregunta se respondía una sola vez, adentro de avisoSeguridad, y no se podía
 * reusar; escribirla de nuevo por consumidor es cómo dos rutas terminan con
 * criterios distintos para el mismo humano.
 *
 * PRIORIDAD A EFECTIVO: si el humano tiene fila en `perfiles`, su cuenta vive en
 * Efectivo aunque además sea miembro de un portal. Es el criterio que ya usaba el
 * aviso de seguridad y se conserva tal cual: un solo criterio para las dos cosas.
 *
 * Va con service_role a propósito: se llama desde rutas que YA autorizaron al
 * usuario (getUser) y solo resuelve datos de ESE user_id — nunca de uno que venga
 * del body.
 *
 * Best-effort: ante cualquier error devuelve null (o sea, "cuenta de Efectivo"),
 * que es el comportamiento de siempre.
 */
export interface CuentaDePortal {
  portal: PortalSlug;
  rol: PortalRol;
  /** Nombre en el portal — la bitácora lo SELLA en el evento (0091). */
  nombre: string | null;
}

export async function cuentaDePortal(userId?: string | null): Promise<CuentaDePortal | null> {
  if (!userId) return null;
  try {
    const admin = createAdminClient();
    const { data: perfil } = await admin
      .from("perfiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (perfil) return null;

    const { data: miembro } = await admin
      .from("portal_miembros")
      .select("portal, rol, nombre")
      .eq("user_id", userId)
      .eq("estado", "activo")
      .limit(1)
      .maybeSingle();
    if (!miembro || !esPortalSlug(miembro.portal as string)) return null;

    return {
      portal: miembro.portal as PortalSlug,
      rol: miembro.rol as PortalRol,
      nombre: (miembro.nombre as string | null) ?? null,
    };
  } catch {
    return null;
  }
}
