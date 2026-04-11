import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{vue,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "var(--color-canvas)",
        surface: "var(--color-surface)",
        panel: "var(--color-panel)",
        line: "var(--color-line)",
        ink: "var(--color-ink)",
        muted: "var(--color-muted)",
        accent: "var(--color-accent)",
        "accent-soft": "var(--color-accent-soft)",
        success: "var(--color-success)"
      },
      boxShadow: {
        shell: "0 24px 60px rgba(15, 23, 42, 0.08)",
        card: "0 12px 30px rgba(15, 23, 42, 0.06)"
      },
      borderRadius: {
        shell: "28px"
      },
      fontFamily: {
        sans: ["Inter", "PingFang SC", "Microsoft YaHei", "sans-serif"]
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(circle at top left, rgba(47, 109, 246, 0.16), transparent 34%), radial-gradient(circle at top right, rgba(133, 163, 255, 0.1), transparent 28%)"
      }
    }
  },
  plugins: []
} satisfies Config;
