import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F5F6F2",
        card: "#FFFFFF",
        ink: { DEFAULT: "#17201B", 2: "#55615A", 3: "#8A948E" },
        line: { DEFAULT: "#E3E7E0", strong: "#CBD2C9" },
        pine: { DEFAULT: "#1E4D3A", dark: "#143628", soft: "#E4EFE8" },
        turmeric: { DEFAULT: "#B7791F", soft: "#FBF0D9" },
        chilli: { DEFAULT: "#B23A2B", soft: "#FBE9E6" },
        amber: { soft: "#FFF4DB", DEFAULT: "#9A6A0A" },
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
