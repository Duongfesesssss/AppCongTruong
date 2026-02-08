import type { Config } from "tailwindcss";

export default {
  content: [
    "./components/**/*.{vue,js,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./composables/**/*.{js,ts}",
    "./app.vue"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f7ff",
          100: "#dbe8ff",
          200: "#b9d3ff",
          300: "#86b4ff",
          400: "#4c8cff",
          500: "#2f6bff",
          600: "#204fe6",
          700: "#1a3cbf",
          800: "#1a349a",
          900: "#1a2f7d"
        }
      }
    }
  },
  plugins: []
} satisfies Config;
