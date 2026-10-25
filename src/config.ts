import type { LucideIcon } from "lucide-react";

/**
 * What differs between the apps, set once as each one starts (main.tsx), before it renders:
 *
 *   import { configureUi } from "@aaarianme/ui";
 *   configureUi({ tabs: "native", thumbFallback: ImageOff });
 *
 * Anything left out keeps the kit's default. Everything else an app makes its own is its
 * tailwind.config.js (the `brand` accent scale) and its CSS (`.brand-gradient`).
 */
export interface UiConfig {
  /** The photos a Thumb tries, in order, for what it was given — an app adds its own fallbacks
   *  (a StockX photo's flat shot after its 360 one). Default: the URLs given, blanks and repeats left out. */
  photoCandidates: (src: ThumbSrc) => string[];
  /** The glyph a Thumb shows once no photo loads. Default: ImageOff (Scouter's shoes: Footprints). */
  thumbFallback: LucideIcon | null;
  /** How Tabs looks when a page doesn't say: "accent" (the chosen segment filled with the app's
   *  accent) or "native" (the iOS control: a grey track, a raised thumb sliding to the chosen one). */
  tabs: "accent" | "native";
  /** The ⋮ / ⋯ of MenuButton and MoreMenu: "horizontal" (⋯) or "vertical" (⋮). */
  menuIcon: "horizontal" | "vertical";
  /** Classes added to a primary Button, over its accent fill — ACO's AI gradient. */
  primaryButtonClassName: string;
}

/** What a Thumb can be given: one URL, or several tried in order. */
export type ThumbSrc = string | null | undefined | ReadonlyArray<string | null | undefined>;

/** The URLs given, in order, blanks and repeats left out. */
export function defaultPhotoCandidates(src: ThumbSrc): string[] {
  const list = typeof src === "string" ? [src] : src ? [...src] : [];
  return [...new Set(list.filter((u): u is string => typeof u === "string" && u.trim() !== ""))];
}

const config: UiConfig = {
  photoCandidates: defaultPhotoCandidates,
  thumbFallback: null,
  tabs: "accent",
  menuIcon: "horizontal",
  primaryButtonClassName: "",
};

/** Sets this app's differences (above). Call it once, before the first render. */
export function configureUi(next: Partial<UiConfig>): void {
  Object.assign(config, next);
}

/** The settings in force: read as a component renders, so they're whatever configureUi set. */
export function uiConfig(): Readonly<UiConfig> {
  return config;
}
