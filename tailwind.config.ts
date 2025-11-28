import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Modern LMS Dashboard colors from design profile
        dashboard: {
          // Background colors
          page: "#F5F5FA",
          sidebar: "#111118",
          card: "#FFFFFF",
          cardAlt: "#F8F9FF",
          // Text colors
          textPrimary: "#111827",
          textSecondary: "#6B7280",
          textMuted: "#9CA3AF",
          textOnDark: "#F9FAFB",
          textOnAccent: "#FFFFFF",
          // Accent colors
          accent: "#6C5CE7",
          accentSoft: "#EEE9FF",
          accentSecondary: "#FFB347",
          success: "#22C55E",
          warning: "#F97316",
          danger: "#EF4444",
          info: "#0EA5E9",
          // States
          sidebarActive: "rgba(148, 163, 255, 0.16)",
          sidebarHover: "rgba(148, 163, 255, 0.10)",
          chipBg: "rgba(148, 163, 255, 0.12)",
          chipText: "#4F46E5",
        },
        // Badge variants
        badge: {
          beginner: { bg: "#DCFCE7", text: "#15803D" },
          intermediate: { bg: "#FEF3C7", text: "#92400E" },
          advanced: { bg: "#FEE2E2", text: "#B91C1C" },
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", "'SF Pro Text'", "'Inter'", "sans-serif"],
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
        card: "0 10px 30px rgba(15, 23, 42, 0.10)",
        cardSoft: "0 4px 16px rgba(15, 23, 42, 0.06)",
        elevated: "0 18px 40px rgba(15, 23, 42, 0.16)",
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        skillzone: {
          "primary": "#6C5CE7",        // Púrpura principal
          "primary-content": "#FFFFFF",
          "secondary": "#FFB347",      // Naranja secundario
          "secondary-content": "#111827",
          "accent": "#0EA5E9",         // Azul info
          "accent-content": "#FFFFFF",
          "neutral": "#111118",        // Sidebar dark
          "neutral-content": "#F9FAFB",
          "base-100": "#FFFFFF",       // Card background
          "base-200": "#F5F5FA",       // Page background
          "base-300": "#F8F9FF",       // Card alt
          "base-content": "#111827",   // Text primary
          "info": "#0EA5E9",
          "info-content": "#FFFFFF",
          "success": "#22C55E",
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
