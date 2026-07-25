import type { NextConfig } from "next";

// NOTA: el Content-Security-Policy ya NO vive acá. Se emite por request desde
// middleware.ts con un nonce único (arregla el hueco de 'unsafe-inline' en
// script-src). Estos headers son estáticos y complementan a ese CSP.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [],
    dangerouslyAllowSVG: false,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "motion"],
    viewTransition: true,
    // Caché de router del cliente: volver a una pestaña ya visitada NO re-fetchea
    // por 30s (Next 15 trae dynamic=0 por defecto). Las mutaciones llaman
    // router.refresh(), así que nunca se muestra data vieja tras una acción.
    staleTimes: { dynamic: 30 },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/app/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
