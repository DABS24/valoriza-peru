"use client";

import { useEffect, useId, useRef, type ComponentProps, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/lib/cn";

type MotionDivProps = ComponentProps<typeof motion.div>;

interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** Texto del título — se renderiza como <h2> y queda enlazado vía aria-labelledby. */
  title: string;
  children: ReactNode;
  /** Clase para controlar el ancho máximo del panel. Default max-w-md. */
  maxWidthClassName?: string;
  /** Slot opcional para el pie del diálogo (acciones). */
  footer?: ReactNode;
  /** Clase extra para el panel. El padding y el max-height YA vienen por defecto:
   *  pasar esto solo para OVERRIDEARLOS (p. ej. `p-0` si el contenido va a sangre). */
  panelClassName?: string;
  /** Oculta el <h2> visual pero lo mantiene accesible (cuando el contenido ya trae su propio header). */
  hideTitle?: boolean;
  /** z-index del overlay. Default z-50. */
  zClassName?: string;
  /** Clases del wrapper que posiciona el panel (alineación + padding del overlay). */
  overlayClassName?: string;
  /** Clases del backdrop clickeable. */
  backdropClassName?: string;
  /** Override de la animación de entrada/salida del panel (initial/animate/exit/transition). */
  motionProps?: Pick<MotionDivProps, "initial" | "animate" | "exit" | "transition">;
  /** Contenido que se renderiza dentro del overlay pero FUERA del panel (p. ej. confetti full-screen). */
  overlayChildren?: ReactNode;
  /** Clase extra para el <h2> del título cuando es visible (no aplica si hideTitle).
   *  Ya trae estilo de marca por defecto: pasar esto solo para variarlo. */
  titleClassName?: string;
}

/**
 * El panel trae padding, ancho, scroll y radio POR DEFECTO. Es deliberado: el
 * modo corto —`<Dialog open onClose title>` sin más props— tiene que verse bien
 * solo. Antes el panel nacía sin padding y el título sin estilo, así que cada
 * modal tenía que acordarse de `panelClassName="p-6"` + `titleClassName="..."`;
 * el modal que no se acordaba quedaba con el texto pegado al borde y un <h2>
 * crudo del navegador. Se repitió en 5 modales antes de corregirse acá: cuando
 * el default es el estado roto, el olvido es cuestión de tiempo.
 */
const PANEL_BASE =
  "relative max-h-[90dvh] w-full overflow-y-auto rounded-portal bg-portal-surface p-6 shadow-portal-hover outline-none sm:p-7";

const TITULO_BASE = "font-portal text-xl font-bold text-portal-ink";

const DEFAULT_MOTION: Required<NonNullable<DialogProps["motionProps"]>> = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 8 },
  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
};

/**
 * Primitivo de diálogo accesible y reutilizable.
 *
 * Provee:
 *  - role="dialog", aria-modal="true", aria-labelledby → id del título.
 *  - Cierre con tecla Escape.
 *  - Focus trap (Tab / Shift+Tab no salen del diálogo).
 *  - Focus return: al cerrar devuelve el foco al elemento que lo abrió.
 *  - Backdrop con botón aria-label="Cerrar" que cierra al click.
 *  - Animación con AnimatePresence + motion (mismo estilo que el resto de modales).
 *  - Bloqueo de scroll del body mientras está abierto.
 *
 * No impone estructura interna: el contenido de cada modal se pasa como children.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  maxWidthClassName = "max-w-md",
  footer,
  panelClassName,
  hideTitle = false,
  zClassName = "z-50",
  overlayClassName = "flex items-center justify-center p-4",
  backdropClassName = "bg-portal-ink/40 backdrop-blur-sm",
  motionProps,
  overlayChildren,
  titleClassName,
}: DialogProps) {
  const motion0 = motionProps ?? DEFAULT_MOTION;
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Capturar el elemento que tenía el foco al abrir, para devolvérselo al cerrar.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  // Bloquear scroll del body mientras está abierto; restaurar al cerrar.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Foco inicial dentro del panel al abrir.
  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = getFocusable(panel);
      (focusables[0] ?? panel).focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  // Escape para cerrar + focus trap con Tab / Shift+Tab.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = getFocusable(panel);
      if (focusables.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || active === panel || !panel.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={cn("fixed inset-0", overlayClassName, zClassName)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Cerrar"
            className={cn("absolute inset-0", backdropClassName)}
            onClick={onClose}
          />
          {overlayChildren}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={motion0.initial}
            animate={motion0.animate}
            exit={motion0.exit}
            transition={motion0.transition}
            // max-h + overflow-y-auto van en la base: como el body queda con scroll
            // bloqueado mientras el diálogo está abierto, un panel más alto que la
            // pantalla quedaría cortado y sin forma de desplazarlo. Todo diálogo
            // largo se desplaza dentro de su propio panel. twMerge deja que
            // panelClassName override cualquiera de estas clases.
            className={cn(PANEL_BASE, maxWidthClassName, panelClassName)}
          >
            <h2
              id={titleId}
              className={hideTitle ? "sr-only" : cn(TITULO_BASE, "mb-4", titleClassName)}
            >
              {title}
            </h2>
            {children}
            {footer}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}
