"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarCheck, MessageCircle, Clock, FileDown } from "lucide-react";

import { PButton } from "@/components/portales/ui/PButton";
import { PConfirmDialog } from "@/components/portales/ui/PConfirmDialog";
import { COPY } from "@/lib/copy";
import { CONTACTO } from "@/lib/constants";
import { waPortal, type PortalSlug } from "@/lib/portales/config";
import type { MiAsesor } from "@/lib/portales/data";
import { CuentaRegresiva } from "@/components/portales/CuentaRegresiva";

/** Forma mínima de la oportunidad que necesitan las acciones de reserva. */
export interface OpReservable {
  id: string;
  titulo: string;
  estadoPublicacion: string;
  reservadoPor: string | null;
  reservadoHasta: string | null;
}

/**
 * Acciones de reserva de una oportunidad, compartidas por la card del catálogo y
 * la ficha. Tres estados, derivados del estado real del server (§3):
 *   · disponible          → botón "Reservar" (ConfirmDialog, sin dinero).
 *   · reservada por mí     → aviso + cuenta regresiva + WhatsApp al asesor + cancelar.
 *   · reservada por otro   → chip "Reservada" sin acción.
 *
 * La transición es un claim atómico server-side (portal_reservar). Anti
 * doble-submit: `accion` bloquea todo; el ConfirmDialog trae su propio guard.
 */
export function AccionesReserva({
  portal,
  op,
  miId,
  asesor,
  fullWidth = false,
}: {
  portal: PortalSlug;
  op: OpReservable;
  miId: string;
  asesor: MiAsesor | null;
  fullWidth?: boolean;
}) {
  const T = COPY.portales.reserva;
  const router = useRouter();
  const [accion, setAccion] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const busy = accion !== null;

  const esMia = op.estadoPublicacion === "reservada" && op.reservadoPor === miId;
  const deOtro = op.estadoPublicacion === "reservada" && op.reservadoPor !== miId;
  const disponible = op.estadoPublicacion === "disponible";

  async function reservar() {
    setAccion("reservar");
    try {
      const res = await fetch(`/api/reservas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oportunidadId: op.id }),
      });
      const p = (await res.json().catch(() => ({}))) as { resultado?: string };
      if (!res.ok || p.resultado === "sin_acceso") {
        toast.error(T.errorSinAcceso);
        return;
      }
      if (p.resultado === "no_disponible") {
        toast.error(T.noDisponible);
        setConfirmar(false);
        router.refresh();
        return;
      }
      toast.success(T.reservadaOk);
      setConfirmar(false);
      router.refresh();
    } catch {
      toast.error(T.error);
    } finally {
      setAccion(null);
    }
  }

  async function cancelar() {
    if (busy) return;
    setAccion("cancelar");
    try {
      const res = await fetch(`/api/reservas/${op.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "liberar" }),
      });
      const p = (await res.json().catch(() => ({}))) as { resultado?: string };
      if (!res.ok || (p.resultado && p.resultado !== "ok")) {
        toast.error(T.error);
        return;
      }
      toast.success(T.canceladaOk);
      router.refresh();
    } catch {
      toast.error(T.error);
    } finally {
      setAccion(null);
    }
  }

  if (disponible) {
    return (
      <>
        <PButton
          variant="primary"
          size="sm"
          pill
          fullWidth={fullWidth}
          leadingIcon={<CalendarCheck className="size-4" />}
          onClick={() => setConfirmar(true)}
        >
          {T.reservar}
        </PButton>
        <PConfirmDialog
          open={confirmar}
          onClose={() => setConfirmar(false)}
          onConfirm={reservar}
          title={T.confirmarTitulo}
          description={T.confirmarTexto}
          confirmLabel={T.confirmarCta}
          cancelLabel={COPY.portales.comun.cancelar}
        />
      </>
    );
  }

  if (esMia) {
    const wa = asesor?.telefono
      ? CONTACTO.waLinkTo(asesor.telefono, T.waMensaje(op.titulo))
      : waPortal(portal, T.waMensaje(op.titulo));
    return (
      <div className="w-full space-y-2">
        <div className="flex flex-wrap items-center gap-2 rounded-portal-sm border border-portal-warning/30 bg-portal-warning-soft/60 px-3 py-2 text-sm">
          <Clock className="size-4 shrink-0 text-portal-warning" aria-hidden />
          <span className="font-semibold text-portal-ink">{T.reservadaPorTi}</span>
          <span className="text-portal-muted">·</span>
          <CuentaRegresiva
            hasta={op.reservadoHasta ?? ""}
            conPrefijo
            className="text-portal-ink2"
          />
        </div>
        <PButton
          as="link"
          href={wa}
          external
          variant="primary"
          size="sm"
          pill
          fullWidth
          leadingIcon={<MessageCircle className="size-4" />}
        >
          {T.escribirAsesor}
        </PButton>
        {/* Constancia de SU reserva (PDF). El route la acota al dueño. */}
        <PButton
          as="link"
          href={`/api/reservas/${op.id}/constancia?download=1`}
          external
          variant="ghost"
          size="sm"
          pill
          fullWidth
          leadingIcon={<FileDown className="size-4" />}
        >
          {COPY.portales.cliente.constancia.boton}
        </PButton>
        <PButton
          variant="ghost"
          size="sm"
          pill
          fullWidth
          loading={accion === "cancelar"}
          disabled={busy}
          onClick={cancelar}
        >
          {T.cancelar}
        </PButton>
      </div>
    );
  }

  if (deOtro) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-chip border border-portal-line2 bg-portal-subtle px-3 py-1.5 text-sm font-semibold text-portal-muted">
        <Clock className="size-4" aria-hidden />
        {T.reservadaPorOtro}
      </span>
    );
  }

  return null;
}
