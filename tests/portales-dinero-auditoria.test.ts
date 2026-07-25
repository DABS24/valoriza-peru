import { describe, expect, it } from "vitest";

import { coberturaGarantia, cronogramaEmpresario, sumarMeses } from "@/lib/portales/tasas";

/**
 * Ancla dos bugs de dinero que encontró la auditoría del 2026-07-25. Sin estos
 * tests, los dos vuelven: el primero es una línea que se borra sin querer, y el
 * segundo solo se manifiesta con fechas de fin de mes.
 */

describe("coberturaGarantia · nunca suma monedas distintas", () => {
  const enUSD = { valorEstimado: 200_000, moneda: "USD" };
  const enPEN = { valorEstimado: 300_000, moneda: "PEN" };

  it("descarta los respaldos en otra moneda que la operación", () => {
    const c = coberturaGarantia([enUSD, enPEN], 100_000, "USD");
    // Antes sumaba 500.000 y lo rotulaba "5x tu inversión" en dólares.
    expect(c.totalGarantias).toBe(200_000);
    expect(c.veces).toBe(2);
    expect(c.cuenta).toBe(1);
    expect(c.omitidas).toBe(1);
  });

  it("cuenta todo cuando las monedas coinciden", () => {
    const c = coberturaGarantia([enUSD, { valorEstimado: 50_000, moneda: "USD" }], 100_000, "USD");
    expect(c.totalGarantias).toBe(250_000);
    expect(c.omitidas).toBe(0);
  });

  it("ignora valores no informados sin contarlos como cero", () => {
    const c = coberturaGarantia([{ valorEstimado: null, moneda: "USD" }], 100_000, "USD");
    expect(c.cuenta).toBe(0);
    expect(c.veces).toBe(0);
  });
});

describe("sumarMeses · clampea al último día del mes destino", () => {
  it("31 de enero + 1 mes cae en febrero, no en marzo", () => {
    expect(
      sumarMeses(new Date(2026, 0, 31), 1)
        .toISOString()
        .slice(0, 10),
    ).toBe("2026-02-28");
  });

  it("30 de agosto + 6 meses cae en febrero", () => {
    expect(
      sumarMeses(new Date(2026, 7, 30), 6)
        .toISOString()
        .slice(0, 10),
    ).toBe("2027-02-28");
  });

  it("respeta el día cuando el mes destino lo tiene", () => {
    expect(
      sumarMeses(new Date(2026, 0, 15), 2)
        .toISOString()
        .slice(0, 10),
    ).toBe("2026-03-15");
  });
});

describe("cronogramaEmpresario · una cuota por mes calendario", () => {
  it("desde un 31, no repite mes ni saltea ninguno", () => {
    const filas = cronogramaEmpresario(100_000, 2, 6, new Date(2026, 0, 31));
    const meses = filas.map((f) => f.fechaISO.slice(0, 7));
    // Antes daba dos cuotas en marzo y ninguna en febrero.
    expect(new Set(meses).size).toBe(filas.length);
  });
});
