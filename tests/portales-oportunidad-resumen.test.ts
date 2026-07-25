/**
 * Tests del modelo de vista de una oportunidad (lib/portales/oportunidadResumen.ts).
 *
 * Es la derivación que comparten la card del inversionista, la del empresario, la
 * ficha y el PDF de la constancia: si acá se rompe algo, se rompe en las cuatro
 * superficies a la vez. Anclan que las diferencias entre verticales salgan de la
 * CONFIG (labels de stats, sufijo de la unidad, opciones de un select) y no de un
 * `if` escrito a mano en la card, y que un dato faltante muestre "—" en vez de
 * inventar un número.
 *
 * Todo determinista: los fixtures son objetos planos, no hay base ni fechas vivas.
 */

import { describe, expect, it } from "vitest";

import {
  campoDe,
  conSufijo,
  labelOpcion,
  plazoTexto,
  ubicacionSubtitulo,
  teaDe,
  resumenCard,
  numDato,
  strDato,
} from "@/lib/portales/oportunidadResumen";
import { PORTALES, PORTAL_SLUG } from "@/lib/portales/config";
import type { OportunidadLite } from "@/lib/portales/data";

/** Oportunidad mínima; cada test sobrescribe solo lo que le importa. */
function op(patch: Partial<OportunidadLite> = {}): OportunidadLite {
  return {
    id: "op-1",
    portal: PORTAL_SLUG,
    titulo: "Obra San Isidro",
    distrito: "San Isidro",
    ciudad: "Lima",
    moneda: "PEN",
    montoSolicitado: 9000,
    plazoMesesMin: 2,
    plazoMesesMax: 4,
    tasaMensual: 2,
    prestatarioId: null,
    prestatario: null,
    nivelRiesgo: null,
    rating: null,
    estadoPublicacion: "disponible",
    datos: {},
    createdAt: "2026-07-24T12:00:00.000Z",
    reservadoPor: null,
    reservadoHasta: null,
    portadaUrl: null,
    numFotos: 0,
    ...patch,
  };
}

describe("numDato / strDato (lectura del jsonb `datos`)", () => {
  it("numDato: numérico o string numérico → número; vacío/no numérico → null", () => {
    expect(numDato(120)).toBe(120);
    expect(numDato("120.5")).toBe(120.5);
    expect(numDato(0)).toBe(0); // 0 es un dato, no un vacío
    expect(numDato("")).toBeNull();
    expect(numDato(null)).toBeNull();
    expect(numDato(undefined)).toBeNull();
    expect(numDato("ochenta")).toBeNull();
  });

  it("strDato: recorta y descarta el string vacío", () => {
    expect(strDato("  Municipalidad de Lima  ")).toBe("Municipalidad de Lima");
    expect(strDato("   ")).toBeNull();
    expect(strDato(null)).toBeNull();
    expect(strDato(42)).toBe("42");
  });
});

describe("campoDe / conSufijo (la unidad la declara la vertical, no la pantalla)", () => {
  it("campoDe encuentra el campo de la vertical, o undefined", () => {
    expect(campoDe(PORTAL_SLUG, "plazo_contrato_meses")?.tipo).toBe("numero");
    expect(campoDe(PORTAL_SLUG, "campo_inventado")).toBeUndefined();
  });

  it("pega la unidad que venga; sin unidad, solo el número", () => {
    // La unidad es un parámetro, no una constante escrita en la card: una vertical
    // que mida en hectáreas o en kilómetros usa el mismo helper.
    expect(conSufijo(120, "m²")).toBe("120 m²");
    expect(conSufijo(4.5, "ha")).toBe("4.5 ha");
    expect(conSufijo(7)).toBe("7");
    expect(conSufijo(0, "m²")).toBe("0 m²");
  });
});

describe("labelOpcion (etiqueta de un select, desde la CONFIG)", () => {
  it("traduce el value a su label de config", () => {
    expect(labelOpcion(PORTAL_SLUG, "tipo_contrato", "obra")).toBe("Obra");
    expect(labelOpcion(PORTAL_SLUG, "tipo_contrato", "consultoria")).toBe("Consultoría");
  });

  it("un value que ya no está en la config se muestra crudo, no se oculta", () => {
    // Preferimos que el staff vea un valor raro a que la ficha mienta con un vacío.
    expect(labelOpcion(PORTAL_SLUG, "tipo_contrato", "trueque")).toBe("trueque");
  });

  it("campo que no es select (o que no existe) → el valor tal cual", () => {
    expect(labelOpcion(PORTAL_SLUG, "entidad_estatal", "  Municipalidad  ")).toBe("Municipalidad");
    expect(labelOpcion(PORTAL_SLUG, "campo_inventado", "x")).toBe("x");
    expect(labelOpcion(PORTAL_SLUG, "tipo_contrato", null)).toBeNull();
  });
});

describe("plazoTexto", () => {
  it("rango real → min–max; min = max → un solo valor", () => {
    expect(plazoTexto(2, 6, "meses")).toBe("2–6 meses");
    expect(plazoTexto(6, 6, "meses")).toBe("6 meses");
  });

  it("solo uno de los dos → ese; ninguno → null (nunca un plazo inventado)", () => {
    expect(plazoTexto(3, null, "meses")).toBe("3 meses");
    expect(plazoTexto(null, 5, "meses")).toBe("5 meses");
    expect(plazoTexto(null, null, "meses")).toBeNull();
  });
});

describe("ubicacionSubtitulo", () => {
  it("entidad estatal + tipo de contrato", () => {
    const { ubicacion, subtitulo } = ubicacionSubtitulo(null, "Arequipa", {
      entidad_estatal: "Municipalidad de Arequipa",
      tipo_contrato: "obra",
    });
    expect(ubicacion).toBe("Arequipa");
    expect(subtitulo).toContain("Municipalidad de Arequipa");
  });

  it("el subtítulo sigue a la CONFIG: la etiqueta del select no se escribe a mano", () => {
    // La expectativa se DERIVA de la config: si mañana cambia la etiqueta de un
    // tipo de contrato, este test falla si el subtítulo no la siguió.
    const label = PORTALES[PORTAL_SLUG].campos
      .find((c) => c.key === "tipo_contrato")
      ?.opciones?.find((o) => o.value === "servicios")?.label;
    expect(label).toBeTruthy();
    const { subtitulo } = ubicacionSubtitulo(null, null, { tipo_contrato: "servicios" });
    expect(subtitulo).toBe(label);
  });

  it("sin datos → null en ambos (no arma un subtítulo vacío ni con separadores sueltos)", () => {
    const r = ubicacionSubtitulo(null, null, {});
    expect(r.ubicacion).toBeNull();
    expect(r.subtitulo).toBeNull();
  });
});

describe("teaDe (badge de rentabilidad = TEA derivada de la mensual)", () => {
  it("2% mensual → 26.82% efectivo anual", () => {
    expect(teaDe(2)).toBe("26.82%");
  });

  it("sin tasa → null (la card muestra '—', no un 0%)", () => {
    expect(teaDe(null)).toBeNull();
    expect(teaDe(Number.NaN)).toBeNull();
  });
});

describe("resumenCard", () => {
  it("monto, plazo (con wrap) y TEA, con los labels de la config", () => {
    const r = resumenCard(op({ plazoMesesMin: 2, plazoMesesMax: 4 }), "meses");
    const cfg = PORTALES[PORTAL_SLUG].card;
    expect(r.stats[0].value).toBe("S/ 9,000");
    expect(r.stats[2].value).toBe("26.82%");
    expect(r.destacadoPct).toBe("26.82%");
    expect(r.stats.map((s) => s.label)).toEqual([cfg.stat1, cfg.stat2, cfg.stat3]);
    expect(r.stats[1].value).toBe("2–4 meses");
    // El plazo es texto, no dinero: no se trunca como un KPI.
    expect(r.stats[1].wrap).toBe(true);
  });

  it("dato faltante → '—', nunca un 0 ni el escenario más favorable", () => {
    // En esta vertical el stat del medio es el PLAZO, así que también se anula:
    // el test cuida que un dato ausente muestre "—" y no un 0 ni un rango inventado.
    const r = resumenCard(
      op({
        montoSolicitado: null,
        tasaMensual: null,
        plazoMesesMin: null,
        plazoMesesMax: null,
        datos: {},
      }),
      "meses",
    );
    expect(r.destacadoPct).toBeNull();
    expect(r.stats.map((s) => s.value)).toEqual(["—", "—", "—"]);
  });

  it("respeta la moneda de la operación (no asume soles)", () => {
    const r = resumenCard(op({ moneda: "USD", montoSolicitado: 8000 }), "meses");
    expect(r.stats[0].value).toBe("US$ 8,000");
  });
});
