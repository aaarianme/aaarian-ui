import plugin from "tailwindcss/plugin";

/**
 * @aaarianme/ui's Tailwind preset: the suite's Apple-inspired theme, the same in every app. An app
 * adds only what's its own — the `brand` accent scale (500 is the brand colour exactly) and any
 * colours of its own — and the kit's files to what Tailwind reads:
 *
 *   import ui from "@aaarianme/ui/tailwind";
 *   export default {
 *     presets: [ui],
 *     content: ["./index.html", "./src/**\/*.{ts,tsx}", "./node_modules/@aaarianme/ui/dist/**\/*.js"],
 *     theme: { extend: { colors: { brand: { 50: "…", …, 900: "…" } } } },
 *   };
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  darkMode: "class",
  // hover: styles apply only where something can hover (a mouse or trackpad). On a phone a tap
  // would otherwise leave the hover look stuck on whatever was tapped.
  future: { hoverOnlyWhenSupported: true },
  content: [],
  theme: {
    extend: {
      colors: {
        // Apple's neutral grays (in place of `slate`).
        slate: {
          50: "#f5f5f7",
          100: "#ececed",
          200: "#e1e1e3",
          300: "#cfcfd3",
          400: "#a1a1a6",
          500: "#86868b",
          600: "#6e6e73",
          700: "#48484a",
          800: "#2c2c2e",
          900: "#1c1c1e",
          950: "#000000",
        },
        // Apple's system colours (key shades).
        emerald: { 100: "#d6f7df", 300: "#86e0a0", 500: "#34c759", 600: "#2fb350", 700: "#248a3d" },
        amber: { 100: "#ffeccc", 300: "#ffd279", 500: "#ff9f0a", 600: "#e98c00", 700: "#b96d00" },
        rose: { 100: "#ffe1df", 300: "#ff9d97", 500: "#ff3b30", 600: "#e0241a", 700: "#bb1a12" },
        blue: { 100: "#d8ebff", 300: "#7cb8ff", 500: "#0a84ff", 600: "#007aff", 700: "#0062cc" },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Helvetica Neue",
          "Inter",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04), 0 12px 28px -16px rgba(0,0,0,0.18)",
        soft: "0 1px 3px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [
    // `touch:` — a screen that can't hover (a phone, a tablet): what a mouse gets on hover or
    // right-click, a finger gets as something to tap, with room for a fingertip. A variant rather
    // than a screen, so `max-sm:` and friends keep working.
    plugin(({ addVariant }) => addVariant("touch", "@media (hover: none)")),
  ],
};
