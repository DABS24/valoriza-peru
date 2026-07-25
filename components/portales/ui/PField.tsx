"use client";

import {
  forwardRef,
  useState,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
} from "react";
import { ChevronDown, Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * Campos de formulario del TEMA de portal (input, select, textarea, contraseña).
 * Espejan la API de components/ui/* pero con tokens `portal-*` (borde, foco azul,
 * superficie), para que los formularios del portal respiren el mismo tema sin
 * tocar los primitivos compartidos de Efectivo.
 */
const FIELD_BASE =
  "block w-full rounded-portal-sm border bg-portal-surface px-3.5 py-3 font-portal text-base text-portal-ink shadow-sm transition placeholder:text-portal-muted/60 focus-visible:border-portal-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal-primary/25 disabled:cursor-not-allowed disabled:bg-portal-subtle disabled:text-portal-muted";
const FIELD_BORDE = (error?: string) =>
  error
    ? "border-portal-danger focus-visible:border-portal-danger focus-visible:ring-portal-danger/25"
    : "border-portal-line2";

const LABEL_BASE = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-portal-muted";

function Etiqueta({
  htmlFor,
  children,
  requerido,
}: {
  htmlFor?: string;
  children: ReactNode;
  requerido?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className={LABEL_BASE}>
      {children}
      {requerido && <span className="ml-0.5 text-portal-danger">*</span>}
    </label>
  );
}

function Ayuda({ hint, error }: { hint?: string; error?: string }) {
  if (!hint && !error) return null;
  return (
    <p className={cn("mt-1.5 text-xs", error ? "text-portal-danger" : "text-portal-muted")}>
      {error ?? hint}
    </p>
  );
}

interface CommonProps {
  label?: string;
  hint?: string;
  error?: string;
  requiredMark?: boolean;
}

export const PInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & CommonProps & { leadingIcon?: ReactNode }
>(function PInput({ label, hint, error, requiredMark, leadingIcon, className, id, ...rest }, ref) {
  const inputId = id ?? rest.name;
  /**
   * El teclado correcto por default. En el celular, un campo de monto que abre
   * el teclado alfabético se siente web; el numérico se siente app — y es un
   * atributo, no una feature.
   *
   * Va acá y no en cada llamada porque había 12 campos numéricos y ninguno lo
   * declaraba: si el default del primitivo es el correcto, no hay nada que
   * recordar. Quien necesite otro teclado lo pasa y gana, porque `rest` se
   * expande después. Ver `references/31-movil-app.md` §5.
   */
  const inputMode =
    rest.inputMode ?? (rest.type === "number" ? "decimal" : rest.type === "tel" ? "tel" : undefined);
  return (
    <div className="w-full">
      {label && (
        <Etiqueta htmlFor={inputId} requerido={requiredMark}>
          {label}
        </Etiqueta>
      )}
      <div className="relative">
        {leadingIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-portal-muted">
            {leadingIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          inputMode={inputMode}
          className={cn(FIELD_BASE, FIELD_BORDE(error), leadingIcon && "pl-10", className)}
          {...rest}
        />
      </div>
      <Ayuda hint={hint} error={error} />
    </div>
  );
});

export const PPassword = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & CommonProps
>(function PPassword({ label, hint, error, requiredMark, className, id, ...rest }, ref) {
  const [ver, setVer] = useState(false);
  const inputId = id ?? rest.name;
  return (
    <div className="w-full">
      {label && (
        <Etiqueta htmlFor={inputId} requerido={requiredMark}>
          {label}
        </Etiqueta>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={ver ? "text" : "password"}
          aria-invalid={!!error}
          className={cn(FIELD_BASE, FIELD_BORDE(error), "pr-11", className)}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVer((v) => !v)}
          aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute inset-y-0 right-3 flex items-center text-portal-muted transition hover:text-portal-ink"
        >
          {ver ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>
      <Ayuda hint={hint} error={error} />
    </div>
  );
});

export const PSelect = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & CommonProps & { children: ReactNode }
>(function PSelect({ label, hint, error, requiredMark, className, id, children, ...rest }, ref) {
  const selectId = id ?? rest.name;
  return (
    <div className="w-full">
      {label && (
        <Etiqueta htmlFor={selectId} requerido={requiredMark}>
          {label}
        </Etiqueta>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={!!error}
          className={cn(FIELD_BASE, FIELD_BORDE(error), "appearance-none pr-10", className)}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-portal-muted" />
      </div>
      <Ayuda hint={hint} error={error} />
    </div>
  );
});

export const PTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & CommonProps
>(function PTextarea({ label, hint, error, requiredMark, className, id, rows = 4, ...rest }, ref) {
  const textareaId = id ?? rest.name;
  return (
    <div className="w-full">
      {label && (
        <Etiqueta htmlFor={textareaId} requerido={requiredMark}>
          {label}
        </Etiqueta>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        aria-invalid={!!error}
        className={cn(FIELD_BASE, FIELD_BORDE(error), "resize-y", className)}
        {...rest}
      />
      <Ayuda hint={hint} error={error} />
    </div>
  );
});
