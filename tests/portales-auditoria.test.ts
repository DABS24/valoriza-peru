/**
 * Tests de la BITÁCORA de los portales (portal_eventos_auditoria, 0089).
 *
 * Dos cosas que se rompen en silencio y acá dejan de romperse en silencio:
 *
 * 1. LA REVISIÓN DE LA CADENA. Un "✓ verificado" que devuelve ok con cualquier
 *    entrada es peor que no tener el botón: da por probado lo que no se probó. Estos
 *    casos fijan qué detecta (borrado, reordenamiento, renglón sin sello, un génesis
 *    que no arranca vacío) y qué NO puede detectar por diseño.
 * 2. EL CATÁLOGO DE ETIQUETAS. `accion` y `entidad` son texto libre: si alguien
 *    agrega una acción nueva en un route handler y no le escribe su etiqueta, la
 *    bitácora la muestra como "solicitud_doc_borrado" y deja de ser legible. Este
 *    test lee los propios llamadores y compara.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { revisarCadena, type EslabonAuditoria } from "@/lib/portales/admin";
import {
  AUDITORIA_ACCIONES,
  AUDITORIA_ENTIDADES,
  labelAccionAuditoria,
  labelEntidadAuditoria,
} from "@/lib/portales/constants";

/** Construye una cadena bien formada: cada renglón guarda el sello del anterior. */
function cadena(sellos: readonly string[]): EslabonAuditoria[] {
  return sellos.map((hash, i) => ({
    seq: i + 1,
    hash,
    prevHash: i === 0 ? "" : sellos[i - 1],
  }));
}

describe("revisarCadena · integridad de la bitácora", () => {
  it("una cadena completa y sana no reporta ningún renglón roto", () => {
    const r = revisarCadena(cadena(["a", "b", "c", "d"]), true);
    expect(r.ok).toBe(true);
    expect(r.rotos).toEqual([]);
    // 3 enlaces entre renglones + el del inicio.
    expect(r.revisados).toBe(4);
  });

  it("detecta que falta un renglón del medio (el enlace deja de calzar)", () => {
    const completa = cadena(["a", "b", "c", "d"]);
    const sinElTercero = [completa[0], completa[1], completa[3]];
    const r = revisarCadena(sinElTercero, true);
    expect(r.ok).toBe(false);
    // El renglón que no calza es el siguiente al borrado.
    expect(r.rotos).toEqual([4]);
  });

  it("detecta un renglón sin sello: no se cuenta como íntegro por defecto", () => {
    const filas = cadena(["a", "b", "c"]);
    filas[1] = { ...filas[1], hash: null };
    const r = revisarCadena(filas, true);
    expect(r.ok).toBe(false);
    // Rompe el propio renglón (sin sello) y el siguiente (que apunta a un sello ausente).
    expect(r.rotos).toEqual([2, 3]);
  });

  it("exige que el primer renglón del portal arranque con el enlace vacío", () => {
    const filas = cadena(["a", "b"]);
    filas[0] = { ...filas[0], prevHash: "sello-de-otra-cadena" };
    expect(revisarCadena(filas, true).ok).toBe(false);
  });

  it("cuando la muestra NO llega al inicio, no inventa un error en el primer renglón", () => {
    // Caso real: la revisión está topada a los N más recientes. El primero de la
    // muestra tiene un anterior legítimo que no vino — no hay nada que comparar.
    const filas = cadena(["a", "b", "c"]).slice(1);
    const r = revisarCadena(filas, false);
    expect(r.ok).toBe(true);
    expect(r.revisados).toBe(1);
  });

  it("una muestra vacía no afirma que todo esté bien: no revisa nada", () => {
    const r = revisarCadena([], true);
    expect(r.revisados).toBe(0);
    expect(r.rotos).toEqual([]);
  });

  it("NO detecta una edición que deja el sello viejo (límite conocido y declarado)", () => {
    // Se documenta como test para que nadie lea "cadena OK" como "nada fue tocado":
    // esta revisión compara eslabones, no recalcula el sello desde el contenido.
    // El día que exista la función SQL que sí lo hace, este test debe cambiar.
    const filas = cadena(["a", "b", "c"]);
    const r = revisarCadena(filas, true);
    expect(r.ok).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

const RAIZ = path.resolve(__dirname, "..");
const API_PORTALES = path.join(RAIZ, "app", "api");

/** Todos los .ts bajo app/api (donde vive cada registro de la bitácora). */
function archivosTs(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const completo = path.join(dir, nombre);
    if (statSync(completo).isDirectory()) return archivosTs(completo);
    return completo.endsWith(".ts") ? [completo] : [];
  });
}

/**
 * Lee los valores literales que los route handlers le pasan a
 * `registrarEventoPortal`. Solo mira DENTRO del objeto del llamado (no todo el
 * archivo) para no confundirse con los `accion:` de los esquemas de validación.
 */
function literalesRegistrados(campo: "accion" | "entidad"): Set<string> {
  const encontrados = new Set<string>();
  for (const archivo of archivosTs(API_PORTALES)) {
    const src = readFileSync(archivo, "utf8");
    let i = src.indexOf("registrarEventoPortal({");
    while (i !== -1) {
      const bloque = src.slice(i, i + 500);
      const linea = new RegExp(`\\n\\s*${campo}:([^\\n]*)`).exec(bloque);
      if (linea) {
        // En los llamados con ternario (`x === "confirmar" ? "a" : "b"`) lo que se
        // guarda es lo de la DERECHA del `?`; la condición no es un valor de bitácora.
        const rhs = linea[1];
        const corte = rhs.indexOf("?");
        const valores = corte === -1 ? rhs : rhs.slice(corte);
        for (const m of valores.matchAll(/"([a-z0-9_]+)"/g)) encontrados.add(m[1]);
      }
      i = src.indexOf("registrarEventoPortal({", i + 1);
    }
  }
  return encontrados;
}

describe("catálogo de la bitácora · el registro tiene que ser legible", () => {
  it("encuentra los llamados a la bitácora (si esto falla, el escaneo se rompió)", () => {
    expect(literalesRegistrados("accion").size).toBeGreaterThan(15);
    expect(literalesRegistrados("entidad").size).toBeGreaterThan(4);
  });

  it("toda acción que el código registra tiene su etiqueta en español", () => {
    const sinEtiqueta = [...literalesRegistrados("accion")].filter((a) => !AUDITORIA_ACCIONES[a]);
    expect(sinEtiqueta).toEqual([]);
  });

  it("todo recurso que el código registra tiene su etiqueta en español", () => {
    const sinEtiqueta = [...literalesRegistrados("entidad")].filter((e) => !AUDITORIA_ENTIDADES[e]);
    expect(sinEtiqueta).toEqual([]);
  });

  it("ninguna etiqueta del catálogo queda vacía", () => {
    for (const label of [
      ...Object.values(AUDITORIA_ACCIONES),
      ...Object.values(AUDITORIA_ENTIDADES),
    ]) {
      expect(label.trim().length).toBeGreaterThan(2);
    }
  });

  it("una acción desconocida se muestra legible, no con guiones bajos", () => {
    expect(labelAccionAuditoria("algo_nuevo_sin_etiqueta")).toBe("Algo nuevo sin etiqueta");
    expect(labelEntidadAuditoria("portal_cosas")).toBe("Portal cosas");
  });
});
