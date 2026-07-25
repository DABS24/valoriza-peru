/**
 * Transparencia de los portales: el bloque "cómo funciona el dinero".
 *
 * Lo que estos tests protegen no es el layout, es la ASIMETRÍA deliberada de la
 * comisión: al inversionista se le explica el MODELO (con quién firma, a quién
 * transfiere, qué cobra el intermediario y a quién) pero NUNCA la cifra, porque no
 * sale de su retorno; a la empresa se le muestra todo, porque es su costo.
 *
 * Un test de render lo hace fallar el día que alguien "complete" el bloque del
 * inversionista con el % o el monto de la comisión, que es el error natural: se ve
 * como más transparencia y es justamente lo que el negocio decidió no mostrar ahí.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { FlujoDinero } from "@/components/portales/FlujoDinero";
import { COPY } from "@/lib/copy";
import { APP } from "@/lib/constants";
import { PORTALES } from "@/lib/portales/config";

const F = COPY.portales.flujoDinero;

describe("FlujoDinero · inversionista", () => {
  it("explica con quién firma, a quién transfiere y quién paga la comisión", () => {
    const html = renderToStaticMarkup(<FlujoDinero faceta="inversionista" />);
    for (const paso of F.inversionista.pasos) {
      expect(html).toContain(paso.titulo);
    }
    expect(html).toContain(F.inversionista.titulo);
    expect(html).toContain(F.inversionista.nota);
  });

  it("nombra a la SAC como intermediario, no como parte del contrato", () => {
    const texto = F.inversionista.pasos.map((p) => p.detalle).join(" ");
    expect(texto).toContain(APP.legalName);
    expect(texto).toMatch(/no es parte del contrato/i);
    // La promesa dura del modelo: el dinero no pasa por una cuenta nuestra.
    expect(texto).toMatch(/no lo recibimos|no pasa por ninguna cuenta nuestra/i);
  });

  it("NO expone cifras de comisión: ni porcentaje ni monto", () => {
    const texto = [
      F.inversionista.titulo,
      F.inversionista.sub,
      F.inversionista.nota,
      ...F.inversionista.pasos.flatMap((p) => [p.titulo, p.detalle]),
    ].join(" ");
    expect(texto).not.toMatch(/\d/);
    expect(texto).not.toContain("%");
  });
});

describe("FlujoDinero · empresario", () => {
  it("deja claro que el desembolso son DOS transferencias", () => {
    const html = renderToStaticMarkup(<FlujoDinero faceta="empresario" />);
    expect(html).toContain(F.empresario.sub);
    for (const paso of F.empresario.pasos) {
      expect(html).toContain(paso.titulo);
    }
    // Y que el monto de la operación no pasa por una cuenta nuestra.
    expect(html).toContain(F.empresario.nota);
  });

  it("es la misma fuente de copy para las dos facetas (un solo modelo)", () => {
    expect(F.inversionista.pasos.length).toBeGreaterThan(0);
    expect(F.empresario.pasos.length).toBeGreaterThan(0);
    expect(F.inversionista.titulo).not.toBe(F.empresario.titulo);
  });
});

/**
 * Términos del portal. Es texto legal de un producto de dinero escrito SIN abogado:
 * el riesgo real no es que quede corto, es que alguien lo "complete" con cláusulas
 * inventadas (jurisdicción, arbitraje, renuncias) o con una afirmación de estar
 * autorizados o supervisados. Estos tests son ese candado.
 */
describe("Términos del portal", () => {
  const L = COPY.portales.terminos;
  const cuerpoDe = (marca: string) =>
    [L.sub(marca), ...L.secciones(marca).flatMap((s) => [s.titulo, s.cuerpo])].join(" ");

  it("se escribe con la marca del portal, no con una hardcodeada", () => {
    const texto = cuerpoDe("PortalDePrueba");
    expect(texto).toContain("PortalDePrueba");
    for (const p of Object.values(PORTALES)) {
      expect(texto).not.toContain(p.nombreCorto);
    }
  });

  it("dice los cuatro hechos que definen el modelo", () => {
    const texto = cuerpoDe("PortalDePrueba");
    expect(texto).toMatch(/por invitación/i); // portal privado
    expect(texto).toMatch(/no es parte de ese contrato/i); // contrato bilateral
    expect(texto).toMatch(/no custodia ni administra/i); // sin custodia de fondos
    expect(texto).toMatch(/comisión de intermediación/i); // y quién la paga
    expect(texto).toMatch(/la paga la empresa/i);
  });

  it("NO inventa cláusulas legales", () => {
    const texto = cuerpoDe("PortalDePrueba");
    expect(texto).not.toMatch(/arbitraje|jurisdicci|tribunal|indemniz|renuncia/i);
  });

  it("NO afirma estar autorizado, registrado ni supervisado", () => {
    const texto = cuerpoDe("PortalDePrueba");
    expect(texto).not.toMatch(/(autorizad|registrad|supervisad)[oa]s?\s+(por|ante)/i);
    // Lo único que se afirma sobre supervisión es la NEGATIVA.
    expect(texto).toMatch(/no se encuentra bajo la supervisión/i);
    expect(texto).toMatch(/\bSBS\b/);
    expect(texto).toMatch(/\bSMV\b/);
  });

  it("no duplica el aviso de riesgo: lo reusa del SSOT", () => {
    const texto = cuerpoDe("PortalDePrueba");
    expect(texto).not.toContain(COPY.portales.disclaimerCapital);
    // …y el SSOT sigue diciendo lo que la página promete mostrar.
    expect(COPY.portales.disclaimerCapital).toMatch(/pérdida de capital/i);
    expect(COPY.portales.cliente.recuperacion.advertencias.length).toBeGreaterThan(0);
  });
});
