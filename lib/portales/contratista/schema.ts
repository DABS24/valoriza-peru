/**
 * Validación server-side del `datos` jsonb de la vertical Contratista. Espejo de
 * los campos de lib/portales/config.ts. Se re-valida en el server antes de
 * escribir: el form del navegador no es autoridad.
 */

import { z } from "zod";

export const contratistaDatosSchema = z.object({
  entidad_estatal: z.string().trim().min(2).max(160),
  tipo_contrato: z.enum(["obra", "bienes", "servicios", "consultoria"]),
  ruc_contratista: z
    .string()
    .trim()
    .regex(/^\d{11}$/, "RUC de 11 dígitos"),
  monto_contrato: z.coerce.number().nonnegative().finite(),
  avance_obra_pct: z.coerce.number().min(0).max(100).optional(),
  plazo_contrato_meses: z.coerce.number().int().positive().optional(),
});

export type ContratistaDatos = z.infer<typeof contratistaDatosSchema>;
