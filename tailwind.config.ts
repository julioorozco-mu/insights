import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand colors from micro-insights-dev
        brand: {
          primary: "#192170",
          secondary: "#5e4ce6ff",
          success: "#10B981",
          error: "#EF4444",
          background: "#F1F5F9",
          surface: "#FFFFFF",
        },
        // Slate palette
        slate: {
          950: "#0F172A",
          900: "#111827",
          800: "#1E293B",
          600: "#475569",
          500: "#64748B",
          400: "#94A3B8",
        },
        // Legacy dashboard colors (mantener compatibilidad)
        dashboard: {
          page: "#F1F5F9",
          sidebar: "#192170",
          card: "#FFFFFF",
          cardAlt: "#F8F9FF",
          textPrimary: "#111827",
          textSecondary: "#6B7280",
          textMuted: "#9CA3AF",
          textOnDark: "#F9FAFB",
          textOnAccent: "#FFFFFF",
          accent: "#3C1970",
          accentSoft: "#EEE9FF",
          accentSecondary: "#3C1970",
          success: "#10B981",
          warning: "#F97316",
          danger: "#EF4444",
          info: "#0EA5E9",
          sidebarActive: "rgba(255, 255, 255, 0.15)",
          sidebarHover: "rgba(255, 255, 255, 0.10)",
          chipBg: "rgba(60, 25, 112, 0.12)",
          chipText: "#3C1970",
        },
      },
      fontFamily: {
        sans: ["var(--font-plus-jakarta)", ...fontFamily.sans],
      },
      fontSize: {
        display: ["32px", { lineHeight: "1.25", fontWeight: "700" }],
        h1: ["24px", { lineHeight: "1.35", fontWeight: "700" }],
        h2: ["20px", { lineHeight: "1.4", fontWeight: "600" }],
        h3: ["16px", { lineHeight: "1.4", fontWeight: "600" }],
        "body-lg": ["15px", { lineHeight: "1.5", fontWeight: "500" }],
        "body-md": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        "body-sm": ["12px", { lineHeight: "1.45", fontWeight: "400" }],
        caption: ["11px", { lineHeight: "1.4", fontWeight: "400" }],
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        "2xl": "32px",
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 10px 30px rgba(15, 23, 42, 0.1)",
        "card-soft": "0 4px 16px rgba(15, 23, 42, 0.06)",
        cardSoft: "0 4px 16px rgba(15, 23, 42, 0.06)",
        elevated: "0 18px 40px rgba(15, 23, 42, 0.16)",
      },
    },
  },
  plugins: [require("daisyui"), require("tailwindcss-animate")],
  daisyui: {
    themes: [
      {
        skillzone: {
          "primary": "#192170",
          "primary-content": "#FFFFFF",
          "secondary": "#3C1970",
          "secondary-content": "#FFFFFF",
          "accent": "#3C1970",
          "accent-content": "#FFFFFF",
          "neutral": "#192170",
          "neutral-content": "#F9FAFB",
          "base-100": "#FFFFFF",
          "base-200": "#F1F5F9",
          "base-300": "#F8F9FF",
          "base-content": "#111827",
          "info": "#0EA5E9",
          "info-content": "#FFFFFF",
          "success": "#10B981",
          "success-content": "#FFFFFF",
          "warning": "#F97316",
          "warning-content": "#FFFFFF",
          "error": "#EF4444",
          "error-content": "#FFFFFF",
        },
      },
    ],
  },
};

export default config;
