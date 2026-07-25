/**
 * Constantes de negocio (no traducible). Copy traducible vive en lib/copy.ts.
 *
 * ⚠️ REGLA: si vas a hardcodear teléfono, correo, plazo o cualquier dato
 * operativo en JSX/copy → CRÉALO ACÁ primero y úsalo desde el componente. Un
 * valor, un lugar: cambiarlo debe propagarse a toda la app.
 */

/**
 * MARCA — una sola fuente.
 *
 * "ValorizaPeru" es la marca del portal; "Don Gato Servicios SAC" es la empresa
 * que lo opera (razón social fija ante SUNAT, no se toca). Renombrar el portal =
 * cambiar SOLO `BRAND` acá: se propaga al login, al header, a la pestaña, a los
 * correos y al pie legal.
 *
 * `lib/portales/config.ts` lee esta constante para el `nombre` de la vertical —
 * nunca al revés, para no armar una dependencia circular entre los dos módulos.
 */
const BRAND = "ValorizaPeru";

export const APP = {
  /** Razón social que opera el portal. Fija ante SUNAT. */
  legalName: "Don Gato Servicios SAC",
  /** Marca del portal. */
  brand: BRAND,
  /**
   * Nombre comercial. Hoy coincide con la marca: este repo es UN producto, no una
   * familia de verticales. Se mantiene la clave porque el copy heredado la usa, y
   * porque el día que haya un sub-servicio se deriva acá y nada más se toca.
   */
  brandProduct: BRAND,
  url: process.env.NEXT_PUBLIC_APP_URL || "https://valorizaperu.com",
  /** Consulta pública de RUC en SUNAT — para que el cliente nos verifique él mismo. */
  sunatConsultaUrl: "https://e-consultaruc.sunat.gob.pe/",
} as const;

/**
 * Contacto único — TODA mención de WhatsApp o correo en la app DEBE leer de acá.
 * Cuando cambie el número, un solo cambio se propaga al login, al pie y a los
 * correos.
 */

/**
 * ÚNICA fuente del número: los 9 dígitos móviles de Perú, sin código país.
 * Cambiar SOLO esto y se propaga a wa.me, display y links con mensaje.
 */
const WA_LOCAL = "939434031";
/**
 * Código de país de Perú para E.164 sin '+'. Exportado porque no solo arma
 * NUESTRO número: también normaliza el de un tercero antes de mandarlo a wa.me
 * (ver `telefonoWa` en lib/portales/asesor.ts), y ese "51" no debe escribirse
 * dos veces.
 */
export const WA_CC = "51";
/** E.164 sin '+' (para wa.me/...). */
const WA_E164 = `${WA_CC}${WA_LOCAL}`;
/** Display friendly, derivado: "+51 939 434 031". */
const WA_DISPLAY = `+${WA_CC} ${WA_LOCAL.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")}`;
const waHref = (num: string, mensaje?: string): string => {
  const base = `https://wa.me/${num}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
};

export const CONTACTO = {
  /** Número WhatsApp con código país, sin '+' (para wa.me/...). */
  whatsapp: WA_E164,
  /** Display friendly. */
  whatsappDisplay: WA_DISPLAY,
  /** URL base wa.me — usar con encodeURIComponent del mensaje. */
  whatsappBase: waHref(WA_E164),
  /** Helper: genera link wa.me al canal del portal con mensaje pre-armado. */
  waLink: (mensaje?: string): string => waHref(WA_E164, mensaje),
  /**
   * Helper: link wa.me a un número arbitrario — el celular del ASESOR del
   * inversionista, que es el canal real de este negocio (se opera por teléfono).
   */
  waLinkTo: (numero: string, mensaje?: string): string =>
    waHref(numero.replace(/\D/g, ""), mensaje),
  correo: "hola@valorizaperu.com",
} as const;
