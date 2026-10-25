# Changelog

@aaarianme/ui's versions: a minor for something new, a patch for a fix, a major when an app has to
change to keep working. A tag of the version publishes it (README, "Changing it").

## 1.0.0 — 2026-10-25

The kit as its own package, in place of the files `sync-ui.sh` copied into each app — the newest,
most complete version of each piece, from whichever app had it:

- **Scouter's** kit as the base: `ui`, `overlays` (stacked dialogs: Esc closes the top one, focus
  moves in and back), the `Picker` dropdown, `ContextMenu` (separators, toggles, `MoreMenu`),
  Settings, the app switcher, `useUrlState`, the time zone.
- **Inventory's** segmented control (`Tabs` "native": a raised thumb that slides to the chosen
  segment, dividers between the others, a tab's own colour), its badge colours (navy, forest,
  black, orange, rust), `SearchInput`'s `inputRef`, and its `DatePicker` (Tix's too).
- **ACO's** keyboard focus rings on switches, a dialog's close button and a toast's dismiss.
- One width scale for `Modal`: sm 24rem, md 32rem, lg 42rem, xl 48rem, 2xl 56rem, 3xl 64rem, 4xl
  72rem — where Tix, ACO and Inventory each had an "xl" of their own.
- `configureUi` for what differs between apps: `Tabs`' default look, the ⋯/⋮ menu icon, a
  `Thumb`'s fallback glyph and photo fallbacks, a primary `Button`'s extra classes.
- The Tailwind preset (`@aaarianme/ui/tailwind`) and the kit's CSS classes (`@aaarianme/ui/kit.css`).
