import "server-only";

import { COPY } from "@/lib/copy";
import { toDateTime, toMoneda } from "@/lib/formatters";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPortalMiembro } from "@/lib/portales/guards";
import {
  PORTALES,
  type PortalMoneda,
  type PortalNivelRiesgo,
  type PortalSlug,
} from "@/lib/portales/config";
import { acentoPortalRgb } from "@/lib/portales/tema";
import { labelGarantia, nivelRiesgo } from "@/lib/portales/constants";
import { coberturaGarantia, coberturaTexto, gananciaAlPlazo, pctTasa, tasasDerivadas } from "@/lib/portales/tasas";
import { labelOpcion, numDato, strDato, plazoTexto, conSufijo } from "@/lib/portales/oportunidadResumen";
import type { ReporteData, ReporteSeccion } from "@/lib/pdf/reporteUsuario";

/**
 * CONSTANCIA DE RESERVA del inversionista (PDF). Arma el `ReporteData` que
 * consume el generador compartido `lib/pdf/reporteUsuario` — el mismo motor del
 * legajo de Efectivo, sin duplicar nada de layout/paginación.
 *
 * Qué es y qué NO es: la reserva de estos portales aparta la operación 24 h SIN
 * mover dinero. Por eso el documento se llama constancia de RESERVA, lleva el
 * bloque `avisos` (no es contrato, no es comprobante de pago) y el pie dice lo
 * mismo. Un PDF con membrete que no aclare eso se confundiría con un título.
 *
 * Seguridad (§1): el cliente NO lee `portal_oportunidades` por RLS, así que se usa
 * el admin client REIMPLEMENTANDO la autorización a mano — la reserva se busca
 * SIEMPRE acotada a `cliente_id = usuario`. Un id ajeno o inexistente devuelve
 * null y el route responde 404 uniforme (anti-enumeración). Columnas EXPLÍCITAS:
 * nunca `notas_internas`, `scoring_pago` ni `comision_pct`.
 */

type Row = Record<string, string | null>;

/** Fila del resumen del PDF, omitiendo las que no tienen valor. */
function par(label: string, valor: string | null): { label: string; valor: string } | null {
  return valor ? { label, valor } : null;
}

/**
 * Constancia de la reserva del usuario sobre `oportunidadId` en `portal`, o null
 * si no es miembro activo o la reserva no es suya.
 */
export async function constanciaReserva(
  portal: PortalSlug,
  oportunidadId: string,
): Promise<ReporteData | null> {
  const miembro = await getPortalMiembro(portal);
  if (!miembro) return null;

  const T = COPY.portales.cliente.constancia;
  const L = COPY.portales.cliente.labels;
  const cfg = PORTALES[portal];
  const admin = createAdminClient();

  // Reserva ACOTADA al dueño: la autorización va DENTRO de la query, no después.
  const { data: reservaRow } = await admin
    .from("portal_reservas")
    .select("id, oportunidad_id, estado, reservado_en, vence_en, resuelto_en")
    .eq("portal", portal)
    .eq("cliente_id", miembro.userId)
    .eq("oportunidad_id", oportunidadId)
    .order("reservado_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!reservaRow) return null;
  const reserva = reservaRow as Row;

  // Columnas públicas EXPLÍCITAS de la operación.
  const { data: opRow } = await admin
    .from("portal_oportunidades")
    .select(
      "id, titulo, moneda, monto_solicitado, tasa_mensual, plazo_meses_min, plazo_meses_max, nivel_riesgo, rating, direccion, distrito, ciudad, datos",
    )
    .eq("id", oportunidadId)
    .eq("portal", portal)
    .maybeSingle();
  if (!opRow) return null;
  const op = opRow as unknown as Record<string, unknown>;

  const { data: garantiasRows } = await admin
    .from("portal_garantias")
    .select("id, tipo, titulo, descripcion, valor_estimado, moneda, orden")
    .eq("oportunidad_id", oportunidadId)
    // Mismo criterio que la ficha (`orden`), no created_at: la pila de respaldos
    // se lee en el orden que definió el staff.
    .order("orden", { ascending: true });
  const garantias = (garantiasRows as unknown as Record<string, unknown>[]) ?? [];

  const moneda = ((op.moneda as PortalMoneda) ?? "PEN") as PortalMoneda;
  const monto = op.monto_solicitado != null ? Number(op.monto_solicitado) : null;
  const tasa = op.tasa_mensual != null ? Number(op.tasa_mensual) : null;
  const plazoMin = (op.plazo_meses_min as number | null) ?? null;
  const plazoMax = (op.plazo_meses_max as number | null) ?? null;
  const plazoBase = plazoMin ?? plazoMax;
  const plazo = plazoTexto(plazoMin, plazoMax, L.plazoMeses);
  const estado = reserva.estado as keyof typeof COPY.portales.historial.estados;

  // ── RESUMEN (lo primero que se lee) ──
  const cobertura = coberturaGarantia(
    garantias.map((g) => ({
      valorEstimado: g.valor_estimado != null ? Number(g.valor_estimado) : null,
    })),
    monto,
  );
  const ganancia =
    monto != null && tasa != null && plazoBase != null
      ? gananciaAlPlazo(monto, tasa, plazoBase)
      : null;
  const derivadas = tasa != null ? tasasDerivadas(tasa) : null;

  const resumen = [
    par(T.resumen.estado, COPY.portales.historial.estados[estado] ?? null),
    par(T.resumen.codigo, (reserva.id ?? "").slice(0, 8).toUpperCase() || null),
    par(T.resumen.reservadaEl, reserva.reservado_en ? toDateTime(reserva.reservado_en) : null),
    par(
      reserva.resuelto_en ? T.resumen.resueltaEl : T.resumen.venceEl,
      reserva.resuelto_en
        ? toDateTime(reserva.resuelto_en)
        : reserva.vence_en
          ? toDateTime(reserva.vence_en)
          : null,
    ),
    par(L.montoSolicitado, monto != null ? toMoneda(monto, moneda) : null),
    par(L.plazo, plazo),
    par(L.tasa, tasa != null ? `${pctTasa(tasa)} ${L.gananciaMensual.toLowerCase()}` : null),
    par(L.gananciaAlPlazo, ganancia ? toMoneda(ganancia.gananciaMonto, moneda) : null),
    par(L.coberturaCubre, coberturaTexto(cobertura.veces)),
    par(L.tea, derivadas ? pctTasa(derivadas.teaPct) : null),
  ].filter((x): x is { label: string; valor: string } => x != null);

  // ── Detalle de la operación (dato / valor), incluidos los campos de la vertical ──
  const filasOperacion: string[][] = [];
  const agregar = (dato: string, valor: string | null) => {
    if (valor) filasOperacion.push([dato, valor]);
  };
  agregar(T.operacionLabels.titulo, (op.titulo as string) ?? null);
  agregar(T.operacionLabels.portal, cfg.nombre);
  agregar(
    T.operacionLabels.ubicacion,
    [op.direccion, op.distrito, op.ciudad].filter(Boolean).join(", ") || null,
  );
  agregar(T.operacionLabels.moneda, moneda);
  agregar(
    T.operacionLabels.nivelRiesgo,
    nivelRiesgo(op.nivel_riesgo as PortalNivelRiesgo | null)?.label ?? null,
  );
  agregar(T.operacionLabels.rating, (op.rating as string | null) ?? null);
  // Campos propios de la vertical (mismo catálogo que pinta la ficha).
  const datos = (op.datos as Record<string, unknown> | null) ?? {};
  for (const campo of cfg.campos) {
    const raw = datos[campo.key];
    if (campo.tipo === "select") {
      agregar(campo.label, labelOpcion(portal, campo.key, raw));
      continue;
    }
    if (campo.tipo === "texto") {
      agregar(campo.label, strDato(raw));
      continue;
    }
    const n = numDato(raw);
    if (n == null) continue;
    if (campo.tipo === "moneda") agregar(campo.label, toMoneda(n, moneda));
    else if (campo.tipo === "porcentaje") agregar(campo.label, `${n}%`);
    else agregar(campo.label, conSufijo(n, campo.sufijo));
  }

  const secciones: ReporteSeccion[] = [
    {
      titulo: T.seccionOperacion,
      columnas: [T.colDato, T.colValor],
      anchos: [4, 6],
      filas: filasOperacion,
    },
    {
      titulo: T.seccionGarantias,
      columnas: [T.colGarantia, T.colDescripcion, T.colValorEstimado],
      anchos: [3, 5, 2],
      align: ["l", "l", "r"],
      vacio: T.sinGarantias,
      filas: garantias.map((g) => [
        labelGarantia(String(g.tipo ?? "")),
        [g.titulo, g.descripcion].filter(Boolean).join(" — ") || "—",
        g.valor_estimado != null
          ? toMoneda(Number(g.valor_estimado), (g.moneda as PortalMoneda) ?? moneda)
          : "—",
      ]),
    },
  ];

  return {
    marca: cfg.nombre,
    titulo: T.titulo,
    facetaLabel: T.faceta,
    generadoEl: toDateTime(new Date()),
    persona: {
      nombre: miembro.nombre,
      sub: `${T.faceta} · ${cfg.nombre}`,
    },
    resumen,
    secciones,
    notas: {
      titulo: T.avisosTitulo,
      // El disclaimer de capital en riesgo se REUSA del SSOT del portal, no se
      // reescribe: si cambia la redacción legal, cambia en un solo lugar.
      parrafos: [...T.avisos, COPY.portales.disclaimerCapital],
    },
    pieNota: T.pieNota,
    acento: acentoPortalRgb(portal),
  };
}
