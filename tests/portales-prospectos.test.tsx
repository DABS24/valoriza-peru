/**
 * Render de la cartera del ASESOR con titulares SIN cuenta (0090), a string
 * (react-dom/server, sin browser).
 *
 * Lo que anclan estos tests es lo que se rompe EN SILENCIO cuando alguien con
 * cuenta y alguien sin cuenta comparten pantalla:
 *   · el enlace de un prospecto tiene que ir a SU ficha; si apuntara a la de
 *     clientes daría un 404 que parece "no es tuyo" y nadie lo reportaría como bug;
 *   · las dos listas no se pueden mezclar: quién tiene cuenta y quién no es
 *     justamente el dato que el asesor necesita ver;
 *   · un prospecto sin documento tiene que decir que no lo tiene, no una celda
 *     vacía que se lee como un dato faltante de la pantalla.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { MisClientes } from "@/components/portales/asesor/MisClientes";
import { COPY } from "@/lib/copy";
import type { ClienteEnriquecido, ProspectoEnriquecido } from "@/lib/portales/data";

const render = (ui: React.ReactElement) => renderToStaticMarkup(ui);

const CLIENTE: ClienteEnriquecido = {
  portal: "contratista",
  userId: "11111111-1111-1111-1111-111111111111",
  rol: "cliente",
  nombre: "Inversionista Con Cuenta",
  telefono: "987654321",
  asesorId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  estado: "activo",
  createdAt: "2026-07-01T12:00:00.000Z",
  numReservas: 2,
  montoComprometido: 50_000,
  moneda: "PEN",
  multiMoneda: false,
  ultimaActividad: "2026-07-20T12:00:00.000Z",
};

const PROSPECTO: ProspectoEnriquecido = {
  id: "22222222-2222-2222-2222-222222222222",
  nombre: "Titular Sin Cuenta",
  telefono: "912345678",
  telefonoWa: "51912345678",
  tipoDocumento: "dni",
  documento: "44556677",
  asesorId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  convertido: false,
  convertidoUserId: null,
  createdAt: "2026-07-22T12:00:00.000Z",
  numReservas: 1,
  montoComprometido: 30_000,
  moneda: "PEN",
  multiMoneda: false,
  ultimaActividad: "2026-07-23T12:00:00.000Z",
};

describe("MisClientes · cartera con y sin cuenta", () => {
  it("el prospecto enlaza a SU ficha, no a la de clientes", () => {
    const html = render(
      <MisClientes portal="contratista" clientes={[CLIENTE]} prospectos={[PROSPECTO]} />,
    );
    expect(html).toContain(`/asesor/prospectos/${PROSPECTO.id}`);
    expect(html).not.toContain(`/asesor/clientes/${PROSPECTO.id}`);
    // Y el cliente con cuenta sigue yendo a la suya.
    expect(html).toContain(`/asesor/clientes/${CLIENTE.userId}`);
  });

  it("distingue quién tiene cuenta: el prospecto lleva su badge", () => {
    const html = render(
      <MisClientes portal="contratista" clientes={[CLIENTE]} prospectos={[PROSPECTO]} />,
    );
    expect(html).toContain(COPY.portales.asesor.prospectos.badge);
    expect(html).toContain(PROSPECTO.nombre);
    expect(html).toContain(CLIENTE.nombre);
  });

  it("sin prospectos muestra su vacío propio, no esconde la sección", () => {
    const html = render(<MisClientes portal="contratista" clientes={[CLIENTE]} prospectos={[]} />);
    expect(html).toContain(COPY.portales.asesor.prospectos.vacio);
    // Y explica cómo se le crea la cuenta: es la regla del negocio, no un detalle.
    expect(html).toContain(COPY.portales.asesor.prospectos.comoSeCrea);
  });

  it("un prospecto sin documento lo DICE (no deja la celda vacía)", () => {
    const html = render(
      <MisClientes
        portal="contratista"
        clientes={[]}
        prospectos={[{ ...PROSPECTO, documento: null, tipoDocumento: null }]}
      />,
    );
    expect(html).toContain(COPY.portales.asesor.prospectos.sinDocumento);
  });

  it("una cartera sin nadie con cuenta igual muestra a los que no la tienen", () => {
    // El arranque real del asesor: todavía nadie tiene cuenta (se crea después de
    // operar). Si esta pantalla solo mirara `clientes`, se vería vacía y falsa.
    const html = render(<MisClientes portal="contratista" clientes={[]} prospectos={[PROSPECTO]} />);
    expect(html).toContain(COPY.portales.asesor.sinClientes);
    expect(html).toContain(PROSPECTO.nombre);
  });
});
