import {
  Landmark,
  FileText,
  Receipt,
  Package,
  CreditCard,
  ShieldCheck,
  ArrowRightLeft,
  Handshake,
  type LucideIcon,
} from "lucide-react";

import { PCard } from "@/components/portales/ui/PCard";
import { COPY } from "@/lib/copy";
import { toMoneda } from "@/lib/formatters";
import { labelGarantia } from "@/lib/portales/constants";
import { coberturaGarantia, coberturaTexto } from "@/lib/portales/tasas";
import type { GarantiaRow } from "@/lib/portales/data";
import type { PortalMoneda } from "@/lib/portales/config";

/**
 * Ícono por tipo de garantía. Único lugar del mapeo tipo→ícono (los tipos son
 * texto abierto; un desconocido cae al escudo). Complementa GARANTIA_TIPOS
 * (label) en constants: acá solo el ícono, para no acoplar lucide a los datos.
 */
const ICONO_GARANTIA: Record<string, LucideIcon> = {
  hipotecaria: Landmark,
  factoring: Receipt,
  cuentas_por_cobrar: Receipt,
  mobiliaria: Package,
  cheque: CreditCard,
  pagare: FileText,
  aval: ShieldCheck,
  cesion_flujos: ArrowRightLeft,
  mutuo: Handshake,
};

function iconoGarantia(tipo: string): LucideIcon {
  return ICONO_GARANTIA[tipo.trim()] ?? ShieldCheck;
}

/**
 * Sección de SALVAGUARDAS — el centro de confianza de la ficha. Encabeza con el
 * titular de cobertura (X.X× · total en garantías vs monto solicitado) y lista
 * EXPLÍCITAMENTE toda la pila de respaldos (hipoteca + aval + carta fianza…),
 * cada uno con ícono, label, valor estimado, título y descripción. Presentacional:
 * la data llega resuelta y NUNCA trae nada interno (solo garantías públicas).
 */
export function Salvaguardas({
  garantias,
  monto,
  moneda,
}: {
  garantias: GarantiaRow[];
  monto: number | null;
  moneda: PortalMoneda;
}) {
  const T = COPY.portales.cliente.salvaguardas;
  const cobertura = coberturaGarantia(garantias, monto, moneda);
  const vecesTxt = coberturaTexto(cobertura.veces);

  return (
    <PCard>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-portal text-lg font-bold text-portal-ink">
          <ShieldCheck className="size-5 text-portal-positive" aria-hidden />
          {T.titulo}
        </h2>
        {garantias.length > 0 && (
          <span className="rounded-chip bg-portal-positive-soft px-3 py-1 text-xs font-bold text-portal-positive">
            {T.conteo(garantias.length)}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-portal-muted">{T.sub}</p>

      {/* Titular de cobertura */}
      {vecesTxt && monto != null ? (
        <div className="mt-4 rounded-portal-sm border border-portal-positive/30 bg-portal-positive-soft/50 p-4">
          <p className="font-portal text-lg font-extrabold leading-tight text-portal-positive">
            {T.coberturaTitular(vecesTxt)}
          </p>
          <p className="mt-1 text-sm text-portal-ink2">
            {T.coberturaDetalle(
              toMoneda(cobertura.totalGarantias, moneda),
              toMoneda(monto, moneda),
            )}
          </p>
        </div>
      ) : null}

      {/* Pila de salvaguardas */}
      {garantias.length === 0 ? (
        <p className="mt-4 text-sm text-portal-muted">{T.sinGarantias}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {garantias.map((g) => {
            const Icono = iconoGarantia(g.tipo);
            return (
              <li
                key={g.id}
                className="flex items-start gap-3 rounded-portal-sm border border-portal-line bg-portal-subtle/60 p-3.5"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-chip bg-portal-surface text-portal-positive shadow-portal">
                  <Icono className="size-[18px]" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="font-semibold text-portal-ink">{labelGarantia(g.tipo)}</span>
                    {g.valorEstimado != null && (
                      <span className="shrink-0 font-portal text-sm font-bold tabular-nums text-portal-positive">
                        {toMoneda(g.valorEstimado, g.moneda)}
                      </span>
                    )}
                  </div>
                  {g.titulo && (
                    <p className="mt-0.5 text-sm font-medium text-portal-ink2">{g.titulo}</p>
                  )}
                  {g.descripcion && (
                    <p className="mt-0.5 text-sm text-portal-muted">{g.descripcion}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PCard>
  );
}
