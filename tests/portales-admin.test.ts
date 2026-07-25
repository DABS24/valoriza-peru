/**
 * Tests de los helpers PUROS del panel del ADMIN (lib/portales/admin.ts).
 *
 * Anclan lo que alimenta la salud del catálogo, la cola de pendientes y los KPIs de
 * negocio: qué le falta a una operación publicada, cuándo un borrador está
 * estancado, y —lo más importante— que las métricas sin muestra devuelvan `null`
 * (la UI pinta "—") en vez de un 0 que se lee como un resultado real.
 *
 * Todo determinista: se inyecta `ahora`, sin tocar la base.
 */

import { describe, expect, it } from "vitest";

import {
  DIAS_BORRADOR_ESTANCADO,
  ESTADOS_VISIBLES,
  borradorEstancado,
  diasDesde,
  esVisible,
  faltantesDeOportunidad,
  ordenarPorCarga,
  promedio,
  proporcion,
  type CargaAsesor,
  type OportunidadRevisable,
} from "@/lib/portales/admin";

/** Operación publicada COMPLETA: la línea base contra la que se prueban los faltantes. */
const COMPLETA: OportunidadRevisable = {
  estadoPublicacion: "disponible",
  comisionPct: 3,
  tasaMensual: 1.5,
  montoSolicitado: 100_000,
  plazoMesesMin: 4,
  plazoMesesMax: 6,
  prestatarioId: "p-1",
  nivelRiesgo: "medio",
  numGarantias: 1,
  numDocs: 2,
  numFotos: 3,
};

describe("esVisible / ESTADOS_VISIBLES", () => {
  it("disponible y reservada las ve el inversionista", () => {
    expect(esVisible("disponible")).toBe(true);
    expect(esVisible("reservada")).toBe(true);
  });

  it("borrador y cerrada NO son superficie de catálogo", () => {
    expect(esVisible("borrador")).toBe(false);
    expect(esVisible("cerrada")).toBe(false);
  });

  it("la lista de visibles no incluye borrador (evita publicar por omisión)", () => {
    expect(ESTADOS_VISIBLES).not.toContain("borrador");
  });
});

describe("faltantesDeOportunidad", () => {
  it("una operación publicada y completa no tiene faltantes", () => {
    expect(faltantesDeOportunidad(COMPLETA)).toEqual([]);
  });

  it("un BORRADOR nunca reporta faltantes (está a medias por definición)", () => {
    const borrador: OportunidadRevisable = {
      ...COMPLETA,
      estadoPublicacion: "borrador",
      comisionPct: null,
      tasaMensual: null,
      montoSolicitado: null,
      plazoMesesMin: null,
      plazoMesesMax: null,
      prestatarioId: null,
      nivelRiesgo: null,
      numGarantias: 0,
      numDocs: 0,
      numFotos: 0,
    };
    expect(faltantesDeOportunidad(borrador)).toEqual([]);
  });

  it("sin comisión → lo reporta PRIMERO (es lo que rompe el negocio)", () => {
    const sinComision = { ...COMPLETA, comisionPct: null };
    expect(faltantesDeOportunidad(sinComision)[0]).toBe("comision");
  });

  it("comisión en 0 cuenta como faltante (0 % no es una comisión pactada)", () => {
    expect(faltantesDeOportunidad({ ...COMPLETA, comisionPct: 0 })).toContain("comision");
  });

  it("tasa, monto, prestatario y riesgo vacíos se reportan cada uno", () => {
    const pelada: OportunidadRevisable = {
      ...COMPLETA,
      tasaMensual: null,
      montoSolicitado: null,
      prestatarioId: null,
      nivelRiesgo: null,
    };
    const f = faltantesDeOportunidad(pelada);
    expect(f).toContain("tasa");
    expect(f).toContain("monto");
    expect(f).toContain("prestatario");
    expect(f).toContain("riesgo");
  });

  it("basta UNO de los dos plazos para no reportar 'plazo'", () => {
    expect(faltantesDeOportunidad({ ...COMPLETA, plazoMesesMin: null })).not.toContain("plazo");
    expect(faltantesDeOportunidad({ ...COMPLETA, plazoMesesMax: null })).not.toContain("plazo");
    expect(
      faltantesDeOportunidad({ ...COMPLETA, plazoMesesMin: null, plazoMesesMax: null }),
    ).toContain("plazo");
  });

  it("sin garantía, sin documentos y sin fotos → tres faltantes de confianza", () => {
    const f = faltantesDeOportunidad({
      ...COMPLETA,
      numGarantias: 0,
      numDocs: 0,
      numFotos: 0,
    });
    expect(f).toEqual(expect.arrayContaining(["garantia", "documentos", "fotos"]));
  });

  it("una reservada incompleta también se reporta (ya la vio un inversionista)", () => {
    const f = faltantesDeOportunidad({
      ...COMPLETA,
      estadoPublicacion: "reservada",
      numGarantias: 0,
    });
    expect(f).toEqual(["garantia"]);
  });
});

describe("diasDesde", () => {
  const ahora = new Date("2026-07-24T12:00:00.000Z").getTime();

  it("cuenta días enteros", () => {
    expect(diasDesde("2026-07-14T12:00:00.000Z", ahora)).toBe(10);
  });

  it("fecha inválida o ausente → null (nunca 0)", () => {
    expect(diasDesde(null, ahora)).toBeNull();
    expect(diasDesde("no-es-fecha", ahora)).toBeNull();
  });

  it("fecha futura → 0, no negativo", () => {
    expect(diasDesde("2026-08-01T12:00:00.000Z", ahora)).toBe(0);
  });
});

describe("borradorEstancado", () => {
  const ahora = new Date("2026-07-24T12:00:00.000Z").getTime();
  const viejo = new Date(ahora - (DIAS_BORRADOR_ESTANCADO + 1) * 86_400_000).toISOString();
  const reciente = new Date(ahora - 2 * 86_400_000).toISOString();

  it("un borrador viejo está estancado", () => {
    expect(borradorEstancado("borrador", viejo, ahora)).toBe(true);
  });

  it("un borrador reciente no", () => {
    expect(borradorEstancado("borrador", reciente, ahora)).toBe(false);
  });

  it("justo en el umbral cuenta como estancado", () => {
    const justo = new Date(ahora - DIAS_BORRADOR_ESTANCADO * 86_400_000).toISOString();
    expect(borradorEstancado("borrador", justo, ahora)).toBe(true);
  });

  it("una operación PUBLICADA vieja no está estancada (está trabajando)", () => {
    expect(borradorEstancado("disponible", viejo, ahora)).toBe(false);
    expect(borradorEstancado("cerrada", viejo, ahora)).toBe(false);
  });

  it("sin fecha no se inventa un estancamiento", () => {
    expect(borradorEstancado("borrador", null, ahora)).toBe(false);
  });
});

describe("proporcion (honestidad: sin muestra no hay porcentaje)", () => {
  it("calcula la fracción", () => {
    expect(proporcion(3, 4)).toBe(0.75);
  });

  it("total 0 → null, NUNCA 0 (no medido ≠ convierte mal)", () => {
    expect(proporcion(0, 0)).toBeNull();
    expect(proporcion(5, 0)).toBeNull();
  });

  it("total negativo o no numérico → null", () => {
    expect(proporcion(1, -2)).toBeNull();
    expect(proporcion(Number.NaN, 10)).toBeNull();
  });

  it("no recorta por encima de 1: una inconsistencia se ve, no se esconde", () => {
    expect(proporcion(5, 4)).toBe(1.25);
  });
});

describe("promedio", () => {
  it("promedia la muestra", () => {
    expect(promedio([10, 20, 30])).toBe(20);
  });

  it("muestra vacía → null (no hay ticket promedio, no es 0)", () => {
    expect(promedio([])).toBeNull();
  });

  it("descarta valores no numéricos sin romper el promedio", () => {
    expect(promedio([10, Number.NaN, 30])).toBe(20);
  });

  it("solo valores no numéricos → null", () => {
    expect(promedio([Number.NaN])).toBeNull();
  });
});

describe("ordenarPorCarga", () => {
  const base: Omit<CargaAsesor, "asesorId" | "nombre" | "clientes" | "comprometido"> = {
    clientesSinActividad: 0,
    reservasActivas: 0,
    moneda: "USD",
    multiMoneda: false,
    financiadas: 0,
  };
  const filas: CargaAsesor[] = [
    { ...base, asesorId: "a", nombre: "Ana", clientes: 2, comprometido: 100 },
    { ...base, asesorId: "b", nombre: "Beto", clientes: 9, comprometido: 50 },
    { ...base, asesorId: "c", nombre: "Caro", clientes: 2, comprometido: 900 },
  ];

  it("primero el que más clientes tiene (a quien hay que aliviar)", () => {
    expect(ordenarPorCarga(filas).map((f) => f.asesorId)).toEqual(["b", "c", "a"]);
  });

  it("no muta el arreglo original", () => {
    const copia = [...filas];
    ordenarPorCarga(filas);
    expect(filas).toEqual(copia);
  });

  it("empate total → orden estable por nombre", () => {
    const empate: CargaAsesor[] = [
      { ...base, asesorId: "z", nombre: "Zoe", clientes: 1, comprometido: 0 },
      { ...base, asesorId: "m", nombre: "Mia", clientes: 1, comprometido: 0 },
    ];
    expect(ordenarPorCarga(empate).map((f) => f.nombre)).toEqual(["Mia", "Zoe"]);
  });
});
