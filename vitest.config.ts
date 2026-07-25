import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // Los .test.tsx (render de componentes a string con react-dom/server) necesitan
  // el transform de JSX. `automatic` = no hace falta importar React en cada test.
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: ["node_modules", ".next", "docs-internal"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      // En tests, `server-only` es un no-op: permite importar módulos server
      // (lib/email/resend.ts, etc.) sin que el paquete real lance al importarse.
      "server-only": path.resolve(__dirname, "./tests/_stubs/server-only.ts"),
    },
  },
});
