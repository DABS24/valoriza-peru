import { ImageResponse } from "next/og";

import { PORTAL_SLUG, PORTALES } from "@/lib/portales/config";
import { acentoPortalHex } from "@/lib/portales/tema";

/**
 * Favicon del portal: el mismo monograma del wordmark (inicial de la marca sobre su
 * acento), generado desde la config. No es un archivo con la letra dibujada a mano:
 * renombrar el portal o cambiarle el color se sigue haciendo en un solo lugar.
 */
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: acentoPortalHex(PORTAL_SLUG),
        color: "#ffffff",
        fontSize: 42,
        fontWeight: 700,
        borderRadius: 12,
      }}
    >
      {PORTALES[PORTAL_SLUG].nombreCorto.trim().charAt(0).toUpperCase()}
    </div>,
    size,
  );
}
