import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        skywash: "#e6fbff",
        mango: "#ffd36e",
        coral: "#ff7f6b",
        lagoon: "#0a6e8c",
        ink: "#15324a",
      },
      boxShadow: {
        bubble: "0 24px 60px rgba(21, 50, 74, 0.18)",
      },
      fontFamily: {
        sans: ["Trebuchet MS", "Verdana", "sans-serif"],
      },
      keyframes: {
        bob: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        pulseRing: {
          "0%": { transform: "scale(0.94)", opacity: "0.35" },
          "70%": { transform: "scale(1.08)", opacity: "0.12" },
          "100%": { transform: "scale(1.12)", opacity: "0" },
        },
      },
      animation: {
        bob: "bob 4s ease-in-out infinite",
        pulseRing: "pulseRing 1.8s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
