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
        gamebg: "#1A1A2E",
        cardbg: "#16213E",
        electric: "#6C5CE7",
        mint: "#00B894",
        reward: "#FDCB6E",
        softred: "#FF6B6B",
        muted: "#8D99AE",
      },
      boxShadow: {
        bubble: "0 24px 60px rgba(21, 50, 74, 0.18)",
        glow: "0 0 0 1px rgba(108, 92, 231, 0.32), 0 18px 50px rgba(108, 92, 231, 0.24)",
      },
      fontFamily: {
        sans: ["var(--font-nunito)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
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
        drift: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -10px, 0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "100% 50%" },
        },
        orbit: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        blink: {
          "0%, 44%, 100%": { transform: "scaleY(1)" },
          "46%, 48%": { transform: "scaleY(0.12)" },
        },
        pop: {
          "0%": { transform: "scale(0.92)", opacity: "0.5" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        floatSlow: {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-16px) rotate(4deg)" },
        },
      },
      animation: {
        bob: "bob 4s ease-in-out infinite",
        pulseRing: "pulseRing 1.8s ease-out infinite",
        drift: "drift 6s ease-in-out infinite",
        shimmer: "shimmer 8s linear infinite alternate",
        orbit: "orbit 10s linear infinite",
        blink: "blink 5s infinite",
        pop: "pop 240ms ease-out",
        floatSlow: "floatSlow 7s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
