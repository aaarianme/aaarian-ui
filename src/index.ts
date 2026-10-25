// @aaarianme/ui — the suite's shared UI kit. Every app imports its components from here:
//
//   import { Button, Card, Modal, Picker, useToast } from "@aaarianme/ui";
//
// What needs more than React has its own entry, so an app that doesn't use it doesn't install it:
//   @aaarianme/ui/router       Settings and useUrlState (react-router-dom)
//   @aaarianme/ui/date-picker  DatePicker (@daypicker/react, date-fns)
//   @aaarianme/ui/time-zone    the suite's time zone — imported first in main.tsx
//   @aaarianme/ui/tailwind     the Tailwind preset (theme, `touch:` variant)
//   @aaarianme/ui/kit.css      the kit's CSS classes (.card, .input, .segmented, …)
export * from "./ui";
export * from "./overlays";
export { AppSwitcher } from "./AppSwitcher";
export { Picker, leaves, filterOptions, type PickerOption } from "./picker";
export { ContextMenu, MenuButton, MoreMenu, useContextMenu, type ContextMenuItem } from "./ContextMenu";
export * from "./services";
export { configureUi, defaultPhotoCandidates, type UiConfig, type ThumbSrc } from "./config";
export { cn } from "./cn";
