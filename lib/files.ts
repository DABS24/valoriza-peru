/**
 * Procesamiento de archivos subidos — FUENTE ÚNICA.
 *
 * TODO punto de subida (DNI, selfie, voucher, boleta, avatar) pasa por acá:
 *  - Valida el tipo (solo imágenes y PDF).
 *  - Comprime las imágenes (redimensiona + JPEG) para que no pesen de más.
 *  - Aplica un límite duro de tamaño en cualquier caso (imagen ya comprimida o PDF).
 *
 * Devuelve un data URL (hoy la app mock lo guarda así; en el cutover a Supabase
 * el mismo File/Blob se sube a Storage — ver lib/supabase/storage.ts).
 */

import { bytesFromDataUrl, toFileSize } from "@/lib/formatters";

/** Límite duro de peso por archivo (tras comprimir, si es imagen). */
export const MAX_ARCHIVO_BYTES = 2 * 1024 * 1024; // 2 MB
/**
 * Límite de peso para DOCUMENTOS del data room (PDF sin comprimir). Un contrato o
 * tasación escaneada pesa más que una foto: 10 MB. Las imágenes siguen bajando a
 * <2 MB (se comprimen); esto solo eleva el techo del PDF.
 */
export const MAX_DOC_BYTES = 10 * 1024 * 1024; // 10 MB
/** Lado máximo de una imagen (px). Un DNI/voucher solo necesita ser legible. */
export const IMAGEN_MAX_DIM = 1600;
/** Calidad JPEG inicial al comprimir. */
export const IMAGEN_CALIDAD = 0.8;
/**
 * Tipos aceptados en cualquier subida, con las extensiones que le corresponden
 * a cada uno. Van JUNTOS a propósito: son la misma decisión ("qué archivos
 * aceptamos") y tenerlos en dos listas separadas garantiza que se desincronicen
 * — se agrega un tipo en un lado y la extensión queda rechazada en el otro.
 */
const FORMATOS = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "application/pdf": ["pdf"],
} as const;

/** Tipos MIME aceptados. Derivado de FORMATOS: no se escribe dos veces. */
export const TIPOS_PERMITIDOS: string[] = Object.keys(FORMATOS);

/** Extensiones aceptadas. Derivadas de FORMATOS. */
export const EXTENSIONES_PERMITIDAS: string[] = Object.values(FORMATOS).flat();

/**
 * ¿La extensión del nombre corresponde a un tipo que aceptamos?
 *
 * Se valida ADEMÁS del MIME porque el `type` lo declara el navegador y se
 * falsifica en una línea. No es defensa fuerte por sí sola (los buckets son
 * privados y no sirven HTML), pero evita guardar un .html o .svg con MIME mentido.
 */
export function extensionPermitida(nombre: string): boolean {
  const ext = nombre.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSIONES_PERMITIDAS.includes(ext);
}

export interface ArchivoProcesado {
  /** Contenido en data URL (base64). Imágenes salen como JPEG comprimido. */
  dataUrl: string;
  /** Nombre original del archivo. */
  nombre: string;
  /** MIME final (image/jpeg para imágenes comprimidas). */
  tipo: string;
  /** Peso final en bytes. */
  bytes: number;
}

/** Error con mensaje amigable para mostrar al usuario. */
export class ArchivoError extends Error {}

function leerDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new ArchivoError("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

/**
 * Redimensiona + comprime una imagen a JPEG por debajo del límite de peso
 * (<2MB GARANTIZADO). Igual que comprimirImagenBlob pero devuelve data URL:
 * baja calidad (0.8→0.4) y, si aún no cabe, reduce la DIMENSIÓN (×0.8) hasta que
 * quepa. Así el preview NUNCA dispara "la imagen pesa de más".
 */
async function comprimirImagen(file: File): Promise<{ dataUrl: string; bytes: number }> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    throw new ArchivoError("No se pudo procesar la imagen.");
  }

  const original = Math.max(bitmap.width, bitmap.height);
  let dim = Math.min(IMAGEN_MAX_DIM, original);
  let dataUrl = "";

  for (let intento = 0; intento < 8; intento++) {
    const escala = Math.min(1, dim / original);
    const w = Math.max(1, Math.round(bitmap.width * escala));
    const h = Math.max(1, Math.round(bitmap.height * escala));
    canvas.width = w;
    canvas.height = h;
    // Fondo blanco (por si viene un PNG con transparencia → JPEG no la soporta).
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);

    let calidad = IMAGEN_CALIDAD;
    dataUrl = canvas.toDataURL("image/jpeg", calidad);
    while (bytesFromDataUrl(dataUrl) > MAX_ARCHIVO_BYTES && calidad > 0.4) {
      calidad -= 0.1;
      dataUrl = canvas.toDataURL("image/jpeg", calidad);
    }
    if (bytesFromDataUrl(dataUrl) <= MAX_ARCHIVO_BYTES) break;
    dim = Math.round(dim * 0.8);
    if (dim < 400) break;
  }

  bitmap.close?.();
  return { dataUrl, bytes: bytesFromDataUrl(dataUrl) };
}

/**
 * Comprime a JPEG y devuelve un Blob (<2MB GARANTIZADO) para subir a Storage.
 *
 * Estrategia en dos ejes para que NUNCA salte "el archivo pesa de más":
 *  1) baja la calidad (0.8 → 0.4);
 *  2) si a calidad mínima aún no cabe, reduce la DIMENSIÓN (×0.8) y reintenta.
 * Una foto de DNI/selfie a ~400px y calidad 0.4 pesa muy poco → siempre cabe
 * mucho antes de degradar la legibilidad.
 */
async function comprimirImagenBlob(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    throw new ArchivoError("No se pudo procesar la imagen.");
  }
  const toBlob = (calidad: number): Promise<Blob | null> =>
    new Promise((res) => canvas.toBlob(res, "image/jpeg", calidad));

  const original = Math.max(bitmap.width, bitmap.height);
  let dim = Math.min(IMAGEN_MAX_DIM, original); // lado mayor de partida
  let blob: Blob | null = null;

  for (let intento = 0; intento < 8; intento++) {
    const escala = Math.min(1, dim / original);
    const w = Math.max(1, Math.round(bitmap.width * escala));
    const h = Math.max(1, Math.round(bitmap.height * escala));
    canvas.width = w;
    canvas.height = h;
    // Fondo blanco: JPEG no soporta transparencia (PNG con alfa).
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);

    let calidad = IMAGEN_CALIDAD;
    blob = await toBlob(calidad);
    while (blob && blob.size > MAX_ARCHIVO_BYTES && calidad > 0.4) {
      calidad -= 0.1;
      blob = await toBlob(calidad);
    }
    if (blob && blob.size <= MAX_ARCHIVO_BYTES) break;
    dim = Math.round(dim * 0.8); // aún pesa: encoge y reintenta
    if (dim < 400) break; // a <400px + calidad 0.4 una foto siempre cabe
  }

  bitmap.close?.();
  if (!blob) throw new ArchivoError("No se pudo procesar la imagen.");
  return blob;
}

/**
 * Valida y devuelve un File listo para SUBIR A STORAGE: imágenes comprimidas a
 * JPEG (<2MB), PDF tal cual (con límite). Mismo contrato de validación que
 * procesarArchivo, pero binario en vez de base64.
 */
export async function procesarArchivoParaSubir(file: File): Promise<File> {
  const tipo = file.type || "application/octet-stream";
  if (!TIPOS_PERMITIDOS.includes(tipo)) {
    throw new ArchivoError("Formato no permitido. Sube una imagen (JPG/PNG) o un PDF.");
  }
  if (tipo.startsWith("image/")) {
    const blob = await comprimirImagenBlob(file);
    if (blob.size > MAX_ARCHIVO_BYTES) {
      throw new ArchivoError(
        `La imagen sigue pesando ${toFileSize(blob.size)} tras comprimir. Prueba con una foto más liviana.`,
      );
    }
    const base = file.name.replace(/\.[^.]+$/, "") || "imagen";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  }
  if (file.size > MAX_ARCHIVO_BYTES) {
    throw new ArchivoError(
      `El archivo pesa ${toFileSize(file.size)} y el máximo es ${toFileSize(MAX_ARCHIVO_BYTES)}.`,
    );
  }
  return file;
}

/**
 * Prepara un DOCUMENTO del data room para subir: las IMÁGENES se comprimen a JPEG
 * (<2MB, misma ruta que el resto de subidas); los PDF NO se comprimen y solo se
 * validan hasta 10 MB. Mismo contrato de validación de tipo/extensión que
 * procesarArchivoParaSubir. Devuelve el File listo para Storage.
 */
export async function procesarDocParaSubir(file: File): Promise<File> {
  const tipo = file.type || "application/octet-stream";
  if (!TIPOS_PERMITIDOS.includes(tipo) || !extensionPermitida(file.name)) {
    throw new ArchivoError("Formato no permitido. Sube un PDF o una imagen (JPG/PNG).");
  }
  if (tipo.startsWith("image/")) {
    // Imagen → comprimida a <2MB por la ruta única de subida.
    return procesarArchivoParaSubir(file);
  }
  // PDF (u otro no-imagen permitido): sin comprimir, techo de 10 MB.
  if (file.size > MAX_DOC_BYTES) {
    throw new ArchivoError(
      `El archivo pesa ${toFileSize(file.size)} y el máximo es ${toFileSize(MAX_DOC_BYTES)}.`,
    );
  }
  return file;
}

/**
 * Valida, comprime (si es imagen) y aplica el límite de peso. Lanza ArchivoError
 * con un mensaje listo para mostrar si el tipo no se acepta o excede el máximo.
 */
export async function procesarArchivo(file: File): Promise<ArchivoProcesado> {
  const tipo = file.type || "application/octet-stream";
  if (!TIPOS_PERMITIDOS.includes(tipo)) {
    throw new ArchivoError("Formato no permitido. Sube una imagen (JPG/PNG) o un PDF.");
  }

  if (tipo.startsWith("image/")) {
    const { dataUrl, bytes } = await comprimirImagen(file);
    if (bytes > MAX_ARCHIVO_BYTES) {
      throw new ArchivoError(
        `La imagen sigue pesando ${toFileSize(bytes)} tras comprimir. Prueba con una foto más liviana.`,
      );
    }
    return { dataUrl, nombre: file.name, tipo: "image/jpeg", bytes };
  }

  // PDF (u otro permitido): no se comprime en el navegador, solo se limita.
  if (file.size > MAX_ARCHIVO_BYTES) {
    throw new ArchivoError(
      `El archivo pesa ${toFileSize(file.size)} y el máximo es ${toFileSize(MAX_ARCHIVO_BYTES)}.`,
    );
  }
  const dataUrl = await leerDataUrl(file);
  return { dataUrl, nombre: file.name, tipo, bytes: file.size };
}
