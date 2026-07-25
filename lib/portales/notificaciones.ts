import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { enviarCorreo, remitentePortal } from "@/lib/email/resend";
import {
  correoPortalReservaAsesor,
  correoPortalReservaConfirmada,
  correoPortalSolicitudNueva,
  correoPortalSolicitudResuelta,
} from "@/lib/email/templates";
import { portalPorSlug, type PortalSlug } from "@/lib/portales/config";
import { APP } from "@/lib/constants";

/**
 * Notificaciones por correo que CIERRAN EL LOOP entre roles de los portales.
 *
 * Todo es BEST-EFFORT: si el correo falla (Resend caído, sin API key, sin correo
 * del destinatario) la transacción del usuario NO se cae — la reserva/confirmación
 * ya está persistida por la función SQL atómica; el correo es un aviso, no la
 * verdad. Por eso nada de esto lanza.
 *
 * La resolución de correos va con admin client: los correos viven en `auth.users`
 * (no en `portal_miembros`) y el rol que dispara la acción ya fue autorizado en el
 * route. Se piden SOLO los datos mínimos (correo + título de la op).
 */

/** Origen público de la app. `APP.url` ya resuelve env + fallback: no se re-deriva. */
const ORIGIN = APP.url;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function correoDeUsuario(admin: any, userId: string): Promise<string | null> {
  const { data } = await admin.auth.admin.getUserById(userId);
  return data?.user?.email ?? null;
}

/**
 * Avisa al ASESOR asignado que un inversionista reservó una oportunidad (tiene 24h).
 * Se llama tras `portal_reservar`='ok'. El asesor sale de la reserva recién creada
 * (asesor_id); si la reserva no tiene asesor, no hay a quién avisar y se omite.
 */
export async function notificarReservaAlAsesor(
  portal: PortalSlug,
  oportunidadId: string,
  clienteId: string,
): Promise<void> {
  try {
    const admin = createAdminClient();
    // La reserva recién insertada del cliente para esta op (activa, la más reciente).
    const { data: reserva } = await admin
      .from("portal_reservas")
      .select("asesor_id")
      .eq("portal", portal)
      .eq("oportunidad_id", oportunidadId)
      .eq("cliente_id", clienteId)
      .eq("estado", "activa")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const asesorId = (reserva?.asesor_id as string | null) ?? null;
    if (!asesorId) return; // sin asesor asignado → nadie a quién avisar

    const [correo, { data: op }] = await Promise.all([
      correoDeUsuario(admin, asesorId),
      admin.from("portal_oportunidades").select("titulo").eq("id", oportunidadId).maybeSingle(),
    ]);
    if (!correo) return;

    const cfg = portalPorSlug(portal);
    const marca = cfg?.nombreCorto ?? portal;
    const { subject, html, text } = correoPortalReservaAsesor({
      marca,
      oportunidad: (op?.titulo as string) ?? "—",
      url: `${ORIGIN}/asesor/reservas`,
    });
    await enviarCorreo({ to: correo, subject, html, text, from: remitentePortal(marca) });
  } catch {
    // best-effort
  }
}

/**
 * Avisa al INVERSIONISTA que su reserva fue CONFIRMADA. Se llama tras
 * `portal_confirmar_reserva`='ok'. El cliente sale de la reserva recién confirmada
 * de esa op (la que quedó estado='confirmada').
 */
export async function notificarConfirmacionAlInversionista(
  portal: PortalSlug,
  oportunidadId: string,
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: reserva } = await admin
      .from("portal_reservas")
      .select("cliente_id")
      .eq("portal", portal)
      .eq("oportunidad_id", oportunidadId)
      .eq("estado", "confirmada")
      .order("resuelto_en", { ascending: false })
      .limit(1)
      .maybeSingle();
    const clienteId = (reserva?.cliente_id as string | null) ?? null;
    if (!clienteId) return;

    const [correo, { data: op }] = await Promise.all([
      correoDeUsuario(admin, clienteId),
      admin.from("portal_oportunidades").select("titulo").eq("id", oportunidadId).maybeSingle(),
    ]);
    if (!correo) return;

    const cfg = portalPorSlug(portal);
    const marca = cfg?.nombreCorto ?? portal;
    const { subject, html, text } = correoPortalReservaConfirmada({
      marca,
      oportunidad: (op?.titulo as string) ?? "—",
      url: `${ORIGIN}/cliente/oportunidades/${oportunidadId}`,
    });
    await enviarCorreo({ to: correo, subject, html, text, from: remitentePortal(marca) });
  } catch {
    // best-effort
  }
}

/**
 * Avisa al STAFF (admins del portal) que una empresa dejó una nueva solicitud de
 * financiamiento. Se llama tras crearla. Se notifica a los ADMIN (los que resuelven);
 * si no hay ninguno con correo, se omite. Best-effort.
 */
export async function notificarSolicitudAlStaff(
  portal: PortalSlug,
  prestatarioId: string,
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: empresa } = await admin
      .from("portal_prestatarios")
      .select("nombre")
      .eq("id", prestatarioId)
      .maybeSingle();
    const empresaNombre = (empresa?.nombre as string) ?? "Una empresa";

    const { data: admins } = await admin
      .from("portal_miembros")
      .select("user_id")
      .eq("portal", portal)
      .eq("rol", "admin")
      .eq("estado", "activo");
    const ids = ((admins as { user_id: string }[] | null) ?? []).map((m) => m.user_id);
    if (ids.length === 0) return;

    const correos = (await Promise.all(ids.map((id) => correoDeUsuario(admin, id)))).filter(
      (c): c is string => !!c,
    );
    if (correos.length === 0) return;

    const cfg = portalPorSlug(portal);
    const marca = cfg?.nombreCorto ?? portal;
    const { subject, html, text } = correoPortalSolicitudNueva({
      marca,
      empresa: empresaNombre,
      url: `${ORIGIN}/admin/solicitudes`,
    });
    // Un correo por admin (no exponer la lista en el "to").
    await Promise.all(
      correos.map((to) => enviarCorreo({ to, subject, html, text, from: remitentePortal(marca) })),
    );
  } catch {
    // best-effort
  }
}

/**
 * Avisa a la EMPRESA (empresario que la creó) que su solicitud fue APROBADA o
 * RECHAZADA. `creadoPor` = user id del empresario; `motivo` solo en rechazo. Best-effort.
 */
export async function notificarResolucionAlEmpresario(
  portal: PortalSlug,
  creadoPor: string | null,
  aprobada: boolean,
  motivo?: string,
): Promise<void> {
  try {
    if (!creadoPor) return;
    const admin = createAdminClient();
    const correo = await correoDeUsuario(admin, creadoPor);
    if (!correo) return;

    const cfg = portalPorSlug(portal);
    const marca = cfg?.nombreCorto ?? portal;
    const { subject, html, text } = correoPortalSolicitudResuelta({
      marca,
      aprobada,
      motivo,
      url: `${ORIGIN}/empresario/solicitudes`,
    });
    await enviarCorreo({ to: correo, subject, html, text, from: remitentePortal(marca) });
  } catch {
    // best-effort
  }
}
