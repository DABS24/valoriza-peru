import type { Config } from "tailwindcss";

/**
 * Don Gato · Editorial Trust design system
 * @see docs-internal/planning/DIRECCION_VISUAL.md
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-mode="dark"]'],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1rem", sm: "1.25rem", md: "1.5rem", lg: "2rem" },
      screens: { sm: "640px", md: "768px", lg: "1024px", xl: "1200px", "2xl": "1280px" },
    },
    extend: {
      colors: {
        // ───── BRAND PRINCIPAL ─────
        navy: {
          DEFAULT: "#0B1F3A",
          deep: "#061427",
          2: "#1E3A5F",
          soft: "#E9EFF7",
        },
        // ───── ACENTO DINERO ─────
        money: {
          DEFAULT: "#16A34A",
          2: "#15803D",
          soft: "#DCFCE7",
        },
        // ───── ACENTO PREMIUM / MOCHI PUNTOS ─────
        gold: {
          DEFAULT: "#F0B429",
          soft: "#FEF3C7",
        },
        // ───── ALERTA ─────
        alert: {
          DEFAULT: "#C0533F",
          soft: "#FEE2E2",
        },
        // ───── BASE NEUTROS ─────
        cream: "#FAFAF7",
        paper: "#FFFFFF",
        "bg-alt": "#F4F2EC",
        ink: {
          DEFAULT: "#0F172A",
          2: "#334155",
        },
        muted: "#64748B",
        line: {
          DEFAULT: "#E2E8F0",
          2: "#CBD5E1",
        },
        // ───── TEMA DE PORTAL (InversionNPL) · ADITIVO, NO afecta a Efectivo ─────
        // Estos tokens SOLO los consumen components/portales/*. Su valor sale de
        // variables CSS (canales R G B) que se definen scopeadas en `.portal-theme`
        // (ver lib/portales/tema.ts). Fuera de ese wrapper las vars no existen, así
        // que Efectivo nunca las usa. Formato `rgb(var / <alpha-value>)` para que
        // funcionen los modificadores de opacidad (ej. bg-portal-primary/90).
        portal: {
          bg: "rgb(var(--pt-bg) / <alpha-value>)",
          surface: "rgb(var(--pt-surface) / <alpha-value>)",
          subtle: "rgb(var(--pt-subtle) / <alpha-value>)",
          ink: "rgb(var(--pt-ink) / <alpha-value>)",
          ink2: "rgb(var(--pt-ink2) / <alpha-value>)",
          muted: "rgb(var(--pt-muted) / <alpha-value>)",
          line: "rgb(var(--pt-line) / <alpha-value>)",
          line2: "rgb(var(--pt-line2) / <alpha-value>)",
          primary: "rgb(var(--pt-primary) / <alpha-value>)",
          "primary-hover": "rgb(var(--pt-primary-hover) / <alpha-value>)",
          "primary-soft": "rgb(var(--pt-primary-soft) / <alpha-value>)",
          "primary-ink": "rgb(var(--pt-primary-ink) / <alpha-value>)",
          positive: "rgb(var(--pt-positive) / <alpha-value>)",
          "positive-soft": "rgb(var(--pt-positive-soft) / <alpha-value>)",
          warning: "rgb(var(--pt-warning) / <alpha-value>)",
          "warning-soft": "rgb(var(--pt-warning-soft) / <alpha-value>)",
          danger: "rgb(var(--pt-danger) / <alpha-value>)",
          "danger-soft": "rgb(var(--pt-danger-soft) / <alpha-value>)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
        // Sans del tema de portal (Plus Jakarta Sans, vía next/font). Solo la usan
        // los portales; el wrapper `.portal-theme` además remapea --font-display y
        // --font-body a esta var, así que las clases font-display/font-body ya
        // existentes en los portales heredan Jakarta sin migrarlas una por una.
        portal: ["var(--font-portal-sans)", "system-ui", "sans-serif"],
      },
      fontSize: {
        xs: ["clamp(11px, 0.7rem + 0.1vw, 13px)", { lineHeight: "1.4" }],
        sm: ["clamp(13px, 0.8rem + 0.1vw, 14px)", { lineHeight: "1.5" }],
        base: ["clamp(15px, 0.92rem + 0.15vw, 17px)", { lineHeight: "1.55" }],
        lg: ["clamp(17px, 1rem + 0.2vw, 19px)", { lineHeight: "1.5" }],
        xl: ["clamp(21px, 1.2rem + 0.3vw, 24px)", { lineHeight: "1.35" }],
        "2xl": ["clamp(28px, 1.5rem + 0.6vw, 36px)", { lineHeight: "1.2" }],
        "3xl": ["clamp(36px, 1.8rem + 1vw, 48px)", { lineHeight: "1.15" }],
        hero: ["clamp(44px, 2rem + 2.5vw, 72px)", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
      },
      borderRadius: {
        pill: "9999px",
        card: "18px",
        "card-sm": "12px",
        chip: "100px",
        // Tema de portal: tarjetas más redondeadas (InversionNPL).
        portal: "20px",
        "portal-sm": "14px",
      },
      boxShadow: {
        card: "0 8px 24px -16px rgba(11,31,58,.12)",
        "card-hover": "0 16px 40px -20px rgba(11,31,58,.2)",
        cta: "0 8px 18px -10px rgba(22,163,74,.4)",
        "cta-navy": "0 8px 18px -10px rgba(11,31,58,.4)",
        // Tema de portal: sombra suave (dos capas) estilo InversionNPL.
        portal: "0 1px 2px rgba(15,30,61,.06), 0 8px 24px rgba(15,30,61,.06)",
        "portal-hover": "0 2px 4px rgba(15,30,61,.08), 0 16px 36px rgba(15,30,61,.12)",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        // Flotación viva (estilo iO pre-footer) — Mochi y su halo oscilan a ritmos distintos.
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-14px)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-24px)" },
        },
        // Halo que "respira" detrás de Mochi.
        glow: {
          "0%, 100%": { opacity: "0.45", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.08)" },
        },
      },
      animation: {
        marquee: "marquee 35s linear infinite",
        "fade-up": "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both",
        shimmer: "shimmer 2.5s linear infinite",
        "spin-slow": "spin 8s linear infinite",
        float: "float 5s ease-in-out infinite",
        "float-slow": "float-slow 7s ease-in-out infinite",
        glow: "glow 4s ease-in-out infinite",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16,1,0.3,1)",
      },
    },
  },
  plugins: [],
};

export default config;
