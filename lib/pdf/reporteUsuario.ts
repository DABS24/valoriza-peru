/**
 * Generador de reportes de usuario en PDF (server-side, pdf-lib).
 *
 * Recibe un ReporteData ya armado por lib/data/reporteServer (agnóstico de la
 * faceta: cliente/asesor/admin/…). El layout es tipo "estado de cuenta bancario":
 * una hoja-resumen arriba y tablas detalladas abajo, paginadas, varias filas por
 * hoja. Prioriza ORDEN y legibilidad, no adornos. pdf-lib es de bajo nivel: se
 * dibuja por coordenadas, con helpers de cursor + salto de página.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export interface ReporteSeccion {
  titulo: string;
  columnas: string[];
  /** Anchos relativos por columna (mismos ítems que `columnas`). Suman lo que sea; se normaliza. */
  anchos?: number[];
  /** Alineación por columna: "l" (izq, default) o "r" (der, para números). */
  align?: ("l" | "r")[];
  filas: string[][];
  vacio?: string;
}

/**
 * Bloque de PÁRRAFOS al pie del documento (avisos, alcance legal, condiciones).
 * A diferencia de las tablas —que TRUNCAN con `fit()`— acá el texto se parte en
 * líneas: un aviso legal cortado con "…" sería peor que no ponerlo.
 */
export interface ReporteNotas {
  titulo: string;
  parrafos: string[];
}

export interface ReporteData {
  marca: string; // p.ej. "Don Gato Efectivo"
  titulo: string; // p.ej. "Reporte de cliente"
  facetaLabel: string; // p.ej. "Cliente"
  generadoEl: string; // fecha/hora legible
  periodo?: string; // etiqueta del rango; ausente = no se imprime la línea de periodo
  persona: { nombre: string; sub: string }; // sub: DNI · email · rol
  resumen: { label: string; valor: string }[];
  secciones: ReporteSeccion[];
  /** Avisos al pie. Obligatorio de hecho en documentos que ve un cliente. */
  notas?: ReporteNotas;
  /**
   * Leyenda del pie. Por defecto marca el documento como interno: los reportes de
   * staff lo son. Un documento que SE LE ENTREGA a un cliente DEBE pasar la suya
   * — llamarlo "interno confidencial" sería mentirle en la cara.
   */
  pieNota?: string;
  /**
   * Color de marca del documento en canales 0-1. Por defecto el navy de Efectivo.
   * Los portales de inversión son otra marca y pasan su propio acento.
   */
  acento?: [number, number, number];
}

// A4 vertical (puntos).
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 42; // margen
const CONTENT_W = PAGE_W - M * 2;

/** Acento por defecto: el navy de Don Gato Efectivo. Se puede sobrescribir por documento. */
const NAVY_DEFECTO: [number, number, number] = [0.118, 0.165, 0.29];
const INK = rgb(0.13, 0.14, 0.18);
const MUTED = rgb(0.42, 0.45, 0.52);
const LINE = rgb(0.82, 0.84, 0.88);
const ZEBRA = rgb(0.96, 0.97, 0.985);
const HEADBG = rgb(0.93, 0.94, 0.965);

interface Ctx {
  pdf: PDFDocument;
  page: PDFPage;
  y: number;
  font: PDFFont;
  bold: PDFFont;
  data: ReporteData;
  pageNum: number;
  /** Color de marca resuelto del documento (data.acento o el navy por defecto). */
  navy: ReturnType<typeof rgb>;
}

/** Trunca un texto para que quepa en `maxW` a `size`, agregando … si hace falta. */
function fit(font: PDFFont, text: string, size: number, maxW: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxW) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(t + "…", size) > maxW) t = t.slice(0, -1);
  return t + "…";
}

/**
 * Parte `texto` en líneas que quepan en `maxW`. Corta por palabra; una palabra más
 * ancha que la línea se parte por caracteres (nunca desborda el margen).
 */
function envolver(font: PDFFont, texto: string, size: number, maxW: number): string[] {
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of texto.split(/\s+/).filter(Boolean)) {
    const tentativa = actual ? `${actual} ${palabra}` : palabra;
    if (font.widthOfTextAtSize(tentativa, size) <= maxW) {
      actual = tentativa;
      continue;
    }
    if (actual) lineas.push(actual);
    // Palabra sola más ancha que la línea: partirla a lo bruto.
    let resto = palabra;
    while (font.widthOfTextAtSize(resto, size) > maxW && resto.length > 1) {
      let corte = resto.length;
      while (corte > 1 && font.widthOfTextAtSize(resto.slice(0, corte), size) > maxW) corte -= 1;
      lineas.push(resto.slice(0, corte));
      resto = resto.slice(corte);
    }
    actual = resto;
  }
  if (actual) lineas.push(actual);
  return lineas;
}

function footer(ctx: Ctx) {
  const { page, font, data, pageNum } = ctx;
  page.drawLine({
    start: { x: M, y: M - 8 },
    end: { x: PAGE_W - M, y: M - 8 },
    thickness: 0.5,
    color: LINE,
  });
  const pie = data.pieNota ?? "Documento interno confidencial";
  page.drawText(fit(font, `${data.marca} · ${pie}`, 7, CONTENT_W - 60), {
    x: M,
    y: M - 20,
    size: 7,
    font,
    color: MUTED,
  });
  const pag = `Página ${pageNum}`;
  page.drawText(pag, {
    x: PAGE_W - M - font.widthOfTextAtSize(pag, 7),
    y: M - 20,
    size: 7,
    font,
    color: MUTED,
  });
}

function nuevaPagina(ctx: Ctx, conCabecera = false) {
  if (ctx.page) footer(ctx);
  ctx.page = ctx.pdf.addPage([PAGE_W, PAGE_H]);
  ctx.pageNum += 1;
  ctx.y = PAGE_H - M;
  if (conCabecera) cabeceraContinuacion(ctx);
}

function cabeceraContinuacion(ctx: Ctx) {
  const { page, bold, font, data } = ctx;
  page.drawText(data.marca, { x: M, y: ctx.y - 10, size: 9, font: bold, color: ctx.navy });
  page.drawText(fit(font, `${data.titulo} · ${data.persona.nombre} (continuación)`, 8, CONTENT_W - 120), {
    x: M,
    y: ctx.y - 22,
    size: 8,
    font,
    color: MUTED,
  });
  ctx.y -= 40;
}

/** Asegura que quedan `alto` puntos; si no, salta de página (con cabecera de continuación). */
function asegurar(ctx: Ctx, alto: number) {
  if (ctx.y - alto < M + 16) nuevaPagina(ctx, true);
}

function encabezadoPrincipal(ctx: Ctx) {
  const { page, bold, font, data } = ctx;
  // Franja de marca
  page.drawRectangle({ x: 0, y: PAGE_H - 6, width: PAGE_W, height: 6, color: ctx.navy });
  page.drawText(data.marca, { x: M, y: ctx.y - 16, size: 11, font: bold, color: ctx.navy });
  const etq = data.facetaLabel.toUpperCase();
  page.drawText(etq, {
    x: PAGE_W - M - bold.widthOfTextAtSize(etq, 9),
    y: ctx.y - 16,
    size: 9,
    font: bold,
    color: MUTED,
  });
  ctx.y -= 34;

  page.drawText(fit(bold, data.titulo, 17, CONTENT_W), { x: M, y: ctx.y, size: 17, font: bold, color: INK });
  ctx.y -= 20;
  page.drawText(fit(bold, data.persona.nombre, 12, CONTENT_W), { x: M, y: ctx.y, size: 12, font: bold, color: ctx.navy });
  ctx.y -= 14;
  page.drawText(fit(font, data.persona.sub, 9, CONTENT_W), { x: M, y: ctx.y, size: 9, font, color: MUTED });
  ctx.y -= 12;
  // La línea de periodo solo aparece si el documento TIENE periodo: un reporte de
  // actividad lo tiene, una constancia de una operación puntual no.
  const meta = data.periodo
    ? `Generado: ${data.generadoEl}   ·   Periodo: ${data.periodo}`
    : `Generado: ${data.generadoEl}`;
  page.drawText(fit(font, meta, 8, CONTENT_W), { x: M, y: ctx.y, size: 8, font, color: MUTED });
  ctx.y -= 18;
  page.drawLine({ start: { x: M, y: ctx.y }, end: { x: PAGE_W - M, y: ctx.y }, thickness: 1, color: ctx.navy });
  ctx.y -= 20;
}

function bloqueResumen(ctx: Ctx) {
  const { page, bold, font, data } = ctx;
  if (!data.resumen.length) return;
  page.drawText("RESUMEN", { x: M, y: ctx.y, size: 9, font: bold, color: MUTED });
  ctx.y -= 16;

  // Dos columnas de pares label: valor.
  // filaH DEBE superar label(7) + interlínea + valor(10); con 16 el label de la
  // fila siguiente se montaba sobre el valor de la anterior (se veía en cualquier
  // resumen de 3+ filas, también en los reportes de Efectivo).
  const colW = CONTENT_W / 2;
  const filaH = 24;
  const filas = Math.ceil(data.resumen.length / 2);
  asegurar(ctx, filas * filaH + 8);
  for (let i = 0; i < data.resumen.length; i++) {
    const col = i % 2;
    const fila = Math.floor(i / 2);
    const x = M + col * colW;
    const y = ctx.y - fila * filaH;
    const { label, valor } = data.resumen[i];
    page.drawText(fit(font, label.toUpperCase(), 7, colW - 20), { x, y, size: 7, font, color: MUTED });
    page.drawText(fit(bold, valor, 10, colW - 10), { x, y: y - 12, size: 10, font: bold, color: INK });
  }
  ctx.y -= filas * filaH + 10;
}

function tabla(ctx: Ctx, sec: ReporteSeccion) {
  const { data } = ctx;
  asegurar(ctx, 46);
  ctx.page.drawText(sec.titulo.toUpperCase(), { x: M, y: ctx.y, size: 9, font: ctx.bold, color: ctx.navy });
  ctx.y -= 6;
  ctx.page.drawLine({ start: { x: M, y: ctx.y }, end: { x: PAGE_W - M, y: ctx.y }, thickness: 0.5, color: LINE });
  ctx.y -= 12;

  if (!sec.filas.length) {
    ctx.page.drawText(sec.vacio ?? "Sin registros.", { x: M, y: ctx.y, size: 8, font: ctx.font, color: MUTED });
    ctx.y -= 20;
    return;
  }

  const n = sec.columnas.length;
  const pesos = sec.anchos && sec.anchos.length === n ? sec.anchos : sec.columnas.map(() => 1);
  const sum = pesos.reduce((a, b) => a + b, 0);
  const anchos = pesos.map((p) => (p / sum) * CONTENT_W);
  const xs: number[] = [];
  let acc = M;
  for (const w of anchos) {
    xs.push(acc);
    acc += w;
  }
  const align = sec.align ?? sec.columnas.map(() => "l" as const);
  const size = n > 6 ? 7 : 8;
  const rowH = size + 6;

  const drawHead = () => {
    ctx.page.drawRectangle({ x: M, y: ctx.y - rowH + 4, width: CONTENT_W, height: rowH, color: HEADBG });
    for (let c = 0; c < n; c++) {
      const w = anchos[c] - 6;
      const txt = fit(ctx.bold, sec.columnas[c], size, w);
      const tx = align[c] === "r" ? xs[c] + anchos[c] - 4 - ctx.bold.widthOfTextAtSize(txt, size) : xs[c] + 3;
      ctx.page.drawText(txt, { x: tx, y: ctx.y - size, size, font: ctx.bold, color: ctx.navy });
    }
    ctx.y -= rowH;
  };

  drawHead();
  let z = 0;
  for (const fila of sec.filas) {
    if (ctx.y - rowH < M + 16) {
      nuevaPagina(ctx, true);
      ctx.page.drawText(sec.titulo.toUpperCase() + " (cont.)", { x: M, y: ctx.y, size: 8, font: ctx.bold, color: ctx.navy });
      ctx.y -= 14;
      drawHead();
    }
    if (z % 2 === 1) {
      ctx.page.drawRectangle({ x: M, y: ctx.y - rowH + 4, width: CONTENT_W, height: rowH, color: ZEBRA });
    }
    for (let c = 0; c < n; c++) {
      const w = anchos[c] - 6;
      const raw = fila[c] ?? "";
      const txt = fit(ctx.font, raw, size, w);
      const tx = align[c] === "r" ? xs[c] + anchos[c] - 4 - ctx.font.widthOfTextAtSize(txt, size) : xs[c] + 3;
      ctx.page.drawText(txt, { x: tx, y: ctx.y - size, size, font: ctx.font, color: INK });
    }
    ctx.y -= rowH;
    z += 1;
  }
  ctx.y -= 16;
  void data;
}

/**
 * Bloque de avisos al pie: título + párrafos con salto de línea real. El texto
 * legal NO se trunca (a diferencia de las tablas): se envuelve, y si no entra en
 * la página, salta a la siguiente.
 */
function bloqueNotas(ctx: Ctx, notas: ReporteNotas) {
  const size = 8;
  const lh = size + 3.5;
  asegurar(ctx, 34);
  ctx.page.drawText(notas.titulo.toUpperCase(), { x: M, y: ctx.y, size: 9, font: ctx.bold, color: ctx.navy });
  ctx.y -= 6;
  ctx.page.drawLine({ start: { x: M, y: ctx.y }, end: { x: PAGE_W - M, y: ctx.y }, thickness: 0.5, color: LINE });
  ctx.y -= 14;

  for (const parrafo of notas.parrafos) {
    for (const linea of envolver(ctx.font, parrafo, size, CONTENT_W)) {
      asegurar(ctx, lh);
      ctx.page.drawText(linea, { x: M, y: ctx.y, size, font: ctx.font, color: INK });
      ctx.y -= lh;
    }
    ctx.y -= 6; // aire entre párrafos
  }
}

/** Genera el PDF y devuelve los bytes. */
export async function generarReporteUsuarioPDF(data: ReporteData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${data.titulo} — ${data.persona.nombre}`);
  pdf.setProducer(data.marca);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const ctx: Ctx = {
    pdf,
    page: null as unknown as PDFPage,
    y: 0,
    font,
    bold,
    data,
    pageNum: 0,
    navy: rgb(...(data.acento ?? NAVY_DEFECTO)),
  };
  nuevaPagina(ctx); // primera
  encabezadoPrincipal(ctx);
  bloqueResumen(ctx);
  for (const sec of data.secciones) tabla(ctx, sec);
  if (data.notas) bloqueNotas(ctx, data.notas);
  footer(ctx); // footer de la última página

  return pdf.save();
}
