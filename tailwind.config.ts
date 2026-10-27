import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#990000", // Crimson red / Đỏ đậm báo chí
          hover: "#800000",
          light: "#ffebee",
          dark: "#660000",
        },
        surface: {
          DEFAULT: "#ffffff",
          subtle: "#f8f9fa",
          muted: "#f1f3f5",
        },
        border: "#e5e7eb",
      },
      fontFamily: {
        serif: ["'Merriweather'", "Palatino", "Times New Roman", "serif"],
        sans: ["'Be Vietnam Pro'", "'Inter'", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
