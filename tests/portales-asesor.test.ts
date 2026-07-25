/**
 * Tests de los helpers PUROS de la cartera del asesor (lib/portales/asesor.ts).
 *
 * Anclan las derivaciones que alimentan las alertas, la ficha 360 y los KPIs en
 * dinero: urgencia de una reserva (<6h), fecha aproximada de cobro (financiamiento
 * + plazo), normalización de teléfono para wa.me, estados comprometidos y el paso
 * del timeline. Todo determinista (se inyecta `ahora`), sin tocar la base.
 */

import { describe, expect, it } from "vitest";

import {
  HORAS_HOLD_RESERVA,
  HORAS_RESERVA_URGENTE,
  monedaDominante,
  reservaUrgente,
  fechaCobroAprox,
  esComprometida,
  telefonoWa,
  timelineDeReserva,
  limiteRecordatoriosISO,
  recordatorioVencido,
  fechaRecordatorioISO,
  refTitular,
  nombreTitular,
  hrefTitular,
} from "@/lib/portales/asesor";

describe("reservaUrgente (<6h o ya vencida)", () => {
  const ahora = new Date("2026-07-24T12:00:00.000Z").getTime();

  it("vence en menos de 6h → urgente", () => {
    const en3h = new Date(ahora + 3 * 3_600_000).toISOString();
    expect(reservaUrgente(en3h, ahora)).toBe(true);
  });

  it("vence en más de 6h → NO urgente", () => {
    const en10h = new Date(ahora + 10 * 3_600_000).toISOString();
    expect(reservaUrgente(en10h, ahora)).toBe(false);
  });

  it("ya vencida (pasado) → urgente (lo más urgente)", () => {
    const hace1h = new Date(ahora - 3_600_000).toISOString();
    expect(reservaUrgente(hace1h, ahora)).toBe(true);
  });

  it("el umbral exacto (6h) cuenta como urgente (<=)", () => {
    const justo = new Date(ahora + HORAS_RESERVA_URGENTE * 3_600_000).toISOString();
    expect(reservaUrgente(justo, ahora)).toBe(true);
  });

  it("fecha inválida → false (no rompe la UI)", () => {
    expect(reservaUrgente("no-es-fecha", ahora)).toBe(false);
  });

  it("una reserva recién tomada (hold completo) NO nace urgente", () => {
    // El umbral de urgencia solo significa algo si es una FRACCIÓN del hold: si
    // alguna vez lo alcanzara, toda reserva saldría en rojo desde el minuto cero y
    // el panel de alertas dejaría de distinguir lo que de verdad está por vencer.
    expect(HORAS_RESERVA_URGENTE).toBeGreaterThan(0);
    expect(HORAS_RESERVA_URGENTE).toBeLessThan(HORAS_HOLD_RESERVA);
    const recienTomada = new Date(ahora + HORAS_HOLD_RESERVA * 3_600_000).toISOString();
    expect(reservaUrgente(recienTomada, ahora)).toBe(false);
  });
});

describe("fechaCobroAprox (financiada_en + plazo)", () => {
  it("suma el plazo en meses al desembolso", () => {
    const cobro = fechaCobroAprox("2026-01-15T00:00:00.000Z", 4);
    expect(cobro?.slice(0, 7)).toBe("2026-05");
  });

  it("plazo que cruza de año", () => {
    const cobro = fechaCobroAprox("2026-11-10T00:00:00.000Z", 3);
    expect(cobro?.slice(0, 7)).toBe("2027-02");
  });

  it("sin financiamiento o sin plazo → null (nunca fecha inventada)", () => {
    expect(fechaCobroAprox(null, 4)).toBeNull();
    expect(fechaCobroAprox("2026-01-15T00:00:00.000Z", null)).toBeNull();
    expect(fechaCobroAprox("2026-01-15T00:00:00.000Z", 0)).toBeNull();
  });

  it("fecha inválida → null", () => {
    expect(fechaCobroAprox("basura", 4)).toBeNull();
  });
});

describe("esComprometida (activa + confirmada comprometen dinero)", () => {
  it("activa y confirmada → true", () => {
    expect(esComprometida("activa")).toBe(true);
    expect(esComprometida("confirmada")).toBe(true);
  });

  it("expirada y cancelada → false", () => {
    expect(esComprometida("expirada")).toBe(false);
    expect(esComprometida("cancelada")).toBe(false);
  });
});

describe("telefonoWa (E.164 sin '+' para wa.me)", () => {
  it("móvil peruano de 9 dígitos recibe el prefijo 51", () => {
    expect(telefonoWa("987654321")).toBe("51987654321");
    expect(telefonoWa("987 654 321")).toBe("51987654321");
  });

  it("con código país ya presente se respeta", () => {
    expect(telefonoWa("+51 987 654 321")).toBe("51987654321");
    expect(telefonoWa("51987654321")).toBe("51987654321");
  });

  it("null / vacío / sin dígitos → null", () => {
    expect(telefonoWa(null)).toBeNull();
    expect(telefonoWa("")).toBeNull();
    expect(telefonoWa("sin numero")).toBeNull();
  });
});

describe("timelineDeReserva (paso derivado del estado + financiada_en)", () => {
  it("financiada_en presente → financiada (gana sobre el estado)", () => {
    expect(timelineDeReserva("confirmada", "2026-05-01T00:00:00.000Z")).toBe("financiada");
    expect(timelineDeReserva("activa", "2026-05-01T00:00:00.000Z")).toBe("financiada");
  });

  it("confirmada sin financiar → confirmada", () => {
    expect(timelineDeReserva("confirmada", null)).toBe("confirmada");
  });

  it("activa sin financiar → reservada", () => {
    expect(timelineDeReserva("activa", null)).toBe("reservada");
  });
});

describe("limiteRecordatoriosISO (corte = fin del día de hoy)", () => {
  it("devuelve el mismo día a las 23:59:59.999 locales", () => {
    const ahora = new Date(2026, 6, 24, 9, 30, 0).getTime(); // 24-jul-2026 09:30 local
    const d = new Date(limiteRecordatoriosISO(ahora));
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(24);
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
  });

  it("el corte nunca queda ANTES del momento actual", () => {
    const ahora = new Date(2026, 6, 24, 23, 0, 0).getTime();
    expect(new Date(limiteRecordatoriosISO(ahora)).getTime()).toBeGreaterThanOrEqual(ahora);
  });
});

describe("recordatorioVencido (recordar_en <= hoy y no hecha)", () => {
  const ahora = new Date(2026, 6, 24, 9, 0, 0).getTime(); // 24-jul-2026 09:00 local
  const hoyTarde = new Date(2026, 6, 24, 18, 0, 0).toISOString();
  const manana = new Date(2026, 6, 25, 9, 0, 0).toISOString();
  const ayer = new Date(2026, 6, 23, 9, 0, 0).toISOString();

  it("para HOY (aunque sea más tarde) ya cuenta como pendiente", () => {
    expect(recordatorioVencido(hoyTarde, false, ahora)).toBe(true);
  });

  it("de días pasados → pendiente", () => {
    expect(recordatorioVencido(ayer, false, ahora)).toBe(true);
  });

  it("para mañana → todavía no", () => {
    expect(recordatorioVencido(manana, false, ahora)).toBe(false);
  });

  it("ya marcada como hecha → nunca pendiente", () => {
    expect(recordatorioVencido(ayer, true, ahora)).toBe(false);
  });

  it("sin fecha o fecha inválida → false (no rompe la UI)", () => {
    expect(recordatorioVencido(null, false, ahora)).toBe(false);
    expect(recordatorioVencido("no-es-fecha", false, ahora)).toBe(false);
  });
});

describe("fechaRecordatorioISO (input date → ISO a mediodía local)", () => {
  it("conserva el DÍA elegido en local (no se corre a la víspera)", () => {
    const iso = fechaRecordatorioISO("2026-07-26");
    expect(iso).not.toBeNull();
    const d = new Date(iso!);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(26);
    expect(d.getHours()).toBe(12);
  });

  it("vacío / formato raro → null", () => {
    expect(fechaRecordatorioISO(null)).toBeNull();
    expect(fechaRecordatorioISO("")).toBeNull();
    expect(fechaRecordatorioISO("26/07/2026")).toBeNull();
  });

  it("fecha que no existe en el calendario → null (nunca desborda de mes)", () => {
    expect(fechaRecordatorioISO("2026-02-31")).toBeNull();
    expect(fechaRecordatorioISO("2026-13-01")).toBeNull();
  });
});

describe("monedaDominante (agregar montos SIN mezclar monedas)", () => {
  it("cartera vacía → 0 PEN, sin multiMoneda", () => {
    expect(monedaDominante([])).toEqual({
      moneda: "PEN",
      comprometido: 0,
      extra: 0,
      multiMoneda: false,
    });
  });

  it("una sola moneda → suma todo, multiMoneda false", () => {
    const r = monedaDominante([
      { moneda: "USD", comprometido: 100, extra: 8 },
      { moneda: "USD", comprometido: 250, extra: 20 },
    ]);
    expect(r).toEqual({ moneda: "USD", comprometido: 350, extra: 28, multiMoneda: false });
  });

  it("mezcla PEN+USD → devuelve la de MAYOR comprometido y NO las suma", () => {
    const r = monedaDominante([
      { moneda: "PEN", comprometido: 100 },
      { moneda: "USD", comprometido: 900 },
      { moneda: "USD", comprometido: 100 },
    ]);
    // USD domina (1000 > 100); el total es solo USD, nunca 1100 mezclado.
    expect(r.moneda).toBe("USD");
    expect(r.comprometido).toBe(1000);
    expect(r.multiMoneda).toBe(true);
  });

  it("empate de comprometido → desempata a PEN (estable)", () => {
    const r = monedaDominante([
      { moneda: "USD", comprometido: 500 },
      { moneda: "PEN", comprometido: 500 },
    ]);
    expect(r.moneda).toBe("PEN");
    expect(r.comprometido).toBe(500);
    expect(r.multiMoneda).toBe(true);
  });

  it("extra (ganancia/comisión) se agrega solo dentro de la moneda dominante", () => {
    const r = monedaDominante([
      { moneda: "PEN", comprometido: 1000, extra: 50 },
      { moneda: "USD", comprometido: 10, extra: 1 },
    ]);
    expect(r.moneda).toBe("PEN");
    expect(r.extra).toBe(50);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TITULAR de una reserva/nota (0090): miembro con cuenta o prospecto sin cuenta.
// El caso que más importa es el CONVERTIDO, donde la fila lleva las dos
// referencias: si ganara el prospecto, la cola del asesor enlazaría a una ficha
// que ya no es la vigente.
// ─────────────────────────────────────────────────────────────────────────────

describe("refTitular (la cuenta manda sobre la procedencia)", () => {
  it("solo cliente → titular cliente", () => {
    expect(refTitular("u1", null)).toEqual({ tipo: "cliente", id: "u1" });
  });

  it("solo prospecto → titular prospecto", () => {
    expect(refTitular(null, "p1")).toEqual({ tipo: "prospecto", id: "p1" });
  });

  it("YA CONVERTIDO (los dos) → gana la cuenta, no la procedencia", () => {
    expect(refTitular("u1", "p1")).toEqual({ tipo: "cliente", id: "u1" });
  });

  it("ninguno → null (la base ya no lo permite, pero la UI no revienta)", () => {
    expect(refTitular(null, null)).toBeNull();
    expect(refTitular(undefined, undefined)).toBeNull();
  });
});

describe("nombreTitular (busca en el mapa de SU tipo)", () => {
  const clientes = new Map([["u1", "Cliente Uno"]]);
  const prospectos = new Map([["p1", "Prospecto Uno"]]);

  it("cliente → nombre del mapa de clientes", () => {
    expect(nombreTitular({ tipo: "cliente", id: "u1" }, clientes, prospectos)).toBe("Cliente Uno");
  });

  it("prospecto → nombre del mapa de prospectos", () => {
    expect(nombreTitular({ tipo: "prospecto", id: "p1" }, clientes, prospectos)).toBe(
      "Prospecto Uno",
    );
  });

  it("no cruza los mapas: un id de prospecto NO se busca entre clientes", () => {
    expect(nombreTitular({ tipo: "cliente", id: "p1" }, clientes, prospectos)).toBe("—");
  });

  it("sin titular o sin nombre → guion, nunca un id crudo", () => {
    expect(nombreTitular(null, clientes, prospectos)).toBe("—");
    expect(nombreTitular({ tipo: "prospecto", id: "zz" }, clientes, prospectos)).toBe("—");
  });
});

describe("hrefTitular (cada tipo, su ruta)", () => {
  it("cliente → ficha de clientes", () => {
    expect(hrefTitular("/garantiahipotecaria", { tipo: "cliente", id: "u1" })).toBe(
      "/garantiahipotecaria/asesor/clientes/u1",
    );
  });

  it("prospecto → ficha de prospectos", () => {
    expect(hrefTitular("/contratista", { tipo: "prospecto", id: "p1" })).toBe(
      "/contratista/asesor/prospectos/p1",
    );
  });

  it("sin titular → null (la UI no pinta un enlace roto)", () => {
    expect(hrefTitular("/contratista", null)).toBeNull();
  });
});
