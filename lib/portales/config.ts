/**
 * Registro de VERTICALES del portal — fuente única de qué publica el portal y
 * cómo se ve. La base (tablas portal_*) es genérica y cada vertical es una fila
 * de config acá: sumar una vertical futura = agregar una entrada, sin migración.
 *
 * Hoy hay UNA sola vertical, y vive en la raíz del dominio:
 *   · contratista → / — publica CONTRATISTAS del Estado.
 *
 * El núcleo sigue siendo genérico a propósito (las funciones reciben el slug),
 * porque es lo que permitió separar esta vertical de su repo anterior sin
 * reescribirla. Nada acá hardcodea la marca: sale de `nombre`/`nombreCorto`.
 *
 * Los `campos` describen el jsonb `datos` de la vertical: el form los pinta y
 * los valida (con el Zod de <portal>/schema.ts), y el detalle los muestra. Las
 * ETIQUETAS de estos campos son datos de catálogo (como los nombres de banco en
 * lib/constants.ts), no chrome de pantalla; el copy de botones/títulos vive en
 * COPY.portales.
 */

import { APP, CONTACTO } from "@/lib/constants";

/**
 * Contacto operativo de la SAC. NO se duplica el número: sale de
 * lib/constants, y el día que la vertical tenga su propia línea se reemplaza
 * acá, en su fila.
 */
const CONTACTO_SAC: ContactoPortal = {
  whatsapp: CONTACTO.whatsapp,
  whatsappDisplay: CONTACTO.whatsappDisplay,
  whatsappBase: CONTACTO.whatsappBase,
};

/**
 * Slug interno de la vertical = valor de la columna `portal` en la base. Se
 * mantiene "contratista" (no "valoriza") a propósito: es el valor que ya tienen
 * las filas en Supabase, y renombrarlo sería una migración de datos sin ninguna
 * ganancia. "ValorizaPeru" es la MARCA (`nombre`), que es lo que se ve.
 */
export const PORTAL_SLUG = "contratista" as const;

/** Slugs internos (columna `portal` en la base). */
export type PortalSlug = typeof PORTAL_SLUG;

/** Espejo del enum SQL `portal_nivel_riesgo` (0076). */
export type PortalNivelRiesgo = "bajo" | "medio_bajo" | "medio" | "medio_alto" | "alto";
/** Espejo del enum SQL `portal_estado_oportunidad` (0076). */
export type PortalEstadoOportunidad = "borrador" | "disponible" | "reservada" | "cerrada";
/** Monedas soportadas (espejo del CHECK de la base). */
export type PortalMoneda = "PEN" | "USD";

/** Tipo de un campo de la ficha `datos`. Define cómo se pinta y se valida. */
export type CampoTipo = "texto" | "numero" | "moneda" | "porcentaje" | "select";

export interface CampoOpcion {
  value: string;
  label: string;
}

export interface CampoDef {
  /** Clave dentro del jsonb `datos`. */
  key: string;
  /** Etiqueta visible (dato de catálogo de la vertical). */
  label: string;
  tipo: CampoTipo;
  /** Opciones para `tipo: "select"`. */
  opciones?: readonly CampoOpcion[];
  /** Sufijo de display para números (ej. "m²"). */
  sufijo?: string;
  /** Texto de ayuda opcional bajo el campo. */
  ayuda?: string;
  /** Si el campo es obligatorio en el form. */
  requerido?: boolean;
}

/** Descriptor de las 3 stats + subtítulo de la card de la vertical. */
export interface CardConfig {
  /** Etiquetas de las 3 stats de la card (mayúsculas cortas). */
  stat1: string;
  stat2: string;
  stat3: string;
}

/**
 * Config de PRESTATARIOS de la vertical. Su PRESENCIA activa la sección de
 * gestión (nav admin + selector en el form de oportunidad). En verticales donde
 * el que pide el crédito NO es una entidad recurrente (una vertical donde el objeto
 * sea el bien, no la empresa), se deja `undefined` y todo lo de prestatarios queda
 * apagado.
 */
export interface PrestatariosConfig {
  /** Segmento de URL de la sección admin (ej. "contratistas"). */
  ruta: string;
  /** Etiqueta del nav / títulos (ej. "Contratistas"). */
  label: string;
  /** Singular para botones y selectores (ej. "contratista"). */
  singular: string;
}

/**
 * Canal de contacto de la vertical. Existe para que ninguna pantalla ni correo de
 * portal lea el WhatsApp de Don Gato Efectivo: son otros clientes y otro equipo.
 * Hoy los dos portales comparten el número operativo de la SAC porque no hay una
 * línea aparte todavía; cuando la haya, se cambia SOLO acá y se propaga.
 */
export interface ContactoPortal {
  /** E.164 sin '+' (para wa.me). */
  whatsapp: string;
  /** Display friendly (para texto visible). */
  whatsappDisplay: string;
  /** URL base wa.me del portal (sin mensaje). */
  whatsappBase: string;
}

export interface PortalConfig {
  slug: PortalSlug;
  /** Nombre completo del portal (marca del sub-servicio). */
  nombre: string;
  /** Nombre corto para el nav / chips. */
  nombreCorto: string;
  /** Bajada de una línea (login, header). */
  tagline: string;
  /** Qué objeto publica la vertical. */
  objeto: "contratista";
  /** Tipos de garantía sugeridos en el selector (texto abierto igual). */
  garantiasSugeridas: readonly string[];
  /** Campos del jsonb `datos` de la vertical. */
  campos: readonly CampoDef[];
  /** Config de la card (etiquetas de las stats). */
  card: CardConfig;
  /** Config de prestatarios de la vertical. Presente ⇒ la sección está activa. */
  prestatarios?: PrestatariosConfig;
  /** Canal de contacto propio del portal (nunca el de Efectivo). */
  contacto: ContactoPortal;
  /**
   * Riesgos genéricos de la vertical (los que aplican a toda operación del portal).
   * Se muestran en la ficha; una operación puede reemplazarlos con `datos.riesgos`
   * si tiene algo específico. Cada ítem: título del riesgo + cómo se mitiga.
   */
  riesgos: readonly RiesgoDef[];
  /**
   * Qué pasa cuando el deudor NO paga: el proceso de recuperación de la vertical.
   * OBLIGATORIO en toda vertical a propósito — es la pregunta que se hace todo
   * inversionista antes de comprometer dinero, y dejarla sin respuesta es el hueco
   * de transparencia más caro de un producto de inversión. Una vertical nueva no
   * puede publicarse sin explicar cómo se recupera.
   */
  recuperacion: RecuperacionDef;
}

/** Un riesgo genérico de la vertical con su mitigación. Dato de catálogo. */
export interface RiesgoDef {
  /** Riesgo en una frase corta. */
  riesgo: string;
  /** Cómo la garantía/estructura lo mitiga (español llano, sin jerga). */
  mitigacion: string;
}

/** Una etapa del proceso de recuperación ante impago. Dato de catálogo. */
export interface EtapaRecuperacionDef {
  /** Momento en la SECUENCIA, no un plazo (ej. "Si el atraso continúa"). Nunca
   *  publicar un SLA nuestro: no hay procedimiento de cobranza documentado que lo
   *  respalde, y prometerle un plazo a un inversionista es un pasivo. */
  cuando: string;
  /** Qué ocurre en esa etapa, en una frase corta. */
  titulo: string;
  /** Detalle factual de la etapa, sin jerga legal sin explicar. */
  detalle: string;
}

/**
 * Proceso de recuperación de una vertical. La ejecución de una hipoteca no se
 * parece a la de una factura del Estado: por eso vive por-portal y no en un texto
 * único. Regla de redacción: nada de "recuperación garantizada", nada de plazos
 * que no controlamos, y todo lo que dependa de un juez se dice que depende de un
 * juez.
 */
export interface RecuperacionDef {
  /** Etapas ordenadas, de la más temprana a la más tardía. */
  etapas: readonly EtapaRecuperacionDef[];
  /** Qué se ejecuta exactamente en esta vertical y por qué vía. */
  queSeEjecuta: string;
  /** Límites honestos de la vertical: costos, demoras y lo que no está cubierto. */
  limites: readonly string[];
}

const CONTRATISTA: PortalConfig = {
  slug: PORTAL_SLUG,
  // La marca NO se escribe acá: sale de `APP.brand` (lib/constants.ts), su única
  // fuente. Renombrar el portal = una línea allá, y se propaga al header, al login,
  // a la pestaña, a los correos y al pie legal.
  // (El nombre sigue siendo provisional: verificar dominio + Indecopi.)
  nombre: APP.brand,
  nombreCorto: APP.brand,
  tagline: "Financiamiento corto a contratistas del Estado, con garantías reales.",
  objeto: "contratista",
  garantiasSugeridas: [
    "hipotecaria",
    "factoring",
    "cuentas_por_cobrar",
    "mobiliaria",
    "cheque",
    "pagare",
    "aval",
    "cesion_flujos",
    "mutuo",
  ],
  campos: [
    { key: "entidad_estatal", label: "Entidad estatal", tipo: "texto", requerido: true },
    {
      key: "tipo_contrato",
      label: "Tipo de contrato",
      tipo: "select",
      requerido: true,
      opciones: [
        { value: "obra", label: "Obra" },
        { value: "bienes", label: "Bienes" },
        { value: "servicios", label: "Servicios" },
        { value: "consultoria", label: "Consultoría" },
      ],
    },
    { key: "ruc_contratista", label: "RUC del contratista", tipo: "texto", ayuda: "11 dígitos", requerido: true },
    { key: "monto_contrato", label: "Monto del contrato", tipo: "moneda", requerido: true },
    { key: "avance_obra_pct", label: "Avance de obra", tipo: "porcentaje", ayuda: "0 a 100" },
    { key: "plazo_contrato_meses", label: "Plazo del contrato", tipo: "numero", sufijo: "meses" },
  ],
  card: { stat1: "Monto", stat2: "Plazo", stat3: "Rent. anual" },
  prestatarios: { ruta: "contratistas", label: "Contratistas", singular: "contratista" },
  contacto: CONTACTO_SAC,
  riesgos: [
    {
      riesgo: "El Estado paga la valorización con demora (mora o pagos lentos).",
      mitigacion:
        "El financiamiento es de plazo corto y está respaldado por garantías reales; la cesión de flujos dirige el pago del Estado hacia la operación.",
    },
    {
      riesgo: "Hay que ejecutar una garantía y el proceso se dilata.",
      mitigacion:
        "Priorizamos garantías líquidas (carta fianza, factoring, cuentas por cobrar) que se cobran más rápido que un juicio largo.",
    },
    {
      riesgo: "El contratista incumple el contrato con la entidad.",
      mitigacion:
        "Evaluamos su historial y avance de obra antes de publicar; el track record del contratista está en la ficha.",
    },
    {
      riesgo: "Es una inversión poco líquida: no se retira antes del plazo.",
      mitigacion:
        "Son plazos cortos y conocidos de antemano; inviertes solo lo que puedes mantener hasta el vencimiento.",
    },
  ],
  recuperacion: {
    etapas: [
      {
        cuando: "Apenas hay atraso",
        titulo: "Cobranza y revisión con la entidad",
        detalle:
          "Se contacta a la empresa y, en paralelo, se verifica con la entidad estatal en qué estado está la valorización o la factura que respalda la operación. Buena parte de los atrasos de esta vertical nacen de una demora administrativa del pagador, no de una negativa a pagar.",
      },
      {
        cuando: "Si el atraso continúa",
        titulo: "Requerimiento formal y cobro directo",
        detalle:
          // NUNCA describir una cuenta intermedia acá: no existe, y "la cuenta de la
          // operación" se leía como una cuenta controlada por nosotros (custodia).
          // El pago va a la cuenta que el contrato de cesión designe, que es la del
          // acreedor (el inversionista), no una nuestra.
          "Se envía la carta notarial exigiendo el pago. Si la operación tiene cesión de flujos o de la cuenta por cobrar, se notifica a la entidad estatal para que pague en la cuenta que designa el contrato de cesión —la del acreedor— y no en la de la empresa.",
      },
      {
        cuando: "Si no se regulariza",
        titulo: "Cobro de las garantías más líquidas",
        detalle:
          "Se protestan los títulos valores firmados por la empresa y su representante (pagaré, cheque o letra de cambio). El protesto es la constancia formal de que el título no fue pagado, y habilita un proceso judicial ejecutivo, más corto que un juicio ordinario.",
      },
      {
        cuando: "Si lo anterior no alcanza",
        titulo: "Ejecución de garantías reales y del aval",
        detalle:
          "Se ejecutan la garantía mobiliaria o la hipoteca que respalden la operación y se acciona contra el aval o fiador, que responde con su propio patrimonio.",
      },
    ],
    queSeEjecuta:
      "En este portal la salvaguarda no suele ser un solo bien, sino una pila de respaldos: la cesión del flujo que paga la entidad estatal, títulos valores firmados por la empresa y sus representantes, y garantías reales o un aval. Se cobran en ese orden, de la más rápida de realizar a la más lenta.",
    limites: [
      "Que el pagador final sea el Estado reduce el riesgo de que el dinero no exista, pero no elimina el riesgo de demora: una valorización observada o la falta de presupuesto asignado pueden retrasar el pago varios meses.",
      "Una cuenta por cobrar vale lo que la entidad reconozca. Si la entidad observa el avance de obra o aplica penalidades al contrato, el monto por cobrar puede reducirse.",
      "El protesto y el proceso ejecutivo son más rápidos que un juicio ordinario, pero siguen siendo procesos judiciales: los plazos los fija el juzgado, no nosotros.",
      "El aval responde con su patrimonio. Si ese patrimonio no alcanza o ya está comprometido con otros acreedores, la cobranza puede quedar cubierta solo en parte.",
    ],
  },
};

/** Registro de verticales, por slug. */
export const PORTALES: Record<PortalSlug, PortalConfig> = {
  [PORTAL_SLUG]: CONTRATISTA,
};

/** Config de LA vertical de este portal. Atajo para no escribir PORTALES[slug]. */
export const PORTAL: PortalConfig = CONTRATISTA;

/** Lista de verticales (para iterar). */
export const LISTA_PORTALES: readonly PortalConfig[] = [CONTRATISTA];

const POR_SLUG = new Map<string, PortalConfig>(LISTA_PORTALES.map((p) => [p.slug, p]));

/** Config de una vertical por su slug interno, o null si no existe. */
export function portalPorSlug(slug: string): PortalConfig | null {
  return POR_SLUG.get(slug) ?? null;
}

/** ¿El string es un slug de portal válido? (narrowing para APIs). */
export function esPortalSlug(v: string): v is PortalSlug {
  return POR_SLUG.has(v);
}

/**
 * Link de WhatsApp al canal DEL PORTAL, con mensaje opcional pre-armado. Existe
 * para que ninguna pantalla de portal llame a `CONTACTO.waLink()` (el número de
 * Don Gato Efectivo): un inversionista que escribe por el botón de su portal
 * tiene que caer en el canal de ese portal, no en la atención de otro producto.
 *
 * OJO: `CONTACTO.waLinkTo(asesor.telefono, …)` es OTRA cosa y está bien — ese es
 * el celular del asesor del portal, no un canal de Efectivo.
 */
export function waPortal(portal: PortalSlug, mensaje?: string): string {
  return CONTACTO.waLinkTo(PORTALES[portal].contacto.whatsapp, mensaje);
}

/** Def de un campo de la vertical por su key. */
export function campoDef(portal: PortalConfig, key: string): CampoDef | undefined {
  return portal.campos.find((c) => c.key === key);
}
