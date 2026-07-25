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
    // (Next 15 trae dynamic=0 por defecto). Las mutaciones llaman
    // router.refresh(), así que nunca se muestra data vieja tras una acción.
    //
    // 🔴 Subido de 30s a 120s por un síntoma reportado y muy reconocible: entrás
    // a Inicio, se navega a otras secciones, se vuelve a Inicio y **vuelve a
    // cargar**; al repetirlo enseguida, ya no. No era lentitud —Inicio resuelve
    // sus consultas en un solo Promise.all— era esta ventana: el primer regreso
    // caía FUERA de los 30s y el segundo, adentro.
    //
    // Por qué 120s es seguro acá: lo que cambia los datos del inversionista es
    // el asesor confirmando o liberando una reserva, algo que pasa en minutos u
    // horas, no en segundos. Y lo que hace el propio usuario ya dispara
    // `router.refresh()`.
    // ⚠️ Aun con datos de hasta 2 minutos, reservar es atómico en la base
    // (índice único, migración 0088): el peor caso es un error claro al
    // reservar algo ya tomado, nunca dos personas creyéndose la contraparte.
    staleTimes: { dynamic: 120 },
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
