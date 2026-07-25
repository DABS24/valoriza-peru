/**
 * Constantes de los portales: niveles de riesgo (con su color), tipos de
 * garantía y estados de publicación. Espejo TS de los enums de 0076.
 *
 * ⚠️ ÚNICA fuente del color del riesgo. Las clases se escriben LITERALES (no se
 * arman por concatenación) para que el content-scanner de Tailwind las vea; un
 * `bg-${tono}` dinámico saldría sin estilo. Si tocas un color, tócalo acá y se
 * propaga a la card, al detalle y a los filtros.
 */

import type { PortalNivelRiesgo, PortalEstadoOportunidad } from "@/lib/portales/config";
import type { PortalRol } from "@/lib/portales/roles";
// Solo el TIPO (se borra al compilar): esto no arrastra el data layer al cliente.
// Mismo criterio que lib/portales/asesor.ts, que ya lo hace.
import type { EstadoReserva } from "@/lib/portales/data";

/**
 * Teléfono aceptable en los portales: 6 a 15 dígitos, con '+' opcional. Deliberadamente
 * ancho — el titular puede ser extranjero y el asesor lo carga por teléfono, así que
 * exigir el formato peruano rechazaría clientes reales; la normalización a wa.me la
 * hace `telefonoWa` (lib/portales/asesor.ts), no la validación.
 *
 * ÚNICA fuente: la validan el schema Zod del prospecto, los dos route handlers de
 * alta de cuentas y el diálogo de bloqueo del asesor. Cuatro copias del mismo regex
 * significan que aflojar una acepta en el cliente lo que el server rechaza (o al
 * revés) y el asesor se come un error sin explicación. Vive acá y no en schema.ts
 * porque un Client Component también la necesita y no debe arrastrar Zod al bundle.
 */
export const TELEFONO_REGEX = /^\+?\d{6,15}$/;

/** ¿El teléfono tiene forma aceptable? Mismo criterio que el server, sin Zod. */
export function esTelefonoValido(telefono: string): boolean {
  return TELEFONO_REGEX.test(telefono.trim());
}

export interface NivelRiesgoDef {
  id: PortalNivelRiesgo;
  label: string;
  /** Clases del badge (fondo + texto + borde). Literales para Tailwind. */
  badge: string;
  /** Clase de fondo sólido para el punto/indicador. */
  punto: string;
  /** Qué significa este nivel, en español llano (tooltip/expandible junto al badge). */
  explicacion: string;
}

/**
 * Escala de riesgo, de menor a mayor. Verde → verde-lima → ámbar → naranja →
 * rojo. Los tres anclajes (bajo/medio/alto) salen de los tokens `portal-*` del
 * tema del portal —NO de los de Don Gato Efectivo—: el badge de riesgo es de lo
 * más visible de la ficha y tiene que verse de la marca del portal. Los dos
 * intermedios usan hex literal porque el tema no define lima ni naranja (dos
 * tokens más para un solo peldaño cada uno no se paga).
 * La `explicacion` es metodología visible = confianza: el inversionista entiende
 * qué mira el equipo detrás de cada color, no solo el color.
 */
export const NIVELES_RIESGO: readonly NivelRiesgoDef[] = [
  {
    id: "bajo",
    label: "Riesgo bajo",
    badge: "bg-portal-positive-soft text-portal-positive border border-portal-positive/30",
    punto: "bg-portal-positive",
    explicacion:
      "Garantía sólida y holgada frente al monto, historial de pago limpio y estructura simple. Es lo más conservador del catálogo.",
  },
  {
    id: "medio_bajo",
    label: "Riesgo medio-bajo",
    badge: "bg-[#ECFCCB] text-[#4D7C0F] border border-[#65A30D]/30",
    punto: "bg-[#65A30D]",
    explicacion:
      "Buen respaldo y antecedentes favorables, con algún punto menor a vigilar (plazo, avance de obra o una carga). Sigue siendo prudente.",
  },
  {
    id: "medio",
    label: "Riesgo medio",
    badge: "bg-portal-warning-soft text-portal-warning border border-portal-warning/40",
    punto: "bg-portal-warning",
    explicacion:
      "Respaldo razonable pero con factores a considerar: cobertura más ajustada, plazos más largos o dependencia de un pago del Estado. Rentabilidad mayor a cambio.",
  },
  {
    id: "medio_alto",
    label: "Riesgo medio-alto",
    badge: "bg-[#FFEDD5] text-[#9A3412] border border-[#EA580C]/30",
    punto: "bg-[#EA580C]",
    explicacion:
      "Hay señales que exigen tolerancia: garantía más justa, historial corto o estructura compleja. Para perfiles que aceptan más volatilidad.",
  },
  {
    id: "alto",
    label: "Riesgo alto",
    badge: "bg-portal-danger-soft text-portal-danger border border-portal-danger/30",
    punto: "bg-portal-danger",
    explicacion:
      "Mayor probabilidad de mora o de tener que ejecutar la garantía. Solo para quien entiende y puede asumir la pérdida de capital.",
  },
] as const;

const NIVEL_POR_ID = new Map(NIVELES_RIESGO.map((n) => [n.id, n]));

/** Def de un nivel de riesgo (o null si no está clasificado). */
export function nivelRiesgo(id: PortalNivelRiesgo | null | undefined): NivelRiesgoDef | null {
  return id ? (NIVEL_POR_ID.get(id) ?? null) : null;
}

/**
 * Catálogo de tipos de garantía conocidos, con su etiqueta. `tipo` en la base es
 * texto ABIERTO (cada oportunidad ofrece lo que tenga): esto es solo el mapeo
 * id→label para pintar bonito. Un tipo desconocido cae al fallback capitalizado.
 */
export const GARANTIA_TIPOS: Record<string, string> = {
  hipotecaria: "Garantía hipotecaria",
  factoring: "Factoring",
  cuentas_por_cobrar: "Cuentas por cobrar",
  mobiliaria: "Garantía mobiliaria",
  cheque: "Cheque",
  pagare: "Pagaré",
  aval: "Aval",
  cesion_flujos: "Cesión de flujos",
  mutuo: "Mutuo",
};

/** Etiqueta legible de un tipo de garantía (fallback: capitaliza el id). */
export function labelGarantia(tipo: string): string {
  const t = tipo.trim();
  if (GARANTIA_TIPOS[t]) return GARANTIA_TIPOS[t];
  const limpio = t.replace(/[_-]+/g, " ");
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

export interface EstadoPublicacionDef {
  id: PortalEstadoOportunidad;
  label: string;
  /** Tono del Pill (mapea a los tonos del primitivo Pill). */
  tono: "neutral" | "navy" | "money" | "gold" | "alert";
}

/** Estados de publicación de una oportunidad. Espejo del enum SQL. */
export const ESTADOS_PUBLICACION: readonly EstadoPublicacionDef[] = [
  { id: "borrador", label: "Borrador", tono: "neutral" },
  { id: "disponible", label: "Disponible", tono: "money" },
  { id: "reservada", label: "Reservada", tono: "gold" },
  { id: "cerrada", label: "Cerrada", tono: "navy" },
] as const;

const ESTADO_POR_ID = new Map(ESTADOS_PUBLICACION.map((e) => [e.id, e]));

/** Def de un estado de publicación (fallback: borrador). */
export function estadoPublicacion(id: PortalEstadoOportunidad): EstadoPublicacionDef {
  return ESTADO_POR_ID.get(id) ?? ESTADOS_PUBLICACION[0];
}

/**
 * Tono del Pill para el estado de una SOLICITUD de financiamiento (0084). El label
 * vive en el copy (COPY.portales.empresario.solicitudes.estado); acá solo el color,
 * único lugar para no repetirlo entre la vista del empresario y la del admin.
 */
export const TONO_SOLICITUD: Record<
  "en_evaluacion" | "aprobada" | "rechazada" | "convertida" | "retirada",
  "neutral" | "navy" | "money" | "gold" | "alert"
> = {
  en_evaluacion: "gold",
  aprobada: "money",
  rechazada: "alert",
  convertida: "navy",
  // Retirada por la propia empresa: no es un rechazo nuestro, no va en rojo.
  retirada: "neutral",
};

/**
 * Tono del Pill para el estado de una RESERVA. El label vive en el copy
 * (COPY.portales.historial.estados); acá solo el color, único lugar para no
 * repetirlo entre la cartera y el historial del inversionista y las fichas del
 * asesor (cliente con cuenta y titular sin cuenta) — las cuatro lo tenían copiado
 * byte a byte, así que cambiar el ámbar de "activa" costaba cuatro archivos.
 */
export const TONO_RESERVA: Record<EstadoReserva, "gold" | "money" | "neutral"> = {
  // Activa = hold de 24 h corriendo: atención, todavía no está cerrada.
  activa: "gold",
  confirmada: "money",
  // Expirada y cancelada no son un error del inversionista: en gris, no en rojo.
  expirada: "neutral",
  cancelada: "neutral",
};

/**
 * Tono del Pill para el ROL de un miembro. El label vive en el copy
 * (COPY.portales.roles); acá solo el color, único lugar para no repetirlo entre la
 * tabla de usuarios y la bitácora.
 */
export const TONO_ROL: Record<PortalRol, "neutral" | "navy" | "money"> = {
  admin: "navy",
  asesor: "money",
  cliente: "neutral",
  // El empresario se crea desde la ficha de la empresa, pero aparece en las listas.
  empresario: "neutral",
};

/**
 * Rango de plazo (en meses) que acepta una solicitud de financiamiento. Vive acá
 * porque lo consumen DOS mundos que no pueden discrepar: el validador Zod que
 * rechaza la solicitud (lib/portales/schema.ts) y los textos que se lo prometen al
 * empresario (el hint del campo y el mensaje de error, en lib/copy.ts). Cuando el
 * número estaba escrito a mano en los dos, mover el tope dejaba a la UI mintiendo.
 */
export const PLAZO_SOLICITUD_MESES = { min: 1, max: 120 } as const;

/** Ratings A–G que el staff puede asignar (opcional). */
export const RATINGS = ["A", "B", "C", "D", "E", "F", "G"] as const;
export type Rating = (typeof RATINGS)[number];

/**
 * Explicación de la escala de rating (A mejor → G peor), en español llano. Es
 * metodología visible: el inversionista entiende que A es lo más seguro y G lo
 * más arriesgado, análogo a las calificadoras de riesgo. Texto de catálogo.
 */
export const RATING_ESCALA_EXPLICACION =
  "El rating resume la calidad de la operación de A (la más segura) a G (la más arriesgada), parecido a las calificadoras de riesgo. Cuanto más cerca de A, más sólido el respaldo y el historial; hacia G, mayor incertidumbre y mayor rentabilidad a cambio.";

/**
 * Catálogo de tipos de DOCUMENTO del data room (id → label). `tipo` en la base es
 * texto abierto; esto es el mapeo para pintar bonito y las opciones sugeridas del
 * form. Un tipo desconocido cae al fallback capitalizado.
 */
export const DOC_TIPOS: Record<string, string> = {
  contrato: "Contrato",
  tasacion: "Tasación",
  titulo: "Título / Partida registral",
  carta_fianza: "Carta fianza",
  factura: "Factura / Valorización",
  poliza: "Póliza de seguro",
  estado_financiero: "Estado financiero",
  otro: "Otro documento",
};

/**
 * Tipos sugeridos en el selector del form: TODOS los del catálogo, en su orden de
 * declaración. Derivado, no reescrito a mano — la lista paralela hacía que agregar
 * un tipo a DOC_TIPOS lo dejara invisible en el form (o al revés: una opción que se
 * guardaba y después se pintaba con el fallback capitalizado).
 */
export const DOC_TIPOS_SUGERIDOS: readonly string[] = Object.keys(DOC_TIPOS);

/** Etiqueta legible de un tipo de documento (fallback: capitaliza el id). */
export function labelDoc(tipo: string): string {
  const t = tipo.trim();
  if (DOC_TIPOS[t]) return DOC_TIPOS[t];
  const limpio = t.replace(/[_-]+/g, " ");
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Bitácora (portal_eventos_auditoria, 0089) — catálogo para leerla
// ─────────────────────────────────────────────────────────────────────────────
// `accion` y `entidad` son texto abierto en la base: acá viven las etiquetas para
// pintarlas en español y las opciones de los filtros. Mismo criterio que DOC_TIPOS
// (dato de catálogo, no chrome de pantalla). Si aparece una acción sin etiqueta, el
// fallback la muestra legible igual — pero el test `portales-auditoria` avisa,
// porque una bitácora que dice "solicitud_doc_borrado" no la lee un administrador.

/** Qué RECURSO tocó el evento. Orden = el del filtro. */
export const AUDITORIA_ENTIDADES: Record<string, string> = {
  portal_oportunidades: "Operaciones",
  portal_reservas: "Reservas",
  portal_solicitudes: "Solicitudes de financiamiento",
  portal_prestatarios: "Empresas",
  portal_miembros: "Usuarios del portal",
  portal_oportunidad_docs: "Documentos",
  portal_oportunidad_fotos: "Fotos",
  portal_notas: "Notas del asesor",
  portal_prospectos: "Titulares sin cuenta",
  // Eventos de la cuenta de acceso (contraseña, verificación en dos pasos). La fila
  // afectada vive en `auth.users`, no en una tabla portal_*.
  "auth.users": "Cuenta de acceso",
};

/** Qué se HIZO. Redactado en pasado, como se lee una bitácora. */
export const AUDITORIA_ACCIONES: Record<string, string> = {
  oportunidad_creada: "Creó una operación",
  oportunidad_editada: "Editó una operación",
  oportunidad_financiada: "Marcó una operación como financiada",
  reserva_creada: "Registró una reserva",
  // El asesor bloqueó a nombre de un titular (0090). Se distingue de `reserva_creada`
  // a propósito: en la bitácora importa si la abrió el propio inversionista o el staff.
  reserva_creada_por_asesor: "Bloqueó una operación para un titular",
  prospecto_creado: "Registró un titular sin cuenta",
  reserva_confirmada: "Confirmó una reserva",
  reserva_liberada: "Liberó una reserva",
  constancia_descargada: "Descargó una constancia",
  solicitud_creada: "Registró una solicitud",
  solicitud_editada: "Editó una solicitud",
  solicitud_aprobada: "Aprobó una solicitud",
  solicitud_rechazada: "Rechazó una solicitud",
  solicitud_retirada: "Retiró una solicitud",
  solicitud_convertida: "Convirtió una solicitud en operación",
  solicitud_doc_subido: "Subió un documento a una solicitud",
  solicitud_doc_borrado: "Borró un documento de una solicitud",
  doc_subido: "Subió un documento",
  doc_borrado: "Borró un documento",
  foto_subida: "Subió una foto",
  foto_borrada: "Borró una foto",
  prestatario_creado: "Registró una empresa",
  prestatario_editado: "Editó una empresa",
  empresario_cuenta_creada: "Creó el acceso de una empresa",
  usuario_creado: "Creó un usuario",
  usuario_editado: "Editó un usuario",
  // Cuenta de acceso. Mismos verbos que en la bitácora de Efectivo (un solo
  // vocabulario), etiquetados en español llano: nada de "2FA" ni "MFA" en pantalla.
  password_cambiada: "Cambió su contraseña",
  mfa_activado: "Activó la verificación en dos pasos",
  mfa_desactivado: "Desactivó la verificación en dos pasos",
  aviso_seguridad_fallido: "No se pudo enviar el aviso de seguridad",
  nota_creada: "Escribió una nota",
  nota_cerrada: "Cerró una nota",
  nota_reabierta: "Reabrió una nota",
  nota_borrada: "Borró una nota",
};

/** Legible con fallback: sin etiqueta, al menos sin guiones bajos. */
function legible(mapa: Record<string, string>, id: string): string {
  const t = id.trim();
  if (mapa[t]) return mapa[t];
  const limpio = t.replace(/[_-]+/g, " ");
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

/** Etiqueta de una acción de la bitácora. */
export function labelAccionAuditoria(accion: string): string {
  return legible(AUDITORIA_ACCIONES, accion);
}

/** Etiqueta del recurso que tocó un evento de la bitácora. */
export function labelEntidadAuditoria(entidad: string): string {
  return legible(AUDITORIA_ENTIDADES, entidad);
}
