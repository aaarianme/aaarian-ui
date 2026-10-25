import { defineConfig } from "tsup";

// One ESM build, an entry per import path. Shared code (the time zone, cn, the config) goes in a
// common chunk, so every entry sees one copy of it: the time zone an app sets is the one the
// DatePicker reads.
export default defineConfig({
  entry: {
    index: "src/index.ts",
    router: "src/router.ts",
    "date-picker": "src/date-picker.tsx",
    "time-zone": "src/time-zone.ts",
  },
  format: ["esm"],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  external: ["react", "react-dom", "react-router-dom", "lucide-react", "@daypicker/react", "date-fns", "tailwindcss"],
});
