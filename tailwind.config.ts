import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
      },
      colors: {
        // Rhoost terracotta-oranje — gebruikt voor knoppen, accenten, links
        primary: {
          50:  "#FDF5EE",
          100: "#FAE4D1",
          200: "#F4C89F",
          300: "#ECA672",
          400: "#E48A52",
          500: "#D87845",
          600: "#C8834A",
          700: "#A86435",
          800: "#874D20",
          900: "#5F330F",
        },
        // Rhoost bosgroen — gebruikt voor sidebar en footer-achtige secties
        forest: {
          50:  "#EFF5F2",
          100: "#D5E6DB",
          200: "#AECAB7",
          300: "#82AE91",
          400: "#5A8E6D",
          500: "#44724F",
          600: "#365C40",
          700: "#2D4438",
          800: "#202E27",
          900: "#151E19",
          950: "#0E1411",
        },
      },
    },
  },
  plugins: [],
};

export default config;
