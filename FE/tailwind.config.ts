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
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "fade-in-down": {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" }
        },
        "shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(200%)" }
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" }
        }
      },
      animation: {
        "fade-in": "fade-in 400ms ease-out both",
        "fade-in-up": "fade-in-up 500ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in-down": "fade-in-down 400ms ease-out both",
        "scale-in": "scale-in 350ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "shimmer": "shimmer 1.6s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
