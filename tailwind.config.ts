import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: "#000000",
          panel: "#111111",
          border: "#222222",
          text: "#f5f5f5",
          muted: "#8a8a8a",
          accent: "#f97316",
          orange: "#fb923c",
          good: "#22c55e",
          bad: "#ef4444",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        display: [
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        shine: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(249,115,22,0.35)" },
          "50%": { boxShadow: "0 0 12px 1px rgba(249,115,22,0.55)" },
        },
        softGlow: {
          "0%, 100%": { textShadow: "0 0 20px rgba(249,115,22,0.25)" },
          "50%": { textShadow: "0 0 36px rgba(249,115,22,0.55)" },
        },
      },
      animation: {
        shine: "shine 2s ease-in-out infinite",
        softGlow: "softGlow 3.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
