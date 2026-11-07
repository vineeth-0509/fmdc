import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F2F6F3",
        card: "#FFFFFF",
        ink: { DEFAULT: "#13201A", 2: "#4B5A52", 3: "#7E8C84" },
        line: { DEFAULT: "#E1E9E4", strong: "#C6D3CB" },
        pine: { DEFAULT: "#0F6B4A", dark: "#0A4F37", soft: "#DDF3E8" },
        turmeric: { DEFAULT: "#D97706", soft: "#FFF0D6" },
        chilli: { DEFAULT: "#C0392B", soft: "#FDEBE7" },
        amber: { soft: "#FFF4DB", DEFAULT: "#92580A" },
      },
      fontFamily: { sans: ["var(--font-hind)", "system-ui", "sans-serif"] },
      boxShadow: {
        soft: "0 1px 2px rgba(23,32,27,0.04), 0 4px 14px rgba(23,32,27,0.05)",
        bar: "0 -6px 20px rgba(23,32,27,0.07)",
      },
      keyframes: {
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        pop: { "0%": { transform: "scale(0.96)", opacity: "0" }, "100%": { transform: "scale(1)", opacity: "1" } },
      },
      animation: { shimmer: "shimmer 1.4s linear infinite", pop: "pop 160ms ease-out" },
    },
  },
  plugins: [],
};

export default config;
