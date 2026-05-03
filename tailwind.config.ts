import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./store/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        ink: {
          950: "#08080b",
          900: "#0d0d12",
          800: "#15151c",
          700: "#1f1f29",
          600: "#2a2a37",
        },
        accent: {
          violet: "#8b5cf6",
          indigo: "#6366f1",
          cyan: "#22d3ee",
          rose: "#f43f5e",
          amber: "#f59e0b",
        },
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(ellipse at center, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0) 70%)",
        "node-glow":
          "radial-gradient(circle at 30% 20%, rgba(139,92,246,0.25), rgba(34,211,238,0.10) 50%, transparent 75%)",
        "synthesis-glow":
          "linear-gradient(135deg, rgba(244,63,94,0.3), rgba(139,92,246,0.3), rgba(34,211,238,0.3))",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,0.08), 0 12px 40px -12px rgba(139,92,246,0.45)",
        "glow-lg":
          "0 0 0 1px rgba(255,255,255,0.12), 0 24px 60px -12px rgba(99,102,241,0.6)",
        soft: "0 8px 30px rgba(0,0,0,0.45)",
      },
      keyframes: {
        "edge-flow": {
          "0%": { strokeDashoffset: "0" },
          "100%": { strokeDashoffset: "-24" },
        },
        breathe: {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.04)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 0%" },
          "100%": { backgroundPosition: "200% 0%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-3px)" },
        },
      },
      animation: {
        "edge-flow": "edge-flow 1.4s linear infinite",
        breathe: "breathe 3.2s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite",
        float: "float 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
