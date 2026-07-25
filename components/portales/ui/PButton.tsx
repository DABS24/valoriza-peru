"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/cn";

/**
 * Botón del TEMA de portal (InversionNPL): azul sólido, radio 12px o pill.
 * Consume solo tokens `portal-*` (ver lib/portales/tema.ts). Vive en el namespace
 * de portal para no acoplar el primitivo compartido de Efectivo ni cambiar su look.
 */
type Variant = "primary" | "ghost" | "subtle" | "danger";
type Size = "sm" | "md" | "lg";

interface BaseProps {
  variant?: Variant;
  size?: Size;
  pill?: boolean;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-portal-primary text-white shadow-portal hover:bg-portal-primary-hover hover:shadow-portal-hover active:scale-[.98]",
  ghost:
    "bg-portal-surface text-portal-ink border border-portal-line2 hover:bg-portal-subtle hover:border-portal-primary/40 active:scale-[.98]",
  subtle:
    "bg-portal-primary-soft text-portal-primary-ink hover:bg-portal-primary/15 active:scale-[.98]",
  danger: "bg-portal-danger text-white hover:bg-portal-danger/90 active:scale-[.98]",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3.5 text-base",
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 font-portal font-semibold whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal-primary/40 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, BaseProps {
  as?: "button";
}

interface LinkButtonProps extends BaseProps {
  as: "link";
  href: string;
  external?: boolean;
  children?: ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

type Props = ButtonProps | LinkButtonProps;

export const PButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, Props>(function PButton(
  {
    variant = "primary",
    size = "md",
    pill = false,
    fullWidth = false,
    leadingIcon,
    trailingIcon,
    loading = false,
    className,
    children,
    ...rest
  },
  ref,
) {
  const classes = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    pill ? "rounded-chip" : "rounded-portal-sm",
    fullWidth && "w-full",
    className,
  );

  const inner = (
    <>
      {loading && (
        <span
          aria-hidden
          className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      )}
      {!loading && leadingIcon}
      {children}
      {!loading && trailingIcon}
    </>
  );

  if ((rest as LinkButtonProps).as === "link") {
    const { as: _as, href, external, ...linkRest } = rest as LinkButtonProps;
    if (external) {
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={classes}
          {...linkRest}
        >
          {inner}
        </a>
      );
    }
    return (
      <Link ref={ref as React.Ref<HTMLAnchorElement>} href={href} className={classes} {...linkRest}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      className={classes}
      disabled={loading || (rest as ButtonProps).disabled}
      {...(rest as ButtonProps)}
    >
      {inner}
    </button>
  );
});
