"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { COPY } from "@/lib/copy";
import { type PortalSlug } from "@/lib/portales/config";
import type { OportunidadFull, MiAsesor, OpcionTitular } from "@/lib/portales/data";
import { FichaDetalle } from "@/components/portales/FichaDetalle";
import { TimelineReserva } from "@/components/portales/TimelineReserva";
import { AccionesReserva } from "@/components/portales/cliente/AccionesReserva";
import { BloquearPara } from "@/components/portales/asesor/BloquearPara";
import { basePortal } from "@/lib/portales/rutas";

/**
 * Detalle del inversionista: ficha rica + acciones de reserva. El botón principal
 * de una op disponible es "Reservar" (hold 24h, sin dinero); si ya la reservó ve la
 * cuenta regresiva y el WhatsApp a su asesor.
 *
 * El STAFF ve en su lugar "Bloquear para un cliente" (0090): esta ficha es la que
 * abre cuando está al teléfono con alguien, y el bloqueo tiene que estar donde
 * está mirando, no en otra pantalla.
 */
export function DetalleCliente({
  portal,
  op,
  miId,
  asesor,
  esCliente,
  esStaff = false,
  titulares = [],
}: {
  portal: PortalSlug;
  op: OportunidadFull;
  miId: string;
  asesor: MiAsesor | null;
  esCliente: boolean;
  /** Quien mira es asesor/admin. */
  esStaff?: boolean;
  /** Su cartera (clientes con cuenta + prospectos). Vacía si no es staff. */
  titulares?: OpcionTitular[];
}) {
  const T = COPY.portales;
  const base = basePortal(portal);
  // El inversionista ve el timeline del proceso cuando la operación la reservó él
  // (hold activo). La ficha del cliente solo expone estados públicos
  // (disponible/reservada), así que acá "reservada por mí" ⇒ paso "reservada".
  const reservadaPorMi = op.estadoPublicacion === "reservada" && op.reservadoPor === miId;

  return (
    <div>
      <Link
        href={`${base}/cliente/oportunidades`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-portal-muted transition hover:text-portal-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {T.cliente.catalogoTitulo}
      </Link>

      <FichaDetalle
        op={op}
        lateralTop={reservadaPorMi ? <TimelineReserva estado="reservada" /> : undefined}
        acciones={
          esCliente ? (
            <AccionesReserva portal={portal} op={op} miId={miId} asesor={asesor} fullWidth />
          ) : esStaff && op.estadoPublicacion === "disponible" ? (
            <BloquearPara oportunidadId={op.id} titulares={titulares} fullWidth />
          ) : undefined
        }
      />
    </div>
  );
}
