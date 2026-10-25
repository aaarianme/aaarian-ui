# @aaarianme/ui

The aaarian.me suite's shared UI kit: the Apple-inspired React components every app is built from
(Scouter, ACO, Inventory, Tix, Proxies, Notifications, Accounts), the Tailwind preset they share,
and the CSS classes the components are drawn with. One copy, versioned, instead of a file copied
into each app.

The design rules — when to use what — are aaarian-infra's `DESIGN.md`.

## What's in it

| Import | What |
| --- | --- |
| `@aaarianme/ui` | `Button`, `Card`, `Input`, `Select`, `Textarea`, `Field`, `Badge`, `Switch`, `Checkbox`, `Tabs`, `SearchInput`, `Thumb`, `Table`/`Th`/`Tr`/`Td`, `Pagination`, `StatCard`, `EmptyState`, `Spinner`; `Modal`, `useToast`, `useConfirm`, `OverlayProvider`; `Picker` (the dropdown); `ContextMenu`, `MenuButton`, `MoreMenu`; `AppSwitcher` and the suite's app list; the theme (`initTheme`, `useTheme`, `AppearanceCard`); `configureUi`; `cn` |
| `@aaarianme/ui/router` | `SettingsTabs`, `SettingsOverview`, `SettingsHealth` and the Settings shell; `useUrlState` — they need `react-router-dom` |
| `@aaarianme/ui/date-picker` | `DatePicker` — needs `@daypicker/react` and `date-fns` |
| `@aaarianme/ui/time-zone` | the suite's time zone (set in Accounts): `suiteTimeZone`, `dayKey`, `zonedParts`, … Imported **first** in `main.tsx`: importing it points the browser's date formatting at the zone |
| `@aaarianme/ui/tailwind` | the Tailwind preset: Apple's grays and system colours, the font, shadows, `darkMode: "class"`, hover only where there's a mouse, and the `touch:` variant |
| `@aaarianme/ui/kit.css` | `.card`, `.input`, `.glass`, the segmented control's classes, a default `.brand-gradient` |

## Using it in an app

```sh
npm i https://github.com/aaarianme/aaarian-ui/releases/download/v1.0.0/aaarianme-ui-1.0.0.tgz
```

A release's download link is public, so neither this Mac nor the server's Docker builds need a
token to install it. The app's `package-lock.json` keeps the exact file and its hash.

**tailwind.config.js** — the preset, the kit's files in what Tailwind reads, and the app's own accent:

```js
import ui from "@aaarianme/ui/tailwind";

export default {
  presets: [ui],
  content: ["./index.html", "./src/**/*.{ts,tsx}", "./node_modules/@aaarianme/ui/dist/**/*.js"],
  theme: { extend: { colors: { brand: { 50: "#…", /* … */ 500: "#0a84ff", /* … */ 900: "#…" } } } },
};
```

**src/index.css** — the kit's classes before the app's:

```css
@import "@aaarianme/ui/kit.css";
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**src/main.tsx** — the time zone first, then what's this app's own:

```tsx
import "@aaarianme/ui/time-zone";
import { configureUi, initTheme } from "@aaarianme/ui";

configureUi({ tabs: "native" });
initTheme();
```

### What an app makes its own

- its **accent**: the `brand` scale in tailwind.config.js;
- its **gradient**: `.brand-gradient` in its index.css (the kit's default is built from `brand`);
- **`configureUi`**, once, before the first render:
  - `tabs` — how `Tabs` looks when a page doesn't say: `"accent"` (default) or `"native"` (iOS);
  - `menuIcon` — `MenuButton`'s `"horizontal"` ⋯ (default) or `"vertical"` ⋮;
  - `thumbFallback` — the glyph a `Thumb` shows when no photo loads (default `ImageOff`);
  - `photoCandidates` — the photos a `Thumb` tries for what it's given (an app's StockX fallbacks);
  - `primaryButtonClassName` — classes over a primary `Button` (ACO's AI gradient).

## Changing it

1. Change it here; `npm run check` (types, tests, build).
2. Bump `version` in package.json and add its entry to CHANGELOG.md: a minor version for something
   new, a patch for a fix, a major when an app has to change to keep working.
3. Commit, then tag and push the tag: `git tag v1.1.0 && git push origin main v1.1.0`. The Release
   workflow checks it, builds it and attaches the package to a GitHub Release.
4. In each app: `npm i <the new release's link>`, build, and ship it as that app's own version.
   aaarian-infra's `scripts/ui-update.sh 1.1.0` does that for every app at once.

Trying a change in an app before releasing it: `npm run build && npm pack` here, then
`npm i ../aaarian-ui/aaarianme-ui-<version>.tgz` in the app.
