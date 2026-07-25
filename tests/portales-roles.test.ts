/**
 * Tests de los roles de los PORTALES (lib/portales/roles.ts).
 *
 * Lo importante que anclan estos tests (mínimo privilegio real):
 *   · el EMPRESARIO NO es cliente (no cae en la superficie del inversionista:
 *     reservar, catálogo) — regresión del hardening 0081.
 *   · el EMPRESARIO NO es staff.
 *   · un rol DESCONOCIDO no es cliente ni staff (no "cliente por defecto").
 *   · el rango jerárquico: empresario < cliente < asesor < admin.
 */

import { describe, expect, it } from "vitest";

import {
  esStaffPortal,
  esClientePortal,
  esEmpresario,
  esAdminPortal,
  RANGO_PORTAL_ROL,
  PORTAL_ROLES,
  type PortalRol,
} from "@/lib/portales/roles";

describe("esStaffPortal", () => {
  it("asesor y admin son staff; cliente y empresario NO", () => {
    expect(esStaffPortal("asesor")).toBe(true);
    expect(esStaffPortal("admin")).toBe(true);
    expect(esStaffPortal("cliente")).toBe(false);
    expect(esStaffPortal("empresario")).toBe(false);
  });

  it("null / undefined / desconocido no son staff", () => {
    expect(esStaffPortal(null)).toBe(false);
    expect(esStaffPortal(undefined)).toBe(false);
    expect(esStaffPortal("root" as PortalRol)).toBe(false);
  });
});

describe("esClientePortal", () => {
  it("SOLO el cliente es cliente; el empresario NO (no accede al lado inversionista)", () => {
    expect(esClientePortal("cliente")).toBe(true);
    expect(esClientePortal("empresario")).toBe(false);
    expect(esClientePortal("asesor")).toBe(false);
    expect(esClientePortal("admin")).toBe(false);
  });

  it("un rol desconocido NO es cliente (mínimo privilegio, no 'cliente por defecto')", () => {
    expect(esClientePortal(null)).toBe(false);
    expect(esClientePortal(undefined)).toBe(false);
    expect(esClientePortal("otro" as PortalRol)).toBe(false);
  });
});

describe("esEmpresario / esAdminPortal", () => {
  it("esEmpresario es exacto", () => {
    expect(esEmpresario("empresario")).toBe(true);
    expect(esEmpresario("cliente")).toBe(false);
    expect(esEmpresario("admin")).toBe(false);
    expect(esEmpresario(null)).toBe(false);
  });

  it("esAdminPortal es exacto", () => {
    expect(esAdminPortal("admin")).toBe(true);
    expect(esAdminPortal("asesor")).toBe(false);
    expect(esAdminPortal(null)).toBe(false);
  });
});

describe("RANGO_PORTAL_ROL", () => {
  it("empresario < cliente < asesor < admin", () => {
    expect(RANGO_PORTAL_ROL.empresario).toBeLessThan(RANGO_PORTAL_ROL.cliente);
    expect(RANGO_PORTAL_ROL.cliente).toBeLessThan(RANGO_PORTAL_ROL.asesor);
    expect(RANGO_PORTAL_ROL.asesor).toBeLessThan(RANGO_PORTAL_ROL.admin);
  });

  it("cada rol declarado tiene un rango", () => {
    for (const rol of PORTAL_ROLES) {
      expect(typeof RANGO_PORTAL_ROL[rol]).toBe("number");
    }
  });
});
