"use client";

import { useEffect, useState } from "react";

import { Dialog } from "@/components/ui/Dialog";
import { PButton } from "@/components/portales/ui/PButton";
import { PPassword } from "@/components/portales/ui/PField";

/**
 * Diálogo de confirmación del portal (teal, sin mascota). Usa el primitivo
 * `Dialog` (components/ui/Dialog) SOLO por su chrome invisible —focus-trap, cierre
 * con ESC, bloqueo de scroll, aria— y pinta TODO con tokens `portal-*` + `PButton`
 * + `PPassword`. Cubre title/description/confirmLabel/variant/password/acknowledge,
 * incluido el guard anti doble-lanzamiento.
 */
interface PConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  /**
   * Acción a confirmar. Puede ser async: mientras la promesa esté pendiente, el
   * diálogo se bloquea (confirmar/cancelar deshabilitados + spinner) para evitar
   * doble lanzamiento. Para que el guard funcione, devolver la promesa del trabajo.
   */
  onConfirm: (clave?: string) => void | Promise<void>;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  variant?: "primary" | "destructive";
  /** Texto de declaración / políticas mostrado en un recuadro. */
  acknowledgeText?: string;
  /** Si se define, se muestra un checkbox con este texto y confirmar queda
   *  deshabilitado hasta marcarlo. */
  acknowledgeLabel?: string;
  /** Si se define, se pide la contraseña actual antes de confirmar y se pasa a
   *  `onConfirm` (para acciones donde tener la sesión abierta no debería alcanzar). */
  passwordLabel?: string;
}

export function PConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "primary",
  acknowledgeText,
  acknowledgeLabel,
  passwordLabel,
}: PConfirmDialogProps) {
  const [acked, setAcked] = useState(false);
  const [clave, setClave] = useState("");
  // Guard anti doble-lanzamiento: mientras la acción está en curso, no se puede
  // volver a confirmar ni cancelar.
  const [busy, setBusy] = useState(false);

  // Reset del checkbox, la clave y el estado ocupado al abrir/cerrar. La clave
  // NUNCA debe sobrevivir al cierre del diálogo.
  useEffect(() => {
    if (!open) {
      setAcked(false);
      setClave("");
      setBusy(false);
    }
  }, [open]);

  const requireAck = Boolean(acknowledgeLabel);
  const requireClave = Boolean(passwordLabel);

  async function handleConfirm() {
    if (busy) return; // re-entrancy guard: ignora clics mientras corre
    setBusy(true);
    try {
      await onConfirm(requireClave ? clave : undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    // Mientras la acción corre, ESC / clic en el fondo NO cierran el diálogo:
    // evita la "cancelación fantasma".
    <Dialog
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      hideTitle
      panelClassName="bg-portal-surface"
    >
      <div className="flex flex-col gap-2 text-center">
        <h2 className="font-portal text-xl font-bold text-portal-ink">{title}</h2>
        {description && (
          <p className="text-balance text-sm leading-relaxed text-portal-ink2">{description}</p>
        )}
      </div>

      {requireAck && (
        <div className="mt-5 rounded-portal-sm border border-portal-line bg-portal-subtle p-4 text-left">
          {acknowledgeText && (
            <p className="max-h-40 overflow-auto text-xs leading-relaxed text-portal-ink2">
              {acknowledgeText}
            </p>
          )}
          <label className="mt-3 flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={acked}
              onChange={(e) => setAcked(e.target.checked)}
              className="mt-0.5 size-5 cursor-pointer accent-portal-primary"
            />
            <span className="text-sm font-semibold text-portal-ink">{acknowledgeLabel}</span>
          </label>
        </div>
      )}

      {requireClave && (
        <div className="mt-5 text-left">
          <PPassword
            label={passwordLabel}
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            autoComplete="current-password"
          />
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
        <PButton
          variant={variant === "destructive" ? "danger" : "primary"}
          pill
          fullWidth
          onClick={handleConfirm}
          loading={busy}
          disabled={busy || (requireAck && !acked) || (requireClave && clave.length < 1)}
        >
          {confirmLabel}
        </PButton>
        <PButton variant="ghost" pill fullWidth onClick={onClose} disabled={busy}>
          {cancelLabel}
        </PButton>
      </div>
    </Dialog>
  );
}
