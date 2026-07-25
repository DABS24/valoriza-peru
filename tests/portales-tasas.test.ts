/**
 * Tests del modelo de tasa de los PORTALES (lib/portales/tasas.ts).
 *
 * La fuente única es la ganancia MENSUAL (%). TNA y TEA se DERIVAN de ella y NO se
 * guardan (single source of truth). Este test ancla las dos fórmulas y el redondeo
 * a 2 decimales, para que un refactor no las desincronice del display.
 *
 *   TNA = tasa_mensual × 12                    (nominal: suma simple de 12 meses)
 *   TEA = ((1 + tasa_mensual/100)^12 − 1)×100  (efectiva: capitaliza mes a mes)
 */

import { describe, expect, it } from "vitest";

import {
  tasasDerivadas,
  pctTasa,
  gananciaAlPlazo,
  coberturaGarantia,
  coberturaTexto,
  costoEmpresario,
  cronogramaEmpresario,
  referenciaCostoEmpresario,
} from "@/lib/portales/tasas";

describe("tasasDerivadas", () => {
  it("2% mensual → TNA 24%, TEA 26.82% (capitalización mensual)", () => {
    const { tnaPct, teaPct } = tasasDerivadas(2);
    expect(tnaPct).toBe(24);
    expect(teaPct).toBe(26.82); // (1.02^12 − 1) × 100 = 26.824… → 26.82
  });

  it("TNA es la suma simple mensual × 12", () => {
    expect(tasasDerivadas(1.7).tnaPct).toBe(20.4);
    expect(tasasDerivadas(3.5).tnaPct).toBe(42);
    expect(tasasDerivadas(1).tnaPct).toBe(12);
  });

  it("TEA capitaliza y siempre es ≥ TNA para tasas positivas", () => {
    for (const m of [1, 1.7, 2, 2.9, 3.5]) {
      const { tnaPct, teaPct } = tasasDerivadas(m);
      const teaEsperada = Math.round((Math.pow(1 + m / 100, 12) - 1) * 100 * 100) / 100;
      expect(teaPct).toBe(teaEsperada);
      expect(teaPct).toBeGreaterThanOrEqual(tnaPct);
    }
  });

  it("redondea a 2 decimales (no más)", () => {
    const { teaPct } = tasasDerivadas(2.9);
    // 2 decimales como máximo: value × 100 debe ser entero.
    expect(Number.isInteger(Math.round(teaPct * 100)) && teaPct * 100 === Math.round(teaPct * 100)).toBe(true);
  });

  it("0% mensual → TNA 0, TEA 0 (no explota con cero)", () => {
    const { tnaPct, teaPct } = tasasDerivadas(0);
    expect(tnaPct).toBe(0);
    expect(teaPct).toBe(0);
  });
});

describe("pctTasa (formato de display)", () => {
  it("null / undefined / no-finito → null", () => {
    expect(pctTasa(null)).toBeNull();
    expect(pctTasa(undefined)).toBeNull();
    expect(pctTasa(Number.NaN)).toBeNull();
    expect(pctTasa(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("entero → sin decimales; decimal → 2 decimales", () => {
    expect(pctTasa(24)).toBe("24%");
    expect(pctTasa(26.82)).toBe("26.82%");
    expect(pctTasa(0)).toBe("0%");
  });

  it("NO redondea a 1 decimal: 1.75 se ve igual para el staff y para el empresario", () => {
    // Regresión: un segundo formateador con toFixed(1) mostraba "1.8%" en la card
    // del empresario y "1.75%" en el form del staff — el MISMO número, y en la
    // pantalla del empresario ese número es su costo.
    expect(pctTasa(1.75)).toBe("1.75%");
    expect(pctTasa(8.25)).toBe("8.25%");
  });
});

describe("gananciaAlPlazo (interés simple mensual — la ganancia REAL del período)", () => {
  it("S/10,000 al 2% mensual por 4 meses → 8%, 800, total 10,800", () => {
    const g = gananciaAlPlazo(10000, 2, 4);
    expect(g.gananciaPct).toBe(8);
    expect(g.gananciaMonto).toBe(800);
    expect(g.total).toBe(10800);
  });

  it("es interés SIMPLE, no capitaliza (12 meses ≠ TEA)", () => {
    // 12 meses al 2% simple = 24% (la TNA), NO la TEA (26.82%). Es el punto: al
    // plazo se gana el simple, no la efectiva anual.
    const g = gananciaAlPlazo(1000, 2, 12);
    expect(g.gananciaPct).toBe(24);
    expect(g.gananciaMonto).toBe(240);
    expect(g.total).toBe(1240);
  });

  it("gananciaPct = tasaMensual × meses; gananciaMonto proporcional al monto", () => {
    expect(gananciaAlPlazo(5000, 1.5, 6).gananciaPct).toBe(9);
    expect(gananciaAlPlazo(5000, 1.5, 6).gananciaMonto).toBe(450);
    expect(gananciaAlPlazo(20000, 3, 2).gananciaMonto).toBe(1200);
  });

  it("entradas inválidas → ceros, nunca NaN (monto conserva si es positivo)", () => {
    expect(gananciaAlPlazo(0, 2, 4)).toEqual({ gananciaPct: 0, gananciaMonto: 0, total: 0 });
    expect(gananciaAlPlazo(1000, 2, 0)).toEqual({ gananciaPct: 0, gananciaMonto: 0, total: 1000 });
    expect(gananciaAlPlazo(Number.NaN, 2, 4).gananciaMonto).toBe(0);
    expect(gananciaAlPlazo(1000, -1, 4).gananciaMonto).toBe(0);
  });
});

describe("coberturaGarantia (cuántas veces el respaldo cubre la inversión)", () => {
  it("suma valores estimados ÷ monto", () => {
    const c = coberturaGarantia(
      [{ valorEstimado: 15000 }, { valorEstimado: 6000 }],
      10000,
    );
    expect(c.totalGarantias).toBe(21000);
    expect(c.veces).toBe(2.1);
    expect(c.cuenta).toBe(2);
  });

  it("ignora garantías sin valor (null / 0 / negativo)", () => {
    const c = coberturaGarantia(
      [{ valorEstimado: 20000 }, { valorEstimado: null }, { valorEstimado: 0 }],
      10000,
    );
    expect(c.totalGarantias).toBe(20000);
    expect(c.cuenta).toBe(1);
    expect(c.veces).toBe(2);
  });

  it("monto ≤ 0 o sin garantías con valor → veces 0", () => {
    expect(coberturaGarantia([{ valorEstimado: 5000 }], 0).veces).toBe(0);
    expect(coberturaGarantia([], 10000).veces).toBe(0);
    expect(coberturaGarantia([{ valorEstimado: null }], 10000).veces).toBe(0);
  });
});

describe("coberturaTexto (display)", () => {
  it("formatea el múltiplo; ≤ 0 → null", () => {
    expect(coberturaTexto(2.1)).toBe("2.1×");
    expect(coberturaTexto(3)).toBe("3×");
    expect(coberturaTexto(0)).toBeNull();
    expect(coberturaTexto(Number.NaN)).toBeNull();
  });
});

describe("costoEmpresario (costo del prestatario, esquema bullet/interest-only)", () => {
  it("el ejemplo de la minuta: 100, comisión 8%, 2% mensual, 4 meses", () => {
    const c = costoEmpresario(100, 8, 2, 4);
    expect(c.comisionMonto).toBe(8);
    expect(c.recibeNeto).toBe(92); // recibe monto − comisión
    expect(c.cuotaMensualInteres).toBe(2); // monto × tasa_mensual%
    expect(c.interesTotal).toBe(8); // cuota × meses
    expect(c.capitalAlFinal).toBe(100); // devuelve el capital completo
    expect(c.costoTotal).toBe(16); // comisión + interés (NO el capital)
  });

  it("caso realista S/100,000 · comisión 5% · 1.8% mensual · 6 meses", () => {
    const c = costoEmpresario(100000, 5, 1.8, 6);
    expect(c.comisionMonto).toBe(5000);
    expect(c.recibeNeto).toBe(95000);
    // 1.8% cae en imprecisión de punto flotante; el display redondea con formatters.
    expect(c.cuotaMensualInteres).toBeCloseTo(1800, 6);
    expect(c.interesTotal).toBeCloseTo(10800, 6);
    expect(c.costoTotal).toBeCloseTo(15800, 6);
    expect(c.capitalAlFinal).toBe(100000);
  });

  it("datos incompletos: sin comisión ni tasa ni plazo → solo monto, costo 0", () => {
    const c = costoEmpresario(50000, null, null, null);
    expect(c.comisionMonto).toBe(0);
    expect(c.recibeNeto).toBe(50000); // sin comisión, recibe todo
    expect(c.interesTotal).toBe(0);
    expect(c.costoTotal).toBe(0);
    expect(c.capitalAlFinal).toBe(50000);
  });

  it("nunca NaN: monto no finito → todo 0", () => {
    const c = costoEmpresario(Number.NaN, 5, 2, 4);
    expect(c.monto).toBe(0);
    expect(c.recibeNeto).toBe(0);
    expect(c.costoTotal).toBe(0);
  });
});

describe("cronogramaEmpresario (simulación bullet)", () => {
  const desde = new Date("2026-01-15T00:00:00.000Z");

  it("N cuotas de solo interés + capital en la última", () => {
    const filas = cronogramaEmpresario(100000, 2, 4, desde);
    expect(filas).toHaveLength(4);
    // Las 3 primeras: solo interés (2000), capital 0.
    for (const f of filas.slice(0, 3)) {
      expect(f.interes).toBe(2000);
      expect(f.capital).toBe(0);
      expect(f.total).toBe(2000);
    }
    // La última: interés + TODO el capital.
    const ultima = filas[3];
    expect(ultima.interes).toBe(2000);
    expect(ultima.capital).toBe(100000);
    expect(ultima.total).toBe(102000);
  });

  it("las fechas avanzan un mes por cuota desde `desde`", () => {
    const filas = cronogramaEmpresario(1000, 1, 3, desde);
    expect(filas.map((f) => f.fechaISO.slice(0, 7))).toEqual([
      "2026-02",
      "2026-03",
      "2026-04",
    ]);
  });

  it("entradas inválidas → []", () => {
    expect(cronogramaEmpresario(0, 2, 4, desde)).toEqual([]);
    expect(cronogramaEmpresario(1000, 2, 0, desde)).toEqual([]);
    expect(cronogramaEmpresario(null, 2, 4, desde)).toEqual([]);
  });
});

/**
 * La referencia de la PRE-CALIFICACIÓN: qué interés y qué comisión se usan para
 * simular antes de que el staff fije las condiciones. La regla que ancla este bloque
 * es de honestidad, no de aritmética: lo que no está definido queda en NULL (la UI
 * dice "por definir"), nunca en 0 —un 0 diría que recibe el 100 % y que no cuesta—.
 */
describe("referenciaCostoEmpresario (pre-calificación del empresario)", () => {
  const op = (createdAt: string, tasaMensual: number | null, comisionPct: number | null) => ({
    createdAt,
    tasaMensual,
    comisionPct,
  });

  it("sin operaciones → sin referencia (null, NUNCA 0)", () => {
    const r = referenciaCostoEmpresario([]);
    expect(r.tasaMensual).toBeNull();
    expect(r.comisionPct).toBeNull();
    expect(r.basadaEnOps).toBe(0);
  });

  it("toma los parámetros de la operación MÁS RECIENTE, sin confiar en el orden de entrada", () => {
    const r = referenciaCostoEmpresario([
      op("2026-01-10T00:00:00Z", 1.5, 5),
      op("2026-06-10T00:00:00Z", 2.2, 8),
      op("2026-03-10T00:00:00Z", 1.9, 6),
    ]);
    expect(r.tasaMensual).toBe(2.2);
    expect(r.comisionPct).toBe(8);
    expect(r.basadaEnOps).toBe(1);
  });

  it("un parámetro que nunca se definió queda en null (no se rellena con 0)", () => {
    const r = referenciaCostoEmpresario([op("2026-06-10T00:00:00Z", 2, null)]);
    expect(r.tasaMensual).toBe(2);
    expect(r.comisionPct).toBeNull();
  });

  it("completa por parámetro: la comisión sale de la op anterior que sí la tenga", () => {
    const r = referenciaCostoEmpresario([
      op("2026-06-10T00:00:00Z", 2.5, null),
      op("2026-02-10T00:00:00Z", 1.8, 7),
    ]);
    expect(r.tasaMensual).toBe(2.5);
    expect(r.comisionPct).toBe(7);
    expect(r.basadaEnOps).toBe(2);
  });

  it("ignora operaciones sin ningún parámetro definido", () => {
    const r = referenciaCostoEmpresario([
      op("2026-06-10T00:00:00Z", null, null),
      op("2026-05-10T00:00:00Z", null, null),
    ]);
    expect(r.basadaEnOps).toBe(0);
    expect(r.tasaMensual).toBeNull();
  });
});
