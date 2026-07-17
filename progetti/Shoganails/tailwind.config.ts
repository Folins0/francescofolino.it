import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        coral: {
          50: "#fff6f3",
          100: "#ffe9e1",
          200: "#ffd0bd",
          300: "#ffb096",
          400: "#ff8a68",
          500: "#f97148",
          600: "#e85a38",
          700: "#c1442a",
          800: "#a23621",
        },
        rose: {
          50: "#fff5f7",
          100: "#ffe4ea",
          200: "#ffc9d6",
          300: "#ffa3b8",
          400: "#fb7a99",
          500: "#f0577c",
          600: "#d43f63",
          700: "#b8325a",
          800: "#9c2f52",
        },
        marble: {
          50: "#fdfcfb",
          100: "#f7f4f1",
          200: "#efe9e4",
          300: "#e2dad3",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      backgroundImage: {
        "marble-veins":
          "radial-gradient(ellipse at top left, rgba(255,255,255,0.6), transparent 55%), radial-gradient(ellipse at bottom right, rgba(249,113,72,0.06), transparent 60%)",
      },
    },
  },
  plugins: [],
};
export default config;
