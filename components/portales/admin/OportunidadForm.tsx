"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, ImagePlus, X, FileText, FilePlus } from "lucide-react";

import { PButton } from "@/components/portales/ui/PButton";
import { PCard } from "@/components/portales/ui/PCard";
import { Dialog } from "@/components/ui/Dialog";
import { PInput, PSelect, PTextarea } from "@/components/portales/ui/PField";
import { COPY } from "@/lib/copy";
import { ArchivoError } from "@/lib/files";
import { toFileSize } from "@/lib/formatters";
import { PORTALES, type PortalSlug, type CampoDef } from "@/lib/portales/config";
import {
  NIVELES_RIESGO,
  ESTADOS_PUBLICACION,
  RATINGS,
  labelGarantia,
  DOC_TIPOS_SUGERIDOS,
  labelDoc,
} from "@/lib/portales/constants";
import { tasasDerivadas, pctTasa } from "@/lib/portales/tasas";
import { subirFotoPortal, borrarFotoPortal, type FotoPortalRef } from "@/lib/portales/fotos-client";
import { subirDocPortal, borrarDocPortal, type DocPortalRef } from "@/lib/portales/docs-client";
import type { OportunidadFull, PrestatarioOpcion } from "@/lib/portales/data";
import { basePortal } from "@/lib/portales/rutas";

const OTRO = "__otro__";

interface GarantiaForm {
  tipo: string;
  tipoOtro: string;
  titulo: string;
  descripcion: string;
  valor: string;
  moneda: "PEN" | "USD";
}

/** Convierte el jsonb datos a un mapa de strings para los inputs. */
function datosAStrings(datos: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(datos)) out[k] = v == null ? "" : String(v);
  return out;
}

export function OportunidadForm({
  portal,
  oportunidadId = null,
  inicial,
  prestatarios = [],
}: {
  portal: PortalSlug;
  oportunidadId?: string | null;
  inicial?: OportunidadFull;
  /** Opciones de prestatario (solo verticales con prestatarios). */
  prestatarios?: PrestatarioOpcion[];
}) {
  const T = COPY.portales.admin.oportunidades;
  const F = T.form;
  const cfg = PORTALES[portal];
  const router = useRouter();
  const base = basePortal(portal);
  const editando = !!oportunidadId;
  const usaPrestatarios = !!cfg.prestatarios;

  // ── Campos comunes ──
  const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? "");
  const [direccion, setDireccion] = useState(inicial?.direccion ?? "");
  const [distrito, setDistrito] = useState(inicial?.distrito ?? "");
  const [ciudad, setCiudad] = useState(inicial?.ciudad ?? "");
  const [moneda, setMoneda] = useState<"PEN" | "USD">(inicial?.moneda ?? "USD");
  const [monto, setMonto] = useState(inicial?.montoSolicitado?.toString() ?? "");
  const [plazoMin, setPlazoMin] = useState(inicial?.plazoMesesMin?.toString() ?? "");
  const [plazoMax, setPlazoMax] = useState(inicial?.plazoMesesMax?.toString() ?? "");
  const [tasaMensual, setTasaMensual] = useState(inicial?.tasaMensual?.toString() ?? "");
  const [comision, setComision] = useState(inicial?.comisionPct?.toString() ?? "");

  // ── Prestatario (contratista) ──
  const [opciones, setOpciones] = useState<PrestatarioOpcion[]>(prestatarios);
  const [prestatarioId, setPrestatarioId] = useState(inicial?.prestatarioId ?? "");
  const [crearPrestAbierto, setCrearPrestAbierto] = useState(false);

  // ── Riesgo ──
  const [nivelRiesgo, setNivelRiesgo] = useState(inicial?.nivelRiesgo ?? "");
  const [rating, setRating] = useState(inicial?.rating ?? "");
  const [notas, setNotas] = useState(inicial?.notasInternas ?? "");
  const [estado, setEstado] = useState(inicial?.estadoPublicacion ?? "borrador");

  // ── Datos específicos de la vertical ──
  const [datos, setDatos] = useState<Record<string, string>>(datosAStrings(inicial?.datos ?? {}));
  const setCampo = (key: string, val: string) => setDatos((d) => ({ ...d, [key]: val }));

  // ── Garantías ──
  const [garantias, setGarantias] = useState<GarantiaForm[]>(
    (inicial?.garantias ?? []).map((g) => {
      const conocido = cfg.garantiasSugeridas.includes(g.tipo);
      return {
        tipo: conocido ? g.tipo : OTRO,
        tipoOtro: conocido ? "" : g.tipo,
        titulo: g.titulo ?? "",
        descripcion: g.descripcion ?? "",
        valor: g.valorEstimado?.toString() ?? "",
        moneda: g.moneda,
      };
    }),
  );
  const agregarGarantia = () =>
    setGarantias((g) => [
      ...g,
      {
        tipo: cfg.garantiasSugeridas[0] ?? OTRO,
        tipoOtro: "",
        titulo: "",
        descripcion: "",
        valor: "",
        moneda,
      },
    ]);
  const quitarGarantia = (i: number) => setGarantias((g) => g.filter((_, idx) => idx !== i));
  const setGarantia = (i: number, patch: Partial<GarantiaForm>) =>
    setGarantias((g) => g.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  // ── Fotos (solo cuando la oportunidad ya existe) ──
  const [fotos, setFotos] = useState<FotoPortalRef[]>(
    (inicial?.fotos ?? [])
      .filter((f) => f.garantiaId == null)
      .map((f) => ({ id: f.id, path: f.path, orden: f.orden, url: f.url })),
  );
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  // ── Documentos de respaldo (data room; solo cuando la oportunidad ya existe) ──
  const [docs, setDocs] = useState<DocPortalRef[]>(
    (inicial?.docs ?? []).map((d) => ({
      id: d.id,
      tipo: d.tipo,
      nombre: d.nombre,
      bytes: d.bytes,
      mime: d.mime,
      orden: d.orden,
      url: d.url,
    })),
  );
  const [docTipo, setDocTipo] = useState(DOC_TIPOS_SUGERIDOS[0]);
  const [subiendoDoc, setSubiendoDoc] = useState(false);

  const [guardando, setGuardando] = useState(false);

  async function onFoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !oportunidadId || subiendoFoto) return;
    setSubiendoFoto(true);
    try {
      // El `orden` ya no viaja desde acá: lo calcula el server (append al final).
      const ref = await subirFotoPortal({ oportunidadId, file });
      if (!ref) return void toast.error(COPY.portales.comun.error);
      setFotos((f) => [...f, ref]);
    } catch (err) {
      toast.error(err instanceof ArchivoError ? err.message : COPY.portales.comun.error);
    } finally {
      setSubiendoFoto(false);
    }
  }

  async function quitarFoto(f: FotoPortalRef) {
    if (subiendoFoto || !oportunidadId) return;
    const ok = await borrarFotoPortal(oportunidadId, f.id);
    if (!ok) return void toast.error(COPY.portales.comun.error);
    setFotos((prev) => prev.filter((x) => x.id !== f.id));
  }

  async function onDoc(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !oportunidadId || subiendoDoc) return;
    if (!docTipo || docTipo.trim().length < 2) return void toast.error(F.docTipoFalta);
    setSubiendoDoc(true);
    try {
      const ref = await subirDocPortal({ oportunidadId, tipo: docTipo, file });
      if (!ref) return void toast.error(F.docError);
      setDocs((d) => [...d, ref]);
    } catch (err) {
      toast.error(err instanceof ArchivoError ? err.message : F.docError);
    } finally {
      setSubiendoDoc(false);
    }
  }

  async function quitarDoc(d: DocPortalRef) {
    if (subiendoDoc || !oportunidadId) return;
    const ok = await borrarDocPortal(oportunidadId, d.id);
    if (!ok) return void toast.error(COPY.portales.comun.error);
    setDocs((prev) => prev.filter((x) => x.id !== d.id));
  }

  function construirBody() {
    return {
      comun: {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        direccion: direccion.trim(),
        distrito: distrito.trim(),
        ciudad: ciudad.trim(),
        moneda,
        monto_solicitado: monto || undefined,
        plazo_meses_min: plazoMin || undefined,
        plazo_meses_max: plazoMax || undefined,
        tasa_mensual: tasaMensual || undefined,
        comision_pct: comision || undefined,
        prestatario_id: usaPrestatarios && prestatarioId ? prestatarioId : undefined,
        nivel_riesgo: nivelRiesgo || undefined,
        rating: rating || undefined,
        notas_internas: notas.trim(),
        estado_publicacion: estado,
      },
      datos: Object.fromEntries(Object.entries(datos).filter(([, v]) => v !== "")),
      garantias: garantias.map((g) => ({
        tipo: (g.tipo === OTRO ? g.tipoOtro.trim() : g.tipo) || "otro",
        titulo: g.titulo.trim() || undefined,
        descripcion: g.descripcion.trim() || undefined,
        valor_estimado: g.valor || undefined,
        moneda: g.moneda,
      })),
    };
  }

  async function guardar() {
    if (guardando) return;
    if (titulo.trim().length < 3) return void toast.error(F.faltaTitulo);
    // Campos obligatorios de la vertical.
    const faltante = cfg.campos.some((c) => c.requerido && !datos[c.key]?.trim());
    if (faltante) return void toast.error(F.faltaCampoVertical);

    setGuardando(true);
    try {
      const url = editando ? `/api/oportunidades/${oportunidadId}` : `/api/oportunidades`;
      const res = await fetch(url, {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(construirBody()),
      });
      const payload = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok) {
        // Republicar una operación con contraparte vigente no es una falla técnica:
        // es una regla del modelo. Se explica, no se muestra "no se pudo guardar".
        toast.error(payload.error === "reserva_viva" ? F.reservaViva : T.errorGuardar);
        return;
      }
      if (editando) {
        toast.success(T.actualizada);
        router.refresh();
      } else {
        // Recién creada: vamos a su edición para poder cargar fotos.
        toast.success(T.creada);
        router.push(`${base}/admin/oportunidades/${payload.id}`);
      }
    } catch {
      toast.error(T.errorGuardar);
    } finally {
      setGuardando(false);
    }
  }

  // Preview vivo de TNA/TEA a partir de la ganancia mensual.
  const mensualNum = Number(tasaMensual);
  const tasasPreview =
    tasaMensual.trim() !== "" && Number.isFinite(mensualNum) && mensualNum >= 0
      ? (() => {
          const d = tasasDerivadas(mensualNum);
          return F.tasasPreview
            .replace("{tna}", pctTasa(d.tnaPct) ?? "—")
            .replace("{tea}", pctTasa(d.teaPct) ?? "—");
        })()
      : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-portal text-2xl font-bold text-portal-ink sm:text-3xl">
        {editando ? F.editarTitulo : F.nuevaTitulo}
      </h1>

      {/* Generales */}
      <PCard className="space-y-4">
        <h2 className="font-portal text-lg font-bold text-portal-ink">{F.seccionGeneral}</h2>
        <PInput
          label={F.titulo}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          requiredMark
        />
        <PTextarea
          label={F.descripcion}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PInput
            label={F.direccion}
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
          />
          <PInput
            label={F.distrito}
            value={distrito}
            onChange={(e) => setDistrito(e.target.value)}
          />
          <PInput label={F.ciudad} value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
          <PSelect
            label={F.moneda}
            value={moneda}
            onChange={(e) => setMoneda(e.target.value as "PEN" | "USD")}
          >
            <option value="USD">USD</option>
            <option value="PEN">PEN</option>
          </PSelect>
        </div>
      </PCard>

      {/* Financiero */}
      <PCard className="space-y-4">
        <h2 className="font-portal text-lg font-bold text-portal-ink">{F.seccionFinanciero}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PInput
            label={F.montoSolicitado}
            type="number"
            inputMode="decimal"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
          />
          <PInput
            label={F.tasaMensual}
            type="number"
            inputMode="decimal"
            hint={tasasPreview ?? F.tasaMensualHint}
            value={tasaMensual}
            onChange={(e) => setTasaMensual(e.target.value)}
          />
          <PInput
            label={F.plazoMin}
            type="number"
            inputMode="numeric"
            value={plazoMin}
            onChange={(e) => setPlazoMin(e.target.value)}
          />
          <PInput
            label={F.plazoMax}
            type="number"
            inputMode="numeric"
            value={plazoMax}
            onChange={(e) => setPlazoMax(e.target.value)}
          />
          <PInput
            label={F.comision}
            type="number"
            inputMode="decimal"
            hint={F.comisionHint}
            value={comision}
            onChange={(e) => setComision(e.target.value)}
          />
        </div>
      </PCard>

      {/* Prestatario (contratista) */}
      {usaPrestatarios && (
        <PCard className="space-y-4">
          <h2 className="font-portal text-lg font-bold text-portal-ink">{F.seccionPrestatario}</h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <PSelect
                label={F.prestatario}
                value={prestatarioId}
                onChange={(e) => setPrestatarioId(e.target.value)}
              >
                <option value="">{F.prestatarioSin}</option>
                {opciones.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </PSelect>
            </div>
            <PButton type="button" variant="ghost" pill onClick={() => setCrearPrestAbierto(true)}>
              {F.prestatarioNuevo}
            </PButton>
          </div>
        </PCard>
      )}

      {/* Datos específicos de la vertical */}
      <PCard className="space-y-4">
        <h2 className="font-portal text-lg font-bold text-portal-ink">{F.seccionVertical}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {cfg.campos.map((c) => (
            <CampoVertical
              key={c.key}
              campo={c}
              value={datos[c.key] ?? ""}
              onChange={(v) => setCampo(c.key, v)}
            />
          ))}
        </div>
      </PCard>

      {/* Garantías */}
      <PCard className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-portal text-lg font-bold text-portal-ink">{F.seccionGarantias}</h2>
          <PButton
            variant="ghost"
            size="sm"
            pill
            leadingIcon={<Plus className="size-4" />}
            onClick={agregarGarantia}
          >
            {F.agregarGarantia}
          </PButton>
        </div>
        {garantias.length === 0 ? (
          <p className="text-sm text-portal-muted">{F.sinGarantias}</p>
        ) : (
          <div className="space-y-4">
            {garantias.map((g, i) => (
              <div
                key={i}
                className="rounded-card-sm border border-portal-line bg-portal-subtle/40 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                    <PSelect
                      label={F.garantiaTipo}
                      value={g.tipo}
                      onChange={(e) => setGarantia(i, { tipo: e.target.value })}
                    >
                      {cfg.garantiasSugeridas.map((t) => (
                        <option key={t} value={t}>
                          {labelGarantia(t)}
                        </option>
                      ))}
                      <option value={OTRO}>{F.garantiaTipoOtro}</option>
                    </PSelect>
                    {g.tipo === OTRO && (
                      <PInput
                        label={F.garantiaTipo}
                        value={g.tipoOtro}
                        onChange={(e) => setGarantia(i, { tipoOtro: e.target.value })}
                      />
                    )}
                    <PInput
                      label={F.garantiaTitulo}
                      value={g.titulo}
                      onChange={(e) => setGarantia(i, { titulo: e.target.value })}
                    />
                    <PInput
                      label={F.garantiaValor}
                      type="number"
                      inputMode="decimal"
                      value={g.valor}
                      onChange={(e) => setGarantia(i, { valor: e.target.value })}
                    />
                    <div className="sm:col-span-2">
                      <PTextarea
                        label={F.garantiaDescripcion}
                        rows={2}
                        value={g.descripcion}
                        onChange={(e) => setGarantia(i, { descripcion: e.target.value })}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => quitarGarantia(i)}
                    className="mt-6 shrink-0 rounded-chip p-2 text-portal-muted transition hover:bg-portal-danger-soft hover:text-portal-danger"
                    aria-label={F.quitarGarantia}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </PCard>

      {/* Scoring de riesgo */}
      <PCard className="space-y-4">
        <h2 className="font-portal text-lg font-bold text-portal-ink">{F.seccionRiesgo}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PSelect
            label={F.nivelRiesgo}
            value={nivelRiesgo}
            onChange={(e) => setNivelRiesgo(e.target.value)}
          >
            <option value="">{F.sinRiesgo}</option>
            {NIVELES_RIESGO.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </PSelect>
          <PSelect label={F.rating} value={rating} onChange={(e) => setRating(e.target.value)}>
            <option value="">{F.sinRating}</option>
            {RATINGS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </PSelect>
        </div>
        <PTextarea
          label={F.notasInternas}
          hint={F.notasHint}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
        />
        <PSelect
          label={F.estadoPublicacion}
          value={estado}
          onChange={(e) => setEstado(e.target.value as typeof estado)}
        >
          {ESTADOS_PUBLICACION.map((es) => (
            <option key={es.id} value={es.id}>
              {es.label}
            </option>
          ))}
        </PSelect>
      </PCard>

      {/* Fotos */}
      <PCard className="space-y-4">
        <h2 className="font-portal text-lg font-bold text-portal-ink">{F.seccionFotos}</h2>
        {!editando ? (
          <p className="text-sm text-portal-muted">
            {F.fotoHint} · {COPY.portales.comun.guardar}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {fotos.map((f) => (
                <div
                  key={f.id}
                  className="group relative aspect-square overflow-hidden rounded-card-sm border border-portal-line bg-portal-subtle"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {f.url && (
                    <img
                      loading="lazy"
                      decoding="async"
                      src={f.url}
                      alt=""
                      className="size-full object-cover"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => quitarFoto(f)}
                    className="absolute right-1.5 top-1.5 rounded-chip bg-portal-danger p-1.5 text-white shadow"
                    aria-label={F.quitarFoto}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-card-sm border-2 border-dashed border-portal-line2 text-portal-muted transition hover:border-portal-primary hover:text-portal-primary">
                {subiendoFoto ? (
                  <Loader2 className="size-6 animate-spin" />
                ) : (
                  <ImagePlus className="size-6" />
                )}
                <span className="text-xs font-semibold">
                  {subiendoFoto ? F.subiendo : F.subirFoto}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={onFoto}
                  disabled={subiendoFoto}
                />
              </label>
            </div>
            <p className="text-xs text-portal-muted">{F.fotoHint}</p>
          </>
        )}
      </PCard>

      {/* Documentos de respaldo (data room) */}
      <PCard className="space-y-4">
        <div>
          <h2 className="font-portal text-lg font-bold text-portal-ink">{F.seccionDocs}</h2>
          <p className="mt-1 text-sm text-portal-muted">{F.seccionDocsSub}</p>
        </div>
        {!editando ? (
          <p className="text-sm text-portal-muted">{F.docGuardarPrimero}</p>
        ) : (
          <>
            {docs.length === 0 ? (
              <p className="text-sm text-portal-muted">{F.sinDocs}</p>
            ) : (
              <ul className="divide-y divide-portal-line rounded-portal-sm border border-portal-line">
                {docs.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 px-3.5 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-chip bg-portal-primary-soft text-portal-primary-ink">
                        <FileText className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-portal-ink">{labelDoc(d.tipo)}</p>
                        <p className="truncate text-xs text-portal-muted">
                          {[d.nombre, d.bytes ? toFileSize(d.bytes) : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => quitarDoc(d)}
                      className="shrink-0 rounded-chip p-2 text-portal-muted transition hover:bg-portal-danger-soft hover:text-portal-danger"
                      aria-label={F.quitarDoc}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <PSelect
                  label={F.docTipo}
                  value={docTipo}
                  onChange={(e) => setDocTipo(e.target.value)}
                >
                  {DOC_TIPOS_SUGERIDOS.map((t) => (
                    <option key={t} value={t}>
                      {labelDoc(t)}
                    </option>
                  ))}
                </PSelect>
              </div>
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-portal-sm bg-portal-primary-soft px-5 py-3 font-portal text-sm font-semibold text-portal-primary-ink transition hover:bg-portal-primary/15">
                {subiendoDoc ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <FilePlus className="size-4" />
                )}
                <span>{subiendoDoc ? F.subiendoDoc : F.subirDoc}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="sr-only"
                  onChange={onDoc}
                  disabled={subiendoDoc}
                />
              </label>
            </div>
            <p className="text-xs text-portal-muted">{F.docHint}</p>
          </>
        )}
      </PCard>

      {/* Acciones */}
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <PButton
          pill
          size="lg"
          fullWidth
          loading={guardando}
          disabled={guardando}
          onClick={guardar}
        >
          {guardando ? F.guardando : F.guardar}
        </PButton>
        <PButton
          as="link"
          href={`${base}/admin/oportunidades`}
          variant="ghost"
          pill
          size="lg"
          fullWidth
        >
          {F.cancelar}
        </PButton>
      </div>

      {usaPrestatarios && (
        <PrestatarioInlineDialog
          open={crearPrestAbierto}
          onClose={() => setCrearPrestAbierto(false)}
          onCreado={(op) => {
            setOpciones((prev) => [...prev, op].sort((a, b) => a.nombre.localeCompare(b.nombre)));
            setPrestatarioId(op.id);
            setCrearPrestAbierto(false);
          }}
        />
      )}
    </div>
  );
}

/** Alta rápida de un prestatario desde el form de la oportunidad. */
function PrestatarioInlineDialog({
  open,
  onClose,
  onCreado,
}: {
  open: boolean;
  onClose: () => void;
  onCreado: (op: PrestatarioOpcion) => void;
}) {
  const F = COPY.portales.admin.oportunidades.form;
  const P = COPY.portales.admin.prestatarios;
  const [nombre, setNombre] = useState("");
  const [ruc, setRuc] = useState("");
  const [nivel, setNivel] = useState("");
  const [scoring, setScoring] = useState("");
  const [creando, setCreando] = useState(false);

  async function crear() {
    if (creando) return;
    if (nombre.trim().length < 2) return void toast.error(P.faltaNombre);
    if (ruc.trim() && !/^\d{11}$/.test(ruc.trim())) return void toast.error(P.rucInvalido);
    setCreando(true);
    try {
      const res = await fetch(`/api/prestatarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          ruc: ruc.trim() || undefined,
          nivel_riesgo: nivel || undefined,
          scoring_pago: scoring || undefined,
          estado: "activo",
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as { id?: string };
      if (!res.ok || !payload.id) return void toast.error(F.prestatarioErrorCrear);
      toast.success(F.prestatarioCreado);
      onCreado({ id: payload.id, nombre: nombre.trim() });
      setNombre("");
      setRuc("");
      setNivel("");
      setScoring("");
    } catch {
      toast.error(F.prestatarioErrorCrear);
    } finally {
      setCreando(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => (creando ? undefined : onClose())}
      title={F.prestatarioCrearTitulo}
    >
      <div className="space-y-4">
        <PInput
          label={P.nombre}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          requiredMark
        />
        <PInput
          label={P.ruc}
          inputMode="numeric"
          hint={P.rucHint}
          value={ruc}
          onChange={(e) => setRuc(e.target.value)}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PSelect label={P.nivelRiesgo} value={nivel} onChange={(e) => setNivel(e.target.value)}>
            <option value="">{P.sinRiesgo}</option>
            {NIVELES_RIESGO.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </PSelect>
          <PInput
            label={P.scoringPago}
            type="number"
            inputMode="numeric"
            value={scoring}
            onChange={(e) => setScoring(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
        <PButton pill fullWidth loading={creando} disabled={creando} onClick={crear}>
          {creando ? P.guardando : P.guardar}
        </PButton>
        <PButton variant="ghost" pill fullWidth disabled={creando} onClick={onClose}>
          {COPY.portales.comun.cancelar}
        </PButton>
      </div>
    </Dialog>
  );
}

/** Input de un campo de la vertical según su tipo. */
function CampoVertical({
  campo,
  value,
  onChange,
}: {
  campo: CampoDef;
  value: string;
  onChange: (v: string) => void;
}) {
  if (campo.tipo === "select") {
    return (
      <PSelect
        label={campo.label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        requiredMark={campo.requerido}
        hint={campo.ayuda}
      >
        <option value="">—</option>
        {campo.opciones?.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </PSelect>
    );
  }
  const numeric = campo.tipo !== "texto";
  return (
    <PInput
      label={campo.sufijo ? `${campo.label} (${campo.sufijo})` : campo.label}
      type={numeric ? "number" : "text"}
      inputMode={numeric ? "decimal" : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      requiredMark={campo.requerido}
      hint={campo.ayuda}
    />
  );
}
