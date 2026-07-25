/**
 * IDENTIDAD PROPIA del portal.
 *
 * Este archivo nació anclando las fugas de marca cuando el portal vivía dentro del
 * monorepo de Don Gato Efectivo. Al separarse, el aislamiento pasó a ser
 * estructural (el otro negocio ya no está en el repo), pero los asserts que
 * sobreviven siguen cuidando lo mismo: que la marca, el ícono, el contacto y el
 * copy salgan de la config del portal y no de un literal escrito a mano. Eso es lo
 * que se rompe solo cuando se renombra la marca.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { LISTA_PORTALES, waPortal } from "@/lib/portales/config";
import { portalMetadata } from "@/lib/portales/metadata";

const leer = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("pestaña e ícono del portal", () => {
  it("el título es absoluto: no lo envuelve el template de Efectivo", () => {
    for (const p of LISTA_PORTALES) {
      const meta = portalMetadata(p.slug);
      const title = meta.title as { absolute?: string; default?: string; template?: string };
      // `default` lo envolvería el template de un layout padre; solo `absolute` lo
      // ignora. Este fue el bug que dejaba "ValorizaPeru · Don Gato Efectivo" en la
      // pestaña cuando el portal vivía dentro del otro repo.
      expect(title.absolute).toBe(p.nombreCorto);
      expect(title.default).toBeUndefined();
      expect(title.template).toBe(`%s · ${p.nombreCorto}`);
    }
  });

  it("no publica descripción social ni tarjeta de enlace", () => {
    // El portal es por invitación: pegar su link en WhatsApp no debe mostrar
    // tarjeta de preview. `null` (no `undefined`) es lo que borra lo heredado.
    for (const p of LISTA_PORTALES) {
      const meta = portalMetadata(p.slug);
      expect(meta.description).toBe(p.tagline);
      expect(meta.applicationName).toBe(p.nombreCorto);
      expect(meta.openGraph).toBeNull();
      expect(meta.twitter).toBeNull();
    }
  });

  it("cada portal declara su propio ícono y va noindex", () => {
    for (const p of LISTA_PORTALES) {
      const meta = portalMetadata(p.slug);
      expect(JSON.stringify(meta.icons)).toContain("/icon");
      expect(meta.robots).toMatchObject({ index: false });
      // El ícono se genera desde la config (monograma + acento), no es un archivo
      // con la letra escrita a mano: renombrar el portal no debe dejarlo viejo.
      const icono = leer("app/icon.tsx");
      expect(icono).toMatch(/nombreCorto/);
      expect(icono).toMatch(/acentoPortalHex/);
    }
  });
});

describe("el HTML del portal no lleva marca de Efectivo", () => {
  it("el layout raíz no publica datos estructurados de marca", () => {
    // Un portal por invitación no se anuncia: sin JSON-LD de organización, y el
    // `robots: noindex` se declara en el layout raíz.
    const root = leer("app/layout.tsx");
    expect(root).not.toMatch(/JsonLd|application\/ld\+json/);
    expect(root).toMatch(/index: false/);
  });

  it("el login del portal no ofrece salida a la landing de Efectivo", () => {
    const login = leer("components/portales/PortalLogin.tsx");
    expect(login).not.toMatch(/href="\/"/);
  });
});

describe("canal de contacto propio", () => {
  it("el WhatsApp de las pantallas de portal sale de la config del portal", () => {
    for (const p of LISTA_PORTALES) {
      expect(waPortal(p.slug)).toContain(p.contacto.whatsapp);
    }
  });

  it("ninguna pantalla llama al canal general en vez del asesor asignado", () => {
    // `waLinkTo(...)` sí está permitido: es el celular del asesor o del cliente.
    for (const archivo of [
      "components/portales/PortalShell.tsx",
      "components/portales/cliente/AccionesReserva.tsx",
      "components/portales/cliente/ClienteDashboard.tsx",
      "components/portales/empresario/EmpresarioDashboard.tsx",
      "components/portales/empresario/SolicitudesEmpresario.tsx",
    ]) {
      expect(leer(archivo)).not.toMatch(/CONTACTO\.waLink\(/);
    }
  });
});

describe("copy sin cruces entre negocios", () => {
  it("las pantallas no leen un namespace de copy ajeno al portal", () => {
    for (const archivo of [
      "components/portales/PortalConfiguracion.tsx",
      "components/portales/PortalShell.tsx",
      "components/portales/PortalLogin.tsx",
      "components/portales/PortalNuevaClave.tsx",
    ]) {
      expect(leer(archivo)).not.toMatch(/COPY\.app\./);
    }
  });
});
