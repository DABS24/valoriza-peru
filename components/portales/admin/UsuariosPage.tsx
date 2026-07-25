import { requirePortalAdmin } from "@/lib/portales/guards";
import { listarMiembros, prospectosSinCuenta } from "@/lib/portales/data";
import type { PortalSlug } from "@/lib/portales/config";
import { UsuariosTabla } from "@/components/portales/admin/UsuariosTabla";

/**
 * Página de gestión de usuarios del portal (SERVER). Doble gate: el layout ya
 * exigió admin; esto lo re-exige (defensa en profundidad) y resuelve la lista
 * server-side, sin waterfall. La interacción vive en UsuariosTabla (client).
 *
 * También trae los PROSPECTOS sin cuenta (0090): este es el momento en que la
 * regla del negocio se cumple —se le crea la cuenta a quien ya operó— y donde su
 * historial se liga a ella. Todo en una sola ronda.
 *
 * El guard va ANTES del Promise.all, no dentro: adentro, las dos consultas corrían
 * en paralelo con la autorización, o sea que la lista de usuarios del portal se
 * pedía sin saber todavía si quien mira es admin. La RLS igual la habría cortado,
 * pero autorizar después de consultar es exactamente el orden que no queremos, y
 * era la única pantalla del portal que lo hacía. El paralelismo que importa (las
 * dos consultas entre sí) se conserva.
 */
export default async function UsuariosPage({ portal }: { portal: PortalSlug }) {
  const miembro = await requirePortalAdmin(portal);
  const [miembros, prospectos] = await Promise.all([
    listarMiembros(portal),
    prospectosSinCuenta(portal),
  ]);
  return <UsuariosTabla miembros={miembros} miId={miembro.userId} prospectos={prospectos} />;
}
