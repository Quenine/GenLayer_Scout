import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111814",
        canvas: "#f3f5f1",
        panel: "#ffffff",
        line: "#dfe5dd",
        moss: {
          50: "#f0f7f3",
          100: "#dceee3",
          200: "#badcc9",
          300: "#8ec2a5",
          400: "#60a27f",
          500: "#418363",
          600: "#32694f",
          700: "#2a543f",
          800: "#234334",
          900: "#1e382c"
        }
      },
      boxShadow: {
        card: "0 1px 2px rgba(17, 24, 20, 0.04), 0 8px 24px rgba(17, 24, 20, 0.035)"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular"]
      }
    }
  },
  plugins: []
};

export default config;
