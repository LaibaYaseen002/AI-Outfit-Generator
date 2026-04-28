import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fdf6f0",
          100: "#f9e7d6",
          500: "#c8884a",
          700: "#7b5e3c"
        }
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Inter", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
