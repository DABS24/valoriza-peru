import { notFound } from "next/navigation";

import { requirePortalEmpresario } from "@/lib/portales/guards";
import { getMiEmpresa, oportunidadesDeMiEmpresa } from "@/lib/portales/data";
import { portalPorSlug, type PortalSlug } from "@/lib/portales/config";
import { EmpresarioDashboard } from "@/components/portales/empresario/EmpresarioDashboard";
import { basePortal } from "@/lib/portales/rutas";

/**
 * Inicio del EMPRESARIO (SERVER). Solo aplica a verticales con prestatarios (si no,
 * el rol empresario no existe → 404). Re-gate empresario + carga en un solo
 * Promise.all su empresa y sus operaciones, y las AGRUPA por estado (SSOT: se
 * derivan del estado, no se guarda un contador aparte).
 */
export default async function EmpresarioInicioPage({ portal }: { portal: PortalSlug }) {
  if (!portalPorSlug(portal)?.prestatarios) notFound();
  const miembro = await requirePortalEmpresario(portal);
  const [empresa, ops] = await Promise.all([
    getMiEmpresa(portal),
    oportunidadesDeMiEmpresa(portal),
  ]);

  const vigentes = ops.filter(
    (o) => o.estadoPublicacion === "disponible" || o.estadoPublicacion === "reservada",
  );
  const cerradas = ops.filter((o) => o.estadoPublicacion === "cerrada");
  const evaluacion = ops.filter((o) => o.estadoPublicacion === "borrador");

  const cfg = portalPorSlug(portal);
  const solicitarHref = cfg?.prestatarios
    ? `${basePortal(portal)}/empresario/solicitudes`
    : undefined;

  // Reputación: operaciones completadas = financiadas o cerradas con nosotros (proxy
  // público de "buen pagador"). NUNCA el scoring interno. Los borradores (en
  // evaluación) no son operaciones aún: no cuentan para el total del track record.
  const opsReales = ops.filter((o) => o.estadoPublicacion !== "borrador");
  const completadas = opsReales.filter(
    (o) => o.financiadaEn != null || o.estadoPublicacion === "cerrada",
  ).length;

  return (
    <EmpresarioDashboard
      portal={portal}
      nombre={miembro.nombre}
      empresa={empresa}
      vigentes={vigentes}
      cerradas={cerradas}
      evaluacion={evaluacion}
      solicitarHref={solicitarHref}
      reputacion={{ total: opsReales.length, completadas }}
    />
  );
}
