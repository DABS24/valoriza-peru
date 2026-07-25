import type { ReactNode } from "react";
import Link from "next/link";
import { MapPin, ImageOff } from "lucide-react";

import { cn } from "@/lib/cn";
import { PPill } from "@/components/portales/ui/PPill";
import { COPY } from "@/lib/copy";
import { estadoPublicacion } from "@/lib/portales/constants";
import type { OportunidadLite } from "@/lib/portales/data";
import { RiesgoBadge } from "@/components/portales/RiesgoBadge";
import { resumenCard } from "@/lib/portales/oportunidadResumen";

/**
 * Card de una oportunidad (estilo "Luis Capital"): imagen con badge de estado
 * (arriba-izq) + badge de rentabilidad (arriba-der), ubicación con pin, título,
 * badge de riesgo, fila de 3 stats y las acciones. Las diferencias entre
 * verticales se DERIVAN del portal config (resumenCard), no se duplican acá.
 *
 * `acciones` es un slot: el catálogo del cliente pasa "Ver detalle" + "Me
 * interesa"; el admin pasa "Ver"/"Editar". Así la misma card sirve en las dos
 * superficies sin condicionar por rol adentro.
 */
export function OportunidadCard({
  op,
  href,
  acciones,
  aviso,
  mostrarEstado = true,
}: {
  op: OportunidadLite;
  /** Link del título/imagen al detalle. */
  href: string;
  /** Botonera del pie. */
  acciones?: ReactNode;
  /**
   * Slot de AVISO sobre la card, encima de las acciones. Igual criterio que
   * `acciones`: el admin marca acá los datos que le faltan a una operación ya
   * publicada; el catálogo del cliente no lo usa (jamás debe ver intel interna).
   */
  aviso?: ReactNode;
  /** Muestra el badge de estado de publicación (admin sí, catálogo no hace falta). */
  mostrarEstado?: boolean;
}) {
  const T = COPY.portales;
  const est = estadoPublicacion(op.estadoPublicacion);
  const resumen = resumenCard(op, T.cliente.labels.plazoMeses);

  return (
    <article className="flex flex-col overflow-hidden rounded-portal border border-portal-line bg-portal-surface shadow-portal transition hover:-translate-y-0.5 hover:shadow-portal-hover">
      {/* Imagen / portada */}
      <Link href={href} className="relative block aspect-[16/10] overflow-hidden bg-portal-subtle">
        {op.portadaUrl ? (
          // Signed URL temporal de Supabase: next/image no aporta y exigiría
          // configurar remotePatterns. Igual criterio que FileDropzone.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={op.portadaUrl}
            alt={op.titulo}
            className="size-full object-cover transition duration-300 hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1 text-portal-muted">
            <ImageOff className="size-7" aria-hidden />
            <span className="text-xs font-medium">{T.card.sinFoto}</span>
          </div>
        )}
        {mostrarEstado && (
          <span className="absolute left-3 top-3">
            <PPill tone={est.tono}>{est.label}</PPill>
          </span>
        )}
        {resumen.destacadoPct && (
          <span className="absolute right-3 top-3 rounded-chip bg-portal-primary/95 px-3 py-1 text-xs font-bold text-white shadow-portal backdrop-blur-sm">
            {resumen.destacadoPct}
          </span>
        )}
      </Link>

      {/* Cuerpo */}
      <div className="flex flex-1 flex-col p-5">
        {resumen.ubicacion && (
          <p className="flex items-center gap-1 text-xs font-medium text-portal-muted">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{resumen.ubicacion}</span>
          </p>
        )}
        <h3 className="mt-1 font-portal text-lg font-bold leading-snug text-portal-ink line-clamp-2">
          <Link href={href} className="hover:underline">
            {op.titulo}
          </Link>
        </h3>
        {op.prestatario && (
          <>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="min-w-0 truncate font-semibold text-portal-ink">{op.prestatario.nombre}</span>
              <span className="shrink-0 rounded-chip bg-portal-primary-soft px-2 py-0.5 text-[11px] font-bold text-portal-primary-ink">
                {T.card.operacionOrdinal(op.prestatario.ordinal)}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-portal-muted">
              {T.card.trackRecord(op.prestatario.total, op.prestatario.completadas)}
            </p>
          </>
        )}
        {resumen.subtitulo && (
          <p className="mt-1 truncate text-sm text-portal-ink2">{resumen.subtitulo}</p>
        )}
        {op.nivelRiesgo && (
          <div className="mt-3">
            <RiesgoBadge nivel={op.nivelRiesgo} size="sm" />
          </div>
        )}

        {/* Fila de 3 stats (compacta; formato de números vía lib/formatters). */}
        <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-portal-line pt-4">
          {resumen.stats.map((s, i) => (
            <div key={i} className="min-w-0">
              <dt className="truncate text-[10px] font-bold uppercase tracking-wider text-portal-muted">
                {s.label}
              </dt>
              <dd
                className={cn(
                  "mt-0.5 font-portal text-sm font-bold tabular-nums text-portal-ink",
                  s.wrap ? "leading-tight" : "truncate",
                )}
                title={s.value}
              >
                {s.value}
              </dd>
            </div>
          ))}
        </dl>

        {aviso && <div className="mt-4">{aviso}</div>}

        {acciones && <div className="mt-5 flex items-center gap-2">{acciones}</div>}
      </div>
    </article>
  );
}
