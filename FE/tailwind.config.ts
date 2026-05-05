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
          200: "#f1cfa9",
          300: "#e6b07b",
          400: "#d99a5e",
          500: "#c8884a",
          600: "#a8703b",
          700: "#7b5e3c",
          800: "#5a4530",
          900: "#3d2f22"
        }
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Inter", "sans-serif"]
      },
      boxShadow: {
        brand: "0 10px 25px -10px rgba(123, 94, 60, 0.45)",
        "brand-lg": "0 18px 40px -12px rgba(123, 94, 60, 0.55)",
        soft: "0 4px 14px rgba(40, 30, 20, 0.06)",
        "inner-soft": "inset 0 1px 0 rgba(255, 255, 255, 0.5)"
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #7b5e3c 0%, #a8703b 55%, #c8884a 100%)",
        "brand-gradient-soft":
          "linear-gradient(135deg, #fdf6f0 0%, #f9e7d6 100%)",
        "page-glow":
          "radial-gradient(1200px circle at 0% -10%, #f9e7d6 0%, transparent 55%), radial-gradient(900px circle at 100% 10%, #f1cfa9 0%, transparent 50%), linear-gradient(180deg, #fdf6f0 0%, #fbeede 100%)"
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        "fade-in-up": "fade-in-up 0.35s ease-out both"
      }
    }
  },
  plugins: []
};

export default config;
