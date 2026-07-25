/**
 * Schemas Zod COMUNES de una oportunidad (campos de lending compartidos por toda
 * vertical) + el ruteo al schema de `datos` de cada portal. Se validan en el
 * server (route handlers) antes de escribir: el navegador no es autoridad.
 */

import { z } from "zod";

import { TELEFONO_REGEX, PLAZO_SOLICITUD_MESES } from "@/lib/portales/constants";
import { contratistaDatosSchema } from "@/lib/portales/contratista/schema";

const numOpc = z.coerce.number().nonnegative().finite().optional();
const intPos = z.coerce.number().int().positive().optional();
const pct = z.coerce.number().min(0).finite().optional();

/** Una garantía (respaldo) de la oportunidad. `tipo` es texto abierto. */
export const garantiaInputSchema = z.object({
  tipo: z.string().trim().min(2).max(60),
  titulo: z.string().trim().max(160).optional().or(z.literal("")),
  descripcion: z.string().trim().max(4000).optional().or(z.literal("")),
  valor_estimado: numOpc,
  moneda: z.enum(["PEN", "USD"]).default("USD"),
});

export type GarantiaInput = z.infer<typeof garantiaInputSchema>;

const nivelRiesgoEnum = z.enum(["bajo", "medio_bajo", "medio", "medio_alto", "alto"]);

/** Campos comunes editables de una oportunidad (sin `datos`, sin garantías). */
export const oportunidadComunSchema = z.object({
  titulo: z.string().trim().min(3).max(160),
  descripcion: z.string().trim().max(8000).optional().or(z.literal("")),
  direccion: z.string().trim().max(200).optional().or(z.literal("")),
  distrito: z.string().trim().max(80).optional().or(z.literal("")),
  ciudad: z.string().trim().max(80).optional().or(z.literal("")),
  moneda: z.enum(["PEN", "USD"]).default("USD"),
  monto_solicitado: numOpc,
  plazo_meses_min: intPos,
  plazo_meses_max: intPos,
  /** Ganancia mensual (%). FUENTE ÚNICA de las tasas; TNA/TEA se derivan (lib/portales/tasas). */
  tasa_mensual: pct,
  /**
   * Comisión de intermediación sobre el monto (%). La paga la EMPRESA: se descuenta
   * de lo que recibe al desembolso, no sale del retorno del inversionista.
   *
   * QUIÉN LA VE (regla real, verificada contra las superficies):
   *   · EMPRESARIO   → SÍ, monto y % (es SU costo, y de eso depende que acepte).
   *   · STAFF        → SÍ (alimenta el KPI de ingresos del admin).
   *   · INVERSIONISTA → NO. No sale de su retorno, así que para su decisión es
   *     ruido; el detalle lo ve en los documentos al firmar. Las superficies de
   *     cliente la devuelven en null (ver `conNotas` en lib/portales/data.ts).
   */
  comision_pct: pct,
  /** Prestatario (contratista) al que pertenece la operación. "" ⇒ ninguno. */
  prestatario_id: z.string().uuid().optional().or(z.literal("")),
  nivel_riesgo: nivelRiesgoEnum.optional(),
  rating: z.string().regex(/^[A-G]$/).optional().or(z.literal("")),
  notas_internas: z.string().trim().max(8000).optional().or(z.literal("")),
  estado_publicacion: z
    .enum(["borrador", "disponible", "reservada", "cerrada"])
    .default("borrador"),
});

export type OportunidadComun = z.infer<typeof oportunidadComunSchema>;

/**
 * Alta/edición de un PRESTATARIO (contratista): registro gestionado por el staff,
 * con su scoring de pagador. `scoring_pago` 0–100; `rating` A–G; `nivel_riesgo` =
 * color de pagador. Se re-valida server-side (el form no es autoridad).
 */
export const prestatarioBodySchema = z.object({
  nombre: z.string().trim().min(2).max(160),
  ruc: z
    .string()
    .trim()
    .regex(/^\d{11}$/)
    .optional()
    .or(z.literal("")),
  nivel_riesgo: nivelRiesgoEnum.optional().or(z.literal("")),
  scoring_pago: z.coerce.number().int().min(0).max(100).optional(),
  rating: z.string().regex(/^[A-G]$/).optional().or(z.literal("")),
  notas_internas: z.string().trim().max(8000).optional().or(z.literal("")),
  estado: z.enum(["activo", "inactivo"]).default("activo"),
});

export type PrestatarioBody = z.infer<typeof prestatarioBodySchema>;

/**
 * Solicitud de financiamiento creada por el EMPRESARIO. Datos mínimos de la petición
 * (monto + plazo obligatorios; descripción opcional). Se re-valida server-side.
 */
export const solicitudBodySchema = z.object({
  monto: z.coerce.number().positive().finite(),
  moneda: z.enum(["PEN", "USD"]).default("USD"),
  // El rango sale de PLAZO_SOLICITUD_MESES: el mismo que el hint y el error que ve
  // el empresario. Si acá dice 120 y la UI promete otra cosa, la UI miente.
  plazo_meses: z.coerce
    .number()
    .int()
    .min(PLAZO_SOLICITUD_MESES.min)
    .max(PLAZO_SOLICITUD_MESES.max),
  descripcion: z.string().trim().max(4000).optional().or(z.literal("")),
});

export type SolicitudBody = z.infer<typeof solicitudBodySchema>;

/**
 * Resolución de una solicitud por el STAFF: aprobar o rechazar (con motivo). La
 * conversión a oportunidad tiene su propio endpoint (no pasa por acá).
 */
export const resolverSolicitudSchema = z.discriminatedUnion("accion", [
  z.object({ accion: z.literal("aprobar") }),
  z.object({ accion: z.literal("rechazar"), motivo: z.string().trim().min(3).max(2000) }),
]);

export type ResolverSolicitud = z.infer<typeof resolverSolicitudSchema>;

/**
 * NOTA interna del staff sobre alguien de su cartera (0086, ampliada en 0090). El
 * sujeto es un CLIENTE con cuenta o un PROSPECTO sin cuenta; el `id` viaja en el
 * body pero NO es autorización: el server verifica que sea de SU cartera antes de
 * escribir. `recordar_en` es la próxima acción (opcional).
 *
 * Unión discriminada a propósito: obliga a decir de qué tipo es el sujeto en vez de
 * adivinarlo por cuál de los dos campos llegó — adivinar es lo que permite mandar
 * los dos y que el server elija el que más le convenga.
 */
export const notaBodySchema = z.object({
  sujeto: z.discriminatedUnion("tipo", [
    z.object({ tipo: z.literal("cliente"), id: z.string().uuid() }),
    z.object({ tipo: z.literal("prospecto"), id: z.string().uuid() }),
  ]),
  texto: z.string().trim().min(1).max(2000),
  recordar_en: z.string().datetime().optional().or(z.literal("")),
});

export type NotaBody = z.infer<typeof notaBodySchema>;

/**
 * Alta de un PROSPECTO: el inversionista que todavía no tiene cuenta, a nombre de
 * quien el asesor bloquea (0090). MÍNIMO nombre + teléfono — el bloqueo se cierra
 * por teléfono y el hold no mueve dinero; el documento se completa después (y es
 * obligatorio de hecho al crear la cuenta). Se re-valida server-side.
 */
export const prospectoBodySchema = z.object({
  nombre: z.string().trim().min(2).max(120),
  telefono: z.string().trim().regex(TELEFONO_REGEX),
  tipo_documento: z.enum(["dni", "ce", "pasaporte", "ruc"]).optional().or(z.literal("")),
  documento: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{6,20}$/)
    .optional()
    .or(z.literal("")),
});

export type ProspectoBody = z.infer<typeof prospectoBodySchema>;

/**
 * BLOQUEO de una oportunidad hecho por el ASESOR a nombre de alguien (0090). O se
 * apunta a un titular que ya existe, o se registra uno nuevo en el mismo acto (el
 * caso real: el asesor cierra por teléfono con alguien que no está en el sistema).
 * Nunca las dos cosas: la unión discriminada lo impide.
 */
export const bloqueoAsesorSchema = z.object({
  oportunidadId: z.string().uuid(),
  titular: z.discriminatedUnion("tipo", [
    z.object({ tipo: z.literal("cliente"), id: z.string().uuid() }),
    z.object({ tipo: z.literal("prospecto"), id: z.string().uuid() }),
    z.object({ tipo: z.literal("nuevo"), datos: prospectoBodySchema }),
  ]),
});

export type BloqueoAsesor = z.infer<typeof bloqueoAsesorSchema>;

/** Cambio de estado de una nota propia: cerrarla o reabrirla. */
export const notaPatchSchema = z.object({ hecha: z.boolean() });

export type NotaPatch = z.infer<typeof notaPatchSchema>;

/**
 * Schema del `datos` jsonb de la vertical. Se mantiene como función (en vez de
 * exportar el schema pelado) porque es el punto donde se rutea por vertical el día
 * que haya más de una: los callers no cambian, solo esta línea.
 */
export function schemaDatosDe() {
  return contratistaDatosSchema;
}

/** Body completo de crear/editar una oportunidad. */
export const oportunidadBodySchema = z.object({
  comun: oportunidadComunSchema,
  datos: z.record(z.unknown()),
  garantias: z.array(garantiaInputSchema).max(20).default([]),
});

export type OportunidadBody = z.infer<typeof oportunidadBodySchema>;
