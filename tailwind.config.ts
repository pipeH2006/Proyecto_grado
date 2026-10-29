import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

// Paleta institucional. Ajustar los hex al manual de marca de la universidad.
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          200: "#bcd3ff",
          300: "#8eb5ff",
          400: "#598cff",
          500: "#3366ff",
          600: "#1f47e6",
          700: "#1836b4",
          800: "#172f8f",
          900: "#172c72",
          950: "#101d48",
        },
      },
    },
  },
  plugins: [animate],
};

export default config;
