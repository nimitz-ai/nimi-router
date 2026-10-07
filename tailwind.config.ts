import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#09090b",
        panel: "#101014",
        accent: "#10b981",
      },
    },
  },
  plugins: [],
};

export default config;
