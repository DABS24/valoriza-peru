/**
 * Render de los paneles del ADMIN a string (react-dom/server, sin browser). Anclan
 * el CONTRATO entre la data y el copy, que es donde estos paneles se rompen en
 * silencio: si `faltantesDeOportunidad` agrega un motivo nuevo y nadie le escribe
 * su etiqueta, el chip sale VACÍO en producción — no lanza, no falla el build, solo
 * se ve un badge en blanco. Este test lo hace fallar acá.
 *
 * También fija la regla de honestidad de la cartera de asesores: los montos no
 * mezclan monedas y, cuando hay otra fuera del total, se declara.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { AlertasAdmin } from "@/components/portales/admin/AlertasAdmin";
import { CarteraAsesores } from "@/components/portales/admin/CarteraAsesores";
import { COPY } from "@/lib/copy";
import { faltantesDeOportunidad, type CargaAsesor } from "@/lib/portales/admin";
import type { AlertasAdmin as AlertasData } from "@/lib/portales/data";

const render = (ui: React.ReactElement) => renderToStaticMarkup(ui);

const VACIAS: AlertasData = {
  solicitudesSinRevisar: 0,
  reservasPorVencer: [],
  reservasSinAsesor: 0,
  publicadasIncompletas: [],
  borradoresOlvidados: [],
  clientesSinAsesor: [],
};

describe("AlertasAdmin · cola de trabajo", () => {
  it("sin pendientes muestra el aviso de 'todo al día', no tarjetas vacías", () => {
    const html = render(<AlertasAdmin portal="contratista" alertas={VACIAS} />);
    expect(html).toContain(COPY.portales.admin.pendientes.todoAlDia);
    expect(html).not.toContain(COPY.portales.admin.pendientes.catalogoTitulo);
  });

  it("TODO motivo de faltante tiene etiqueta: ningún chip sale vacío", () => {
    // Una operación publicada a la que le falta absolutamente todo → el catálogo de
    // faltantes completo. Si algún día se agrega uno sin copy, este render lo destapa.
    const todos = faltantesDeOportunidad({
      estadoPublicacion: "disponible",
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
    });
    expect(todos.length).toBeGreaterThan(0);

    const html = render(
      <AlertasAdmin
        portal="contratista"
        alertas={{
          ...VACIAS,
          publicadasIncompletas: [
            { id: "op-1", titulo: "Obra Surco", estadoPublicacion: "disponible", faltantes: todos },
          ],
        }}
      />,
    );
    for (const f of todos) {
      const etiqueta = COPY.portales.admin.pendientes.falta[f];
      expect(etiqueta, `falta la etiqueta de "${f}" en el copy`).toBeTruthy();
      expect(html).toContain(etiqueta);
    }
    // Y el atajo para arreglarla apunta al editor de ESA operación.
    expect(html).toContain("/admin/oportunidades/op-1");
  });

  it("las solicitudes sin responder llevan al admin a su propia sección", () => {
    const html = render(
      <AlertasAdmin portal="contratista" alertas={{ ...VACIAS, solicitudesSinRevisar: 3 }} />,
    );
    expect(html).toContain(COPY.portales.admin.pendientes.solicitudesConteo(3));
    expect(html).toContain("/admin/solicitudes");
  });

  it("declara cuántas reservas activas no tienen asesor asignado", () => {
    const html = render(
      <AlertasAdmin
        portal="contratista"
        alertas={{
          ...VACIAS,
          reservasSinAsesor: 2,
          reservasPorVencer: [
            {
              reservaId: "r-1",
              oportunidadId: "op-1",
              oportunidadTitulo: "Obra Surco",
              clienteNombre: "Inversionista",
              venceEn: new Date(Date.now() + 3_600_000).toISOString(),
            },
          ],
        }}
      />,
    );
    expect(html).toContain(COPY.portales.admin.pendientes.reservasSinAsesor(2));
  });
});

describe("CarteraAsesores · reparto de carga", () => {
  const base: Omit<CargaAsesor, "asesorId" | "nombre" | "clientes" | "comprometido"> = {
    clientesSinActividad: 0,
    reservasActivas: 0,
    moneda: "USD",
    multiMoneda: false,
    financiadas: 0,
  };

  it("sin asesores no inventa una tabla vacía", () => {
    const html = render(<CarteraAsesores filas={[]} />);
    expect(html).toContain(COPY.portales.admin.asesores.vacio);
  });

  it("marca al más cargado (el primero, que llega ya ordenado del server)", () => {
    const html = render(
      <CarteraAsesores
        filas={[
          { ...base, asesorId: "a", nombre: "Asesor Uno", clientes: 9, comprometido: 1000 },
          { ...base, asesorId: "b", nombre: "Asesor Dos", clientes: 1, comprometido: 10 },
        ]}
      />,
    );
    expect(html).toContain(COPY.portales.admin.asesores.masCargado);
  });

  it("con todos en cero NO marca a nadie como el más cargado", () => {
    const html = render(
      <CarteraAsesores
        filas={[{ ...base, asesorId: "a", nombre: "Asesor Uno", clientes: 0, comprometido: 0 }]}
      />,
    );
    expect(html).not.toContain(COPY.portales.admin.asesores.masCargado);
  });

  it("cuando hay otra moneda fuera del total, lo declara en vez de sumarla", () => {
    const html = render(
      <CarteraAsesores
        filas={[
          {
            ...base,
            asesorId: "a",
            nombre: "Asesor Uno",
            clientes: 2,
            comprometido: 50_000,
            multiMoneda: true,
          },
        ]}
      />,
    );
    expect(html).toContain(COPY.portales.admin.asesores.multiMoneda);
  });
});
