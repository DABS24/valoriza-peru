import { notFound } from "next/navigation";

import { requirePortalEmpresario } from "@/lib/portales/guards";
import { getMiEmpresa, getMisSolicitudes, oportunidadesDeMiEmpresa } from "@/lib/portales/data";
import { referenciaCostoEmpresario } from "@/lib/portales/tasas";
import { portalPorSlug, type PortalSlug } from "@/lib/portales/config";
import { SolicitudesEmpresario } from "@/components/portales/empresario/SolicitudesEmpresario";

/**
 * Solicitudes del EMPRESARIO (SERVER). Solo aplica a verticales con prestatarios (si
 * no, 404). Re-gate empresario + carga en un solo Promise.all su empresa (para el
 * nombre del aviso por WhatsApp), sus solicitudes con documentos y sus operaciones
 * —de estas últimas sale la REFERENCIA de interés y comisión del simulador—.
 *
 * La referencia se calcula acá (server): el browser no elige con qué números simula.
 * Si el empresario no tiene historial, queda en null y el simulador dice "por definir".
 */
export default async function SolicitudesEmpresarioPage({ portal }: { portal: PortalSlug }) {
  if (!portalPorSlug(portal)?.prestatarios) notFound();
  const miembro = await requirePortalEmpresario(portal);
  const [empresa, solicitudes, ops] = await Promise.all([
    getMiEmpresa(portal),
    getMisSolicitudes(portal),
    oportunidadesDeMiEmpresa(portal),
  ]);
  return (
    <SolicitudesEmpresario
      portal={portal}
      empresaNombre={empresa?.nombre ?? miembro.nombre}
      solicitudes={solicitudes}
      referencia={referenciaCostoEmpresario(ops)}
    />
  );
}
