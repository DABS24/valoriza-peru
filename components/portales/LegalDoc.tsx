import LegalShell from "@/components/portales/LegalShell";

export interface LegalSeccion {
  readonly h: string;
  readonly p: string;
}

/**
 * Renderiza un documento legal desde su estructura en `COPY.legal`. Las tres
 * páginas (privacidad, cookies, libro de reclamaciones) usan esta misma forma:
 * el texto vive en el copy y acá solo se pinta, así el abogado lee todo el
 * contenido legal en un archivo.
 */
export default function LegalDoc({
  titulo,
  intro,
  secciones,
  nota,
}: {
  titulo: string;
  intro: string;
  secciones: readonly LegalSeccion[];
  nota?: string;
}) {
  return (
    <LegalShell titulo={titulo}>
      <p className="text-pretty leading-relaxed text-portal-ink2">{intro}</p>
      {secciones.map((s) => (
        <section key={s.h}>
          <h2 className="text-base font-semibold">{s.h}</h2>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-portal-ink2">{s.p}</p>
        </section>
      ))}
      {nota ? (
        <p className="rounded-portal-sm border border-portal-line bg-portal-surface p-4 text-xs leading-relaxed text-portal-muted">
          {nota}
        </p>
      ) : null}
    </LegalShell>
  );
}
