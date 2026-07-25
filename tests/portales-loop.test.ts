/**
 * "Cerrar el loop" de los portales — piezas puras del ciclo entre roles.
 *
 * Cubre lo verificable sin DB:
 *   1. Las plantillas de correo de portal llevan la MARCA del portal en el asunto
 *      (GarantizaPeru / ValorizaPeru), el título de la oportunidad en cuerpo/HTML,
 *      y salen multipart (html + text) para entregabilidad.
 *   2. registrarEventoPortal es best-effort: NUNCA lanza aunque el sink falle.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  correoPortalAcceso,
  correoPortalReservaAsesor,
  correoPortalReservaConfirmada,
} from "@/lib/email/templates";

const leer = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("correos de portal · marca + contenido", () => {
  it("aviso al asesor: marca en el asunto y oportunidad en el cuerpo (html + text)", () => {
    const { subject, html, text } = correoPortalReservaAsesor({
      marca: "ValorizaPeru",
      oportunidad: "Obra San Isidro",
      url: "https://valorizaperu.com/asesor/reservas",
    });
    expect(subject).toContain("ValorizaPeru");
    expect(html).toContain("Obra San Isidro");
    expect(text).toContain("Obra San Isidro");
    // Header del correo pinta la marca del portal, no "Efectivo".
    expect(html).toContain("ValorizaPeru");
    expect(text.length).toBeGreaterThan(0);
  });

  it("confirmación al inversionista: marca y oportunidad presentes", () => {
    const { subject, html, text } = correoPortalReservaConfirmada({
      marca: "GarantizaPeru",
      oportunidad: "Casa Miraflores",
      url: "https://dongatoefectivo.com/garantiahipotecaria/cliente/oportunidades/abc",
    });
    expect(subject).toContain("GarantizaPeru");
    expect(html).toContain("Casa Miraflores");
    expect(text).toContain("Casa Miraflores");
  });
});

/**
 * El alta de un inversionista tiene que cerrar DENTRO del portal. La versión
 * anterior mandaba la plantilla de Efectivo con enlace a /nueva-clave de Efectivo:
 * el inversionista terminaba en un login donde no tiene perfil y nunca entraba.
 */
describe("alta de portal · el correo de acceso no arrastra nada de Efectivo", () => {
  const { subject, html, text } = correoPortalAcceso({
    marca: "GarantizaPeru",
    url: "https://dongatoefectivo.com/garantiahipotecaria/nueva-clave#access_token=x",
  });

  it("lleva la marca del portal en asunto, cuerpo y pie", () => {
    expect(subject).toContain("GarantizaPeru");
    expect(html).toContain("GarantizaPeru");
    expect(text).toContain("GarantizaPeru");
    expect(html).toContain("Operado por");
  });

  it("no lleva ícono de archivo ni un contacto general en el pie", () => {
    expect(html).not.toContain("/icon.png");
    expect(html).not.toContain("/icon.png");
    expect(html).not.toMatch(/hola@/);
    expect(text).not.toMatch(/hola@/);
  });

  it("el enlace del correo apunta a la pantalla de contraseña DEL portal", () => {
    for (const ruta of [
      "app/api/usuarios/route.ts",
      "app/api/prestatarios/[id]/cuenta/route.ts",
    ]) {
      const src = leer(ruta);
      // El portal está montado en la raíz: el enlace es `<origen>/nueva-clave`.
      expect(src).toMatch(/APP\.url\}\/nueva-clave/);
      expect(src).toMatch(/correoPortalAcceso/);
      expect(src).toMatch(/remitentePortal/);
      // El alta usa la plantilla del portal, no una de recuperación genérica.
      expect(src).not.toMatch(/correoRecuperacion/);
    }
  });
});

describe("registrarEventoPortal · best-effort (auditoría no tumba la acción)", () => {
  it("si el sink de auditoría falla, NO propaga el error", async () => {
    // Mockea el sink SSOT para que lance; la envoltura de portal debe tragarlo.
    vi.doMock("@/lib/data/auditoria-server", () => ({
      registrarEvento: vi.fn().mockRejectedValue(new Error("db down")),
    }));
    const { registrarEventoPortal } = await import("@/lib/portales/auditoria");
    await expect(
      registrarEventoPortal({
        portal: "cgh",
        actorId: "00000000-0000-0000-0000-000000000000",
        actorRol: "asesor",
        accion: "reserva_creada",
        entidad: "portal_reservas",
      }),
    ).resolves.toBeUndefined();
    vi.doUnmock("@/lib/data/auditoria-server");
  });
});
