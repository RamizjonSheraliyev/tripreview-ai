import type { Config } from "tailwindcss";

// ink + slate are driven by CSS variables (RGB triplets) so the whole dashboard
// can flip between dark and light by toggling the `light` class on <html> —
// no per-component class changes. Values live in globals.css.
const v = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: v("--ink-950"),
          900: v("--ink-900"),
          850: v("--ink-850"),
          800: v("--ink-800"),
          700: v("--ink-700"),
          600: v("--ink-600"),
        },
        slate: {
          50: v("--sl-50"),
          100: v("--sl-100"),
          200: v("--sl-200"),
          300: v("--sl-300"),
          400: v("--sl-400"),
          500: v("--sl-500"),
          600: v("--sl-600"),
          700: v("--sl-700"),
          800: v("--sl-800"),
          900: v("--sl-900"),
          950: v("--sl-950"),
        },
        brand: {
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
