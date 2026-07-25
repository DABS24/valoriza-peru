/**
 * ⚠️ BORRADOR LEGAL — el texto que renderiza esta página (COPY.portales.terminos)
 * DEBE revisarlo el abogado de la Fase 0 antes de operar con dinero real. No es una
 * opinión legal y no fue redactado por uno: describe, en español llano, cómo funciona
 * hoy el producto según el código. Nada acá afirma que el portal esté autorizado,
 * registrado o supervisado por ninguna entidad, ni inventa cláusulas, jurisdicción,
 * arbitraje, renuncias de responsabilidad ni plazos. Si el abogado agrega cláusulas
 * de verdad, van al copy — no a este archivo.
 *
 * Es la primera página legal de los portales: hasta ahora el único texto legal era
 * "Operado por Don Gato Servicios SAC" en el pie del PortalShell.
 */
import { PORTALES, type PortalSlug } from "@/lib/portales/config";
import { COPY } from "@/lib/copy";
import { PCard } from "@/components/portales/ui/PCard";

/**
 * Términos del portal (SERVER). PÚBLICO a propósito: un documento legal que solo
 * se puede leer con sesión no cumple su función — quien decide si acepta todavía
 * no tiene cuenta.
 */
export default async function TerminosPage({ portal }: { portal: PortalSlug }) {
  const T = COPY.portales;
  const L = T.terminos;
  const marca = PORTALES[portal].nombreCorto;
  const secciones = L.secciones(marca);

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="font-portal text-2xl font-extrabold tracking-tight text-portal-ink sm:text-3xl">
          {L.titulo}
        </h1>
        <p className="mt-1 text-sm text-portal-muted">{L.sub(marca)}</p>
      </header>

      <div className="space-y-4">
        {secciones.map((s) => (
          <PCard key={s.titulo} as="section">
            <h2 className="font-portal text-lg font-bold text-portal-ink">{s.titulo}</h2>
            <p className="mt-2 text-sm leading-relaxed text-portal-ink2">{s.cuerpo}</p>
          </PCard>
        ))}

        {/* Riesgo: se REUSA el disclaimer y las advertencias que ya existen (SSOT).
            Si cambia la redacción del riesgo, cambia en un solo lugar y llega acá. */}
        <PCard as="section" className="border-portal-danger/30 bg-portal-danger-soft/30">
          <h2 className="font-portal text-lg font-bold text-portal-ink">{L.riesgoTitulo}</h2>
          <p className="mt-2 text-sm leading-relaxed text-portal-ink2">{T.disclaimerCapital}</p>
          <ul className="mt-3 space-y-2">
            {T.cliente.recuperacion.advertencias.map((a) => (
              <li key={a} className="text-sm leading-relaxed text-portal-ink2">
                {a}
              </li>
            ))}
          </ul>
        </PCard>
      </div>

      <p className="mt-6 text-sm text-portal-muted">{L.dudas}</p>
      <p className="mt-2 text-xs text-portal-muted">{T.pieLegal}</p>
    </div>
  );
}
