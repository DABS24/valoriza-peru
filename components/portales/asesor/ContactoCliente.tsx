import { MessageCircle, Phone } from "lucide-react";

import { PButton } from "@/components/portales/ui/PButton";
import { COPY } from "@/lib/copy";
import { cn } from "@/lib/cn";
import { CONTACTO } from "@/lib/constants";
import { telefonoWa } from "@/lib/portales/asesor";

/**
 * Botones de contacto de un cliente (WhatsApp + llamar), a un toque. Único lugar del
 * patrón de contacto de la cartera del asesor: lo reusan la lista "Mis clientes" y la
 * ficha 360. Normaliza el teléfono a wa.me con el helper compartido (telefonoWa) y
 * arma el link con CONTACTO.waLinkTo (el número del cliente, con mensaje pre-armado).
 * Si el cliente no tiene teléfono, un aviso discreto en vez de botones muertos.
 */
export function ContactoCliente({
  nombre,
  telefono,
  size = "sm",
  className,
}: {
  nombre: string;
  telefono: string | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const T = COPY.portales.asesor.contacto;
  const wa = telefonoWa(telefono);

  if (!wa) {
    return <span className="text-xs text-portal-muted">{T.sinTelefono}</span>;
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <PButton
        as="link"
        href={CONTACTO.waLinkTo(wa, T.waMensaje(nombre))}
        external
        variant="primary"
        size={size}
        pill
        leadingIcon={<MessageCircle className="size-4" />}
      >
        {T.whatsapp}
      </PButton>
      <PButton
        as="link"
        href={`tel:+${wa}`}
        external
        variant="ghost"
        size={size}
        pill
        leadingIcon={<Phone className="size-4" />}
      >
        {T.llamar}
      </PButton>
    </div>
  );
}
