"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Aparición al entrar al viewport, escalonable con `delay`. Sin dependencias:
 * `IntersectionObserver` + dos clases. `motion` ya entra al bundle por el Dialog,
 * pero traerlo a la landing solo para desplazar 12px sería pagar 40 KB por una
 * transición CSS.
 *
 * 🔴 La regla que define este componente: **el contenido nunca depende de JS para
 * ser visible.** El HTML que manda el servidor está visible; si la hidratación
 * falla, tarda, o el buscador no ejecuta scripts, la página se lee igual. Una
 * landing pública que arranca en `opacity-0` es una landing en blanco cuando algo
 * falla — y eso ya se vio acá: el primer render mostraba el hero vacío hasta que
 * hidrataba.
 *
 * Cómo se logra sin que parpadee:
 *   · Se arma una sola vez, en el cliente.
 *   · Si al armarse el elemento YA está en pantalla, no se oculta nunca. Ocultarlo
 *     ahí sería exactamente el parpadeo que se quiere evitar.
 *   · Solo se oculta lo que está fuera de pantalla —donde nadie lo ve
 *     desaparecer— y se revela cuando el usuario llega.
 *
 * `prefers-reduced-motion` desactiva todo: queda visible desde el primer momento.
 * Ver `docs-internal/BRANDING.md` §5.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  /**
   * Etiqueta a renderizar. Existe porque envolver un `<li>` en un `<div>` rompe
   * la lista: `<ol>` solo admite `<li>`, y un lector de pantalla deja de anunciar
   * "lista de 3 elementos". Con `as="li"` el envoltorio ES el ítem.
   */
  as: Etiqueta = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li";
}) {
  const ref = useRef<HTMLElement>(null);
  /** `null` = todavía no se armó ⇒ se renderiza visible, igual que en el servidor. */
  const [oculto, setOculto] = useState<boolean | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Ya visible en pantalla, o el usuario pidió menos movimiento: no se toca.
    if (reduce || el.getBoundingClientRect().top < window.innerHeight) {
      setOculto(false);
      return;
    }

    setOculto(true);
    const io = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setOculto(false);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Etiqueta
      ref={ref as React.Ref<HTMLDivElement & HTMLLIElement>}
      style={{ transitionDelay: oculto === false ? `${delay}ms` : "0ms" }}
      className={`motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out ${
        oculto ? "opacity-0 motion-safe:translate-y-3" : "translate-y-0 opacity-100"
      } ${className}`}
    >
      {children}
    </Etiqueta>
  );
}
