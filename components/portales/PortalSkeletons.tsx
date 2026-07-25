/**
 * ESQUELETOS de los PORTALES de inversión — fuente ÚNICA.
 *
 * Por qué existe: en Don Gato Efectivo cada zona tiene su `loading.tsx`, así que
 * al hacer click la pantalla aparece al instante (esqueleto) mientras el server
 * component transmite. Los portales no tenían ninguno y cada click esperaba al
 * server desde cero. Acá viven los esqueletos; cada `loading.tsx` de
 * `app/{portal}/**` es un re-export de 1 línea.
 *
 * Dos reglas de diseño:
 *  1. **Un solo lugar para toda la app.** Las pantallas del portal
 *     (ValorizaPeru) comparten árbol de rutas: el esqueleto se escribe una vez y
 *     ambos `loading.tsx` lo llaman. Cero duplicación entre verticales.
 *  2. **Solo tokens `portal-*`** (lib/portales/tema.ts). NUNCA los de Efectivo
 *     tokens de otra paleta: el portal tiene la suya y esa
 *     fuga se acaba de limpiar.
 *
 * El esqueleto calca la silueta de la pantalla que viene (mismos grids, mismos
 * radios y bordes que PCard/PStat/PTable) para que al llegar el contenido real no
 * haya salto. Es puramente visual: no hay texto de usuario, solo la etiqueta
 * accesible del contenedor.
 */
import { cn } from "@/lib/cn";
import { COPY } from "@/lib/copy";

// El texto de "cargando" es neutro y le habla a la misma persona en Efectivo y en
// los portales: se reusa en vez de duplicar la cadena en otro namespace.
const T = COPY.app.shared.loading;

// ─────────────────────────── Primitivas ───────────────────────────

/** Bloque base con pulso. Todo lo demás se compone de esto. */
function PSkelBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-portal-sm bg-portal-line2/60", className)}
      aria-hidden
    />
  );
}

/** Línea de texto de esqueleto (una barra). */
function PSkelLine({ className }: { className?: string }) {
  return <PSkelBlock className={cn("h-3.5 rounded-full", className)} />;
}

/** KPI en esqueleto. Calca `PCard`→`PStat`: mismo borde, radio y padding. */
function PSkelStat() {
  return (
    <div className="rounded-portal-sm border border-portal-line bg-portal-surface p-4">
      <PSkelBlock className="h-2.5 w-20 rounded-full" />
      <PSkelBlock className="mt-2.5 h-6 w-24" />
    </div>
  );
}

/** Tarjeta en esqueleto: título + N líneas. Calca `PCard`. */
function PSkelCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-portal border border-portal-line bg-portal-surface p-6 shadow-portal",
        className,
      )}
    >
      <PSkelBlock className="h-4 w-40 rounded-full" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <PSkelLine key={i} className={i === lines - 1 ? "w-2/3" : "w-full"} />
        ))}
      </div>
    </div>
  );
}

/** Fila de esqueleto (tablas/listas). La primera celda crece, el resto es fija. */
function PSkelRow({ cols }: { cols: number }) {
  const anchos = ["w-20", "w-24", "w-16", "w-28", "w-14", "w-20"];
  return (
    <div className="flex items-center gap-3 border-b border-portal-line px-5 py-3.5 last:border-b-0">
      {Array.from({ length: cols }).map((_, i) => (
        <PSkelLine key={i} className={cn(i === 0 ? "min-w-0 flex-1" : anchos[i % anchos.length])} />
      ))}
    </div>
  );
}

/**
 * Tabla en esqueleto dentro de su tarjeta. Calca el patrón real de los portales
 * (`<PCard className="p-0"><PTable>…`): cabecera con fondo `portal-subtle` y filas
 * separadas por `portal-line`.
 */
function PSkelTable({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-portal border border-portal-line bg-portal-surface shadow-portal">
      <div className="border-b border-portal-line bg-portal-subtle px-5 py-3">
        <PSkelBlock className="h-2.5 w-32 rounded-full" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <PSkelRow key={i} cols={cols} />
      ))}
    </div>
  );
}

/**
 * Encabezado de pantalla (h1 + bajada). Todas las pantallas de portal abren con
 * este bloque, así el esqueleto calza con el layout real.
 */
function PSkelHeader({ className }: { className?: string }) {
  return (
    <div className={cn("mb-6", className)}>
      <PSkelBlock className="h-7 w-56 max-w-full sm:h-8" />
      <PSkelBlock className="mt-2 h-4 w-72 max-w-full rounded-full" />
    </div>
  );
}

/**
 * Contenedor accesible. Envuelve el árbol de esqueleto y anuncia "cargando" a
 * lectores de pantalla (todo lo de adentro es `aria-hidden`).
 */
function PSkelScreen({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" aria-label={T.aria}>
      {children}
      <span className="sr-only">{T.cargando}</span>
    </div>
  );
}

/** Barra de filtros (buscador + select) que abre varias pantallas del portal. */
function PSkelFiltros() {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end">
      <PSkelBlock className="h-11 min-w-0 flex-1" />
      <PSkelBlock className="h-11 w-full sm:w-56" />
    </div>
  );
}

/** Fila de pestañas (PTabs) en esqueleto. */
function PSkelTabs({ n = 4 }: { n?: number }) {
  const anchos = ["w-24", "w-20", "w-28", "w-16", "w-24"];
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {Array.from({ length: n }).map((_, i) => (
        <PSkelBlock key={i} className={cn("h-9 rounded-chip", anchos[i % anchos.length])} />
      ))}
    </div>
  );
}

/** Grid de tarjetas de oportunidad (catálogo del inversionista y del admin). */
function PSkelGridOportunidades({ n = 6 }: { n?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: n }).map((_, i) => (
        <div
          key={i}
          className="rounded-portal border border-portal-line bg-portal-surface p-6 shadow-portal"
        >
          <div className="flex items-center gap-2">
            <PSkelBlock className="h-5 w-16 rounded-chip" />
            <PSkelBlock className="h-5 w-20 rounded-chip" />
          </div>
          <PSkelBlock className="mt-4 h-5 w-4/5" />
          <PSkelLine className="mt-2 w-3/5" />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <PSkelStat />
            <PSkelStat />
          </div>
          <PSkelBlock className="mt-5 h-10 w-full rounded-chip" />
        </div>
      ))}
    </div>
  );
}

// ───────────────────── Pantallas (las que consumen los loading.tsx) ─────────────────────

/**
 * Fallback de toda la zona autenticada del portal: lo hereda cualquier ruta sin
 * esqueleto propio (índice que redirige por rol, configuración, términos). Silueta
 * neutra —encabezado + tarjetas— para que nunca se vea el vacío.
 */
export function EsqueletoPortal() {
  return (
    <PSkelScreen>
      <PSkelHeader />
      <div className="space-y-4">
        <PSkelCard lines={4} />
        <PSkelCard lines={3} />
      </div>
    </PSkelScreen>
  );
}

/** Inicio del inversionista: saludo + 3 KPIs + la reserva en proceso. */
export function EsqueletoInicioCliente() {
  return (
    <PSkelScreen>
      <PSkelHeader />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <PSkelStat />
        <PSkelStat />
        <PSkelStat />
      </div>
      <PSkelCard className="mt-6" lines={5} />
    </PSkelScreen>
  );
}

/** Catálogo de oportunidades: guía de pasos + filtros + pestañas + grid de tarjetas. */
export function EsqueletoCatalogo() {
  return (
    <PSkelScreen>
      <PSkelHeader className="mb-5" />
      {/* Guía rápida de pasos (barra horizontal) */}
      <div className="mb-6 rounded-portal border border-portal-line bg-portal-surface p-4 shadow-portal">
        <PSkelLine className="w-full max-w-lg" />
      </div>
      <PSkelFiltros />
      <PSkelTabs n={3} />
      <PSkelGridOportunidades />
    </PSkelScreen>
  );
}

/**
 * Ficha de una oportunidad: es la pantalla más pesada del portal (galería, docs de
 * respaldo, simulador). Calca su grid de 5 columnas — detalle a la izquierda,
 * panel de acción a la derecha — para que no salte al llegar el contenido.
 */
export function EsqueletoFichaOportunidad() {
  return (
    <PSkelScreen>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {/* Galería */}
          <PSkelBlock className="aspect-[16/10] w-full rounded-portal" />
          <PSkelCard lines={4} />
          <PSkelCard lines={6} />
        </div>
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-portal border border-portal-line bg-portal-surface p-6 shadow-portal">
            <PSkelBlock className="h-4 w-32 rounded-full" />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <PSkelStat />
              <PSkelStat />
              <PSkelStat />
              <PSkelStat />
            </div>
            <PSkelBlock className="mt-5 h-11 w-full rounded-chip" />
          </div>
          <PSkelCard lines={4} />
        </div>
      </div>
    </PSkelScreen>
  );
}

/** Cartera del inversionista: 3 KPIs de dinero + tabla de posiciones. */
export function EsqueletoCartera() {
  return (
    <PSkelScreen>
      <PSkelHeader />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <PSkelStat />
        <PSkelStat />
        <PSkelStat />
      </div>
      <div className="mt-6">
        <PSkelTable rows={5} cols={5} />
      </div>
    </PSkelScreen>
  );
}

/** Historial del inversionista: solo la tabla de reservas. */
export function EsqueletoHistorial() {
  return (
    <PSkelScreen>
      <PSkelHeader />
      <PSkelTable rows={6} cols={5} />
    </PSkelScreen>
  );
}

/** Inicio del asesor: 4 KPIs de cartera + 3 de cierre + dos tarjetas de trabajo. */
export function EsqueletoInicioAsesor() {
  return (
    <PSkelScreen>
      <PSkelHeader />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PSkelStat />
        <PSkelStat />
        <PSkelStat />
        <PSkelStat />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <PSkelStat />
        <PSkelStat />
        <PSkelStat />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PSkelCard lines={4} />
        <PSkelCard lines={4} />
      </div>
    </PSkelScreen>
  );
}

/** Mis clientes (asesor): dos tablas — inversionistas y prospectos. */
export function EsqueletoMisClientes() {
  return (
    <PSkelScreen>
      <PSkelHeader />
      <PSkelTable rows={5} cols={5} />
      <div className="mt-8">
        <PSkelTable rows={4} cols={4} />
      </div>
    </PSkelScreen>
  );
}

/** Cola de reservas (asesor/admin): tabla de operaciones bloqueadas. */
export function EsqueletoReservas() {
  return (
    <PSkelScreen>
      <PSkelHeader className="mb-5" />
      <PSkelTable rows={6} cols={6} />
    </PSkelScreen>
  );
}

/**
 * Ficha de una persona del asesor (inversionista o prospecto): encabezado + datos
 * de contacto + 3 KPIs + sus operaciones en tarjetas. Ambas fichas comparten
 * silueta, así que comparten esqueleto.
 */
export function EsqueletoFichaPersona() {
  return (
    <PSkelScreen>
      <PSkelHeader />
      <PSkelCard className="mb-6" lines={2} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <PSkelStat />
        <PSkelStat />
        <PSkelStat />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PSkelCard lines={4} />
        <PSkelCard lines={4} />
      </div>
    </PSkelScreen>
  );
}

/** Tablero del admin: bloques de KPIs (operaciones, dinero, miembros). */
export function EsqueletoTableroAdmin() {
  return (
    <PSkelScreen>
      <PSkelHeader />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <PSkelStat key={i} />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <PSkelStat key={i} />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <PSkelStat key={i} />
        ))}
      </div>
      <PSkelCard className="mt-6" lines={4} />
    </PSkelScreen>
  );
}

/** Oportunidades del admin: pestañas por estado + grid de tarjetas. */
export function EsqueletoOportunidadesAdmin() {
  return (
    <PSkelScreen>
      <PSkelHeader className="mb-5" />
      <PSkelTabs n={5} />
      <PSkelGridOportunidades n={6} />
    </PSkelScreen>
  );
}

/**
 * Formulario de oportunidad (alta y edición): varias tarjetas-sección con campos
 * en dos columnas. Misma silueta para las dos rutas.
 */
export function EsqueletoFormOportunidad() {
  return (
    <PSkelScreen>
      <PSkelHeader />
      <div className="space-y-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-portal border border-portal-line bg-portal-surface p-6 shadow-portal"
          >
            <PSkelBlock className="h-4 w-44 rounded-full" />
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <PSkelBlock className="h-11 w-full" />
              <PSkelBlock className="h-11 w-full" />
              <PSkelBlock className="h-11 w-full" />
              <PSkelBlock className="h-11 w-full" />
            </div>
          </div>
        ))}
      </div>
    </PSkelScreen>
  );
}

/** Usuarios del portal (admin): buscador + tabla de miembros. */
export function EsqueletoUsuarios() {
  return (
    <PSkelScreen>
      <PSkelHeader />
      <PSkelFiltros />
      <PSkelTable rows={8} cols={5} />
    </PSkelScreen>
  );
}

/** Bitácora del portal (admin): filtros + tabla de eventos (muchas columnas). */
export function EsqueletoAuditoria() {
  return (
    <PSkelScreen>
      <PSkelHeader />
      <PSkelFiltros />
      <PSkelTable rows={10} cols={6} />
    </PSkelScreen>
  );
}

/** Solicitudes de financiamiento (admin): pestañas por estado + tabla. */
export function EsqueletoSolicitudesAdmin() {
  return (
    <PSkelScreen>
      <PSkelHeader />
      <PSkelTabs n={4} />
      <PSkelTable rows={6} cols={5} />
    </PSkelScreen>
  );
}

/** Empresas prestatarias (admin): buscador + tabla. */
export function EsqueletoPrestatarios() {
  return (
    <PSkelScreen>
      <PSkelHeader />
      <PSkelFiltros />
      <PSkelTable rows={6} cols={5} />
    </PSkelScreen>
  );
}

/** Inicio del empresario: 3 KPIs + reputación + sus operaciones. */
export function EsqueletoInicioEmpresario() {
  return (
    <PSkelScreen>
      <PSkelHeader />
      <div className="grid grid-cols-3 gap-3">
        <PSkelStat />
        <PSkelStat />
        <PSkelStat />
      </div>
      <PSkelCard className="mt-4" lines={3} />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <PSkelCard lines={4} />
        <PSkelCard lines={4} />
        <PSkelCard lines={4} />
      </div>
    </PSkelScreen>
  );
}

/** Solicitudes del empresario: 3 KPIs + lista de solicitudes con sus documentos. */
export function EsqueletoSolicitudesEmpresario() {
  return (
    <PSkelScreen>
      <PSkelHeader />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <PSkelStat />
        <PSkelStat />
        <PSkelStat />
      </div>
      <div className="mt-6 space-y-4">
        <PSkelCard lines={4} />
        <PSkelCard lines={4} />
      </div>
    </PSkelScreen>
  );
}
