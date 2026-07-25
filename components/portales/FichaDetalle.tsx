import type { ReactNode } from "react";
import { MapPin, TrendingUp } from "lucide-react";

import { PCard } from "@/components/portales/ui/PCard";
import { PStat } from "@/components/portales/ui/PStat";
import { PPill } from "@/components/portales/ui/PPill";
import { COPY } from "@/lib/copy";
import { toMoneda, toMonedaKpi } from "@/lib/formatters";
import { PORTALES, type CampoDef } from "@/lib/portales/config";
import { tasasDerivadas, pctTasa, gananciaAlPlazo, coberturaGarantia, coberturaTexto } from "@/lib/portales/tasas";
import type { OportunidadFull } from "@/lib/portales/data";
import { RiesgoBadge } from "@/components/portales/RiesgoBadge";
import { MetodologiaRiesgo } from "@/components/portales/MetodologiaRiesgo";
import { GaleriaFotos } from "@/components/portales/GaleriaFotos";
import { Salvaguardas } from "@/components/portales/Salvaguardas";
import { RiesgosMitigacion } from "@/components/portales/RiesgosMitigacion";
import { RecuperacionImpago } from "@/components/portales/RecuperacionImpago";
import { FlujoDinero } from "@/components/portales/FlujoDinero";
import { DocsRespaldo } from "@/components/portales/DocsRespaldo";
import { SimuladorInversion } from "@/components/portales/SimuladorInversion";
import { numDato, strDato, labelOpcion, plazoTexto, conSufijo } from "@/lib/portales/oportunidadResumen";

/** Formatea el valor de un campo de la ficha según su tipo. null si vacío. */
function valorCampo(op: OportunidadFull, campo: CampoDef): string | null {
  const raw = op.datos[campo.key];
  if (campo.tipo === "select") return labelOpcion(op.portal, campo.key, raw);
  if (campo.tipo === "texto") return strDato(raw);
  const n = numDato(raw);
  if (n == null) return null;
  if (campo.tipo === "moneda") return toMoneda(n, op.moneda);
  if (campo.tipo === "porcentaje") return `${n}%`;
  return conSufijo(n, campo.sufijo);
}

/** Rango de ganancia al plazo como texto: min→max si hay rango, o un solo valor. */
function rangoGanancia(
  monto: number,
  tasaMensual: number,
  plazoMin: number | null,
  plazoMax: number | null,
  fmt: (n: number) => string,
): string | null {
  const base = plazoMin ?? plazoMax;
  if (base == null) return null;
  const gBase = gananciaAlPlazo(monto, tasaMensual, base);
  if (plazoMin != null && plazoMax != null && plazoMin !== plazoMax) {
    const gMax = gananciaAlPlazo(monto, tasaMensual, plazoMax);
    return `${fmt(gBase.gananciaMonto)} – ${fmt(gMax.gananciaMonto)}`;
  }
  return fmt(gBase.gananciaMonto);
}

/** Rango de % de ganancia al plazo (min→max si hay rango). */
function rangoGananciaPct(
  tasaMensual: number,
  plazoMin: number | null,
  plazoMax: number | null,
): string | null {
  const base = plazoMin ?? plazoMax;
  if (base == null) return null;
  const pctBase = pctTasa(tasaMensual * base);
  if (plazoMin != null && plazoMax != null && plazoMin !== plazoMax) {
    return `${pctTasa(tasaMensual * plazoMin)} – ${pctTasa(tasaMensual * plazoMax)}`;
  }
  return pctBase;
}

/**
 * Ficha rica de una oportunidad, compartida por el detalle del cliente y el del
 * admin. `mostrarInternas` agrega las notas solo-staff; `acciones` es el pie
 * (Me interesa / Editar); `lateralTop` es un slot arriba de la columna lateral
 * (ej. el timeline post-reserva). Los montos SIEMPRE por lib/formatters + Stat.
 *
 * Jerarquía pensada para CONFIANZA: las SALVAGUARDAS suben a la columna principal
 * (centro de confianza), y las condiciones financieras LIDERAN con la ganancia al
 * plazo (no con la TEA, que se degrada a "equivalente anual").
 */
export function FichaDetalle({
  op,
  mostrarInternas = false,
  acciones,
  lateralTop,
}: {
  op: OportunidadFull;
  mostrarInternas?: boolean;
  acciones?: ReactNode;
  lateralTop?: ReactNode;
}) {
  const T = COPY.portales;
  const cfg = PORTALES[op.portal];
  const L = T.cliente.labels;
  const ubicacion = [op.direccion, op.distrito, op.ciudad].filter(Boolean).join(", ");
  const plazo = plazoTexto(op.plazoMesesMin, op.plazoMesesMax, L.plazoMeses);
  const esRango =
    op.plazoMesesMin != null && op.plazoMesesMax != null && op.plazoMesesMin !== op.plazoMesesMax;
  const plazoBase = op.plazoMesesMin ?? op.plazoMesesMax;
  const derivadas = op.tasaMensual != null ? tasasDerivadas(op.tasaMensual) : null;

  // Ganancia AL PLAZO (lidera). Solo si hay monto + tasa + plazo.
  const hayGanancia = op.montoSolicitado != null && op.tasaMensual != null && plazoBase != null;
  const gananciaMontoTxt = hayGanancia
    ? rangoGanancia(op.montoSolicitado!, op.tasaMensual!, op.plazoMesesMin, op.plazoMesesMax, (n) =>
        toMoneda(n, op.moneda),
      )
    : null;
  const gananciaPctTxt = hayGanancia
    ? rangoGananciaPct(op.tasaMensual!, op.plazoMesesMin, op.plazoMesesMax)
    : null;

  // Cobertura de garantía (stat).
  const cobertura = coberturaGarantia(op.garantias, op.montoSolicitado);
  const coberturaVecesTxt = coberturaTexto(cobertura.veces);


  // Stats secundarias (monto, cobertura, LTV, plazo).
  const stats: { label: string; value: string; tone?: "ink" | "positive" | "primary"; title?: string; wrap?: boolean }[] = [];
  if (op.montoSolicitado != null)
    stats.push({
      label: L.montoSolicitado,
      value: toMonedaKpi(op.montoSolicitado, op.moneda),
      tone: "ink",
      title: toMoneda(op.montoSolicitado, op.moneda),
    });
  if (coberturaVecesTxt)
    stats.push({
      label: L.coberturaCubre,
      value: coberturaVecesTxt,
      tone: "positive",
      title: toMoneda(cobertura.totalGarantias, op.moneda),
    });
  if (plazo) stats.push({ label: L.plazo, value: plazo, tone: "ink", wrap: true });

  const campos = cfg.campos
    .map((c) => ({ campo: c, valor: valorCampo(op, c) }))
    .filter((x) => x.valor != null);

  const riesgosOverride = strDato(op.datos.riesgos);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* Columna principal */}
      <div className="space-y-6 lg:col-span-3">
        <div>
          <h1 className="font-portal text-2xl font-extrabold tracking-tight text-portal-ink sm:text-3xl">
            {op.titulo}
          </h1>
          {op.prestatario && (
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="font-semibold text-portal-ink">{op.prestatario.nombre}</span>
              <span className="rounded-chip bg-portal-primary-soft px-2 py-0.5 text-[11px] font-bold text-portal-primary-ink">
                {T.card.operacionOrdinal(op.prestatario.ordinal)}
              </span>
              <span className="text-portal-muted">
                {T.card.trackRecord(op.prestatario.total, op.prestatario.completadas)}
              </span>
            </p>
          )}
          {ubicacion && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-portal-muted">
              <MapPin className="size-4 shrink-0" aria-hidden />
              {ubicacion}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {op.nivelRiesgo && <RiesgoBadge nivel={op.nivelRiesgo} />}
            {op.rating && <PPill tone="navy">{`${T.cliente.ratingLabel}: ${op.rating}`}</PPill>}
          </div>
          {(op.nivelRiesgo || op.rating) && (
            <div className="mt-3">
              <MetodologiaRiesgo nivel={op.nivelRiesgo} rating={op.rating} />
            </div>
          )}
        </div>

        <GaleriaFotos
          fotos={op.fotos.filter((f) => f.garantiaId == null).map((f) => ({ id: f.id, url: f.url }))}
          alt={op.titulo}
        />

        {op.descripcion && (
          <PCard>
            <h2 className="font-portal text-lg font-bold text-portal-ink">{T.cliente.detalleTitulo}</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-portal-ink2">
              {op.descripcion}
            </p>
          </PCard>
        )}

        {/* SALVAGUARDAS — centro de confianza (elevado a la columna principal). */}
        <Salvaguardas garantias={op.garantias} monto={op.montoSolicitado} moneda={op.moneda} />

        {/* Riesgos y cómo los mitigamos. */}
        <RiesgosMitigacion portal={op.portal} riesgosOverride={riesgosOverride} />

        {/* Qué pasa si el deudor no paga: el proceso de recuperación (por vertical). */}
        <RecuperacionImpago portal={op.portal} />

        {/* Documentos de respaldo (data room), solo si hay. */}
        {op.docs.length > 0 && <DocsRespaldo docs={op.docs} />}
      </div>

      {/* Columna lateral */}
      <div className="space-y-6 lg:col-span-2">
        {lateralTop}

        <PCard>
          <h2 className="font-portal text-lg font-bold text-portal-ink">{T.cliente.financierosTitulo}</h2>

          {/* Ganancia estimada AL PLAZO — lidera. */}
          {gananciaMontoTxt && (
            <div className="mt-4 rounded-portal-sm border border-portal-positive/30 bg-portal-positive-soft/50 p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-portal-positive">
                <TrendingUp className="size-4" aria-hidden />
                {L.gananciaAlPlazo}
              </p>
              <p className="mt-1 font-portal text-2xl font-extrabold tabular-nums text-portal-positive">
                {gananciaMontoTxt}
              </p>
              {gananciaPctTxt && (
                <p className="text-sm font-bold text-portal-positive">+{gananciaPctTxt}</p>
              )}
              {op.montoSolicitado != null && plazo && (
                <p className="mt-1 text-xs text-portal-ink2">
                  {L.gananciaAlPlazoSobre(toMoneda(op.montoSolicitado, op.moneda), plazo)}
                </p>
              )}
            </div>
          )}

          {stats.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {stats.map((s, i) => (
                <PStat key={i} label={s.label} value={s.value} tone={s.tone} title={s.title} wrap={s.wrap} />
              ))}
            </div>
          )}

          {/* Equivalente anual (secundario) — TNA/TEA no se ganan en el plazo corto. */}
          {derivadas && (
            <div className="mt-4 rounded-portal-sm border border-portal-line bg-portal-subtle/50 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-portal-muted">
                {L.equivalenteAnual}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                <span className="text-portal-ink2">
                  {T.cliente.labels.tna}: <span className="font-bold tabular-nums text-portal-ink">{pctTasa(derivadas.tnaPct)}</span>
                </span>
                <span className="text-portal-ink2">
                  {T.cliente.labels.tea}: <span className="font-bold tabular-nums text-portal-ink">{pctTasa(derivadas.teaPct)}</span>
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-portal-muted">{L.equivalenteAnualNota}</p>
            </div>
          )}
        </PCard>

        {/* Simulador de inversión. */}
        <SimuladorInversion
          montoSolicitado={op.montoSolicitado}
          tasaMensual={op.tasaMensual}
          plazoMeses={plazoBase}
          moneda={op.moneda}
          plazoTexto={plazo}
          esRango={esRango}
        />

        {campos.length > 0 && (
          <PCard>
            <h2 className="font-portal text-lg font-bold text-portal-ink">{T.cliente.fichaTitulo}</h2>
            <dl className="mt-3 divide-y divide-portal-line">
              {campos.map(({ campo, valor }) => (
                <div key={campo.key} className="flex items-start justify-between gap-4 py-2.5">
                  <dt className="text-sm text-portal-muted">{campo.label}</dt>
                  <dd className="text-right text-sm font-semibold text-portal-ink">{valor}</dd>
                </div>
              ))}
            </dl>
          </PCard>
        )}

        {mostrarInternas && op.notasInternas && (
          <PCard className="border-portal-warning/30 bg-portal-warning-soft/40">
            <h2 className="font-portal text-base font-bold text-portal-ink">
              {T.admin.oportunidades.form.notasInternas}
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm text-portal-ink2">{op.notasInternas}</p>
          </PCard>
        )}

        {/* Cómo funciona el dinero: con quién firma y a quién transfiere. Va pegado
            al bloque de reserva a propósito —es lo que hay que entender ANTES de
            apretar el botón—. Solo en la superficie del inversionista: en la ficha
            del admin el texto de la otra parte sería ruido. */}
        {!mostrarInternas && <FlujoDinero faceta="inversionista" />}

        {/* Disclaimer de capital en riesgo (SSOT). */}
        <div className="rounded-portal-sm border border-portal-line bg-portal-subtle/50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-portal-muted">{T.disclaimerTitulo}</p>
          <p className="mt-1 text-xs leading-relaxed text-portal-ink2">{T.disclaimerCapital}</p>
        </div>

        {acciones && <div className="flex flex-col gap-2">{acciones}</div>}
      </div>
    </div>
  );
}
