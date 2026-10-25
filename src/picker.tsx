import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Minus, X, Search } from "lucide-react";
import { cn } from "./cn";

// ===========================================================================
// Picker — the shared dropdown (design.md 8.7): one component for every "pick
// from a list", in place of the native <select>, whose menu is the browser's.
// Takes an `options` array and supports:
//   variant     — how the closed control looks: "field" (default) a form field;
//                 "button" a compact toolbar button (filters, sort), `size="sm"`
//                 for a tight bar; "plain" text and a chevron, for the value at
//                 the end of a settings row
//   searchable  — a filter box in the menu
//   multiSelect — checkboxes + chips, value is string[]
//   icon        — an element rendered before an option's label (and in the chip)
//   children    — one level of nesting. In multiSelect a parent is a tri-state
//                 checkbox that toggles all its children; in single-select a
//                 parent is a non-selectable group header.
//
// The menu opens in a portal, so a card's overflow or a modal's edge never clips
// it: below the trigger (above when there's no room), at least as wide as it,
// aligned to whichever edge keeps it on screen. Arrow keys move, Enter or Space
// picks, Escape closes back to the trigger.
//
//   <Picker options={opts} value={v} onChange={setV} searchable />
//   <Picker options={opts} value={arr} onChange={setArr} multiSelect searchable />
//   <Picker variant="button" options={sorts} value={sort} onChange={setSort} ariaLabel="Sort" />
//   // grouped: [{ value, label, icon, children: [{ value, label }, …] }]
// ===========================================================================
export interface PickerOption {
  value: string;
  label: string;
  hint?: string;
  /** Rendered before the label (and inside the multi chip). E.g. a <ModuleGlyph/>. */
  icon?: ReactNode;
  /** One level of nested options. Parent toggles all children (multi) or acts as
   *  a group header (single). */
  children?: PickerOption[];
}

interface BaseProps {
  options: PickerOption[];
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
  variant?: "field" | "button" | "plain";
  /** The button variant's size: "sm" for a tight bar. */
  size?: "sm" | "md";
  /** The control's name for screen readers, when no visible label is tied to it. */
  ariaLabel?: string;
}
interface SingleProps extends BaseProps {
  multiSelect?: false;
  value: string;
  onChange: (value: string) => void;
}
interface MultiProps extends BaseProps {
  multiSelect: true;
  value: string[];
  onChange: (value: string[]) => void;
}
type PickerProps = SingleProps | MultiProps;

const isGroup = (o: PickerOption): boolean => !!o.children && o.children.length > 0;

/** Every selectable leaf (childless top-level options + all children). */
export function leaves(options: PickerOption[]): PickerOption[] {
  return options.flatMap((o) => (isGroup(o) ? (o.children as PickerOption[]) : [o]));
}

function matches(o: PickerOption, q: string): boolean {
  return o.label.toLowerCase().includes(q) || (o.hint?.toLowerCase().includes(q) ?? false);
}

/** Filter by query, keeping a group if it (or any child) matches. */
export function filterOptions(options: PickerOption[], query: string): PickerOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  const out: PickerOption[] = [];
  for (const o of options) {
    if (isGroup(o)) {
      const kids = matches(o, q)
        ? (o.children as PickerOption[])
        : (o.children as PickerOption[]).filter((c) => matches(c, q));
      if (kids.length) out.push({ ...o, children: kids });
    } else if (matches(o, q)) {
      out.push(o);
    }
  }
  return out;
}

/** Tri-state check box used by leaves (none/all) and group parents (+ some). */
function CheckBox({ state }: { state: "none" | "some" | "all" }) {
  return (
    <span
      className={cn(
        "grid h-4 w-4 flex-none place-items-center rounded border transition",
        state === "none"
          ? "border-slate-300 dark:border-slate-600"
          : "border-brand-500 bg-brand-500 text-white",
      )}
    >
      {state === "all" && <Check className="h-3 w-3" />}
      {state === "some" && <Minus className="h-3 w-3" />}
    </span>
  );
}

const TRIGGER: Record<NonNullable<BaseProps["variant"]>, string> = {
  field: "input flex min-h-[2.375rem] w-full items-center justify-between gap-2 text-left",
  button:
    "inline-flex h-[2.375rem] max-w-full items-center gap-1.5 rounded-xl bg-slate-500/[0.08] pl-3.5 pr-3 text-sm font-medium text-slate-700 " +
    "transition hover:bg-slate-500/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 " +
    "aria-expanded:bg-slate-500/[0.14] dark:bg-white/[0.07] dark:text-slate-200 dark:hover:bg-white/[0.12] dark:aria-expanded:bg-white/[0.12]",
  plain:
    "inline-flex max-w-full items-center gap-1 rounded-md text-[15px] text-slate-500 transition hover:text-slate-800 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 aria-expanded:text-slate-800 " +
    "dark:text-slate-400 dark:hover:text-slate-100 dark:aria-expanded:text-slate-100",
};

/** Can this screen hover — a mouse or trackpad, rather than a finger? */
function canHover(): boolean {
  return typeof window === "undefined" || !window.matchMedia?.("(hover: none)").matches;
}

/** Space between the trigger and the menu, and between the menu and the viewport's edge. */
const GAP = 6;
const EDGE = 8;
/** The menu's own height cap: 20rem, as its classes say. */
const MAX_MENU_PX = 320;

interface Placement {
  top: number;
  left: number;
  minWidth: number;
  /** The room on the side it opens toward: past it, the list scrolls rather than leave the screen. */
  maxHeight: number;
  up: boolean;
  end: boolean;
}

export function Picker(props: PickerProps) {
  const { options, placeholder = "Select…", searchable, disabled, className, variant = "field", size = "md", ariaLabel } = props;
  const isMulti = props.multiSelect === true;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [shown, setShown] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const allLeaves = leaves(options);
  // A single value is selected when an option has it — "" included, so an "All stores" option
  // can be a choice like any other; a value no option has shows the placeholder.
  const selected = isMulti
    ? (props.value as string[])
    : allLeaves.some((o) => o.value === props.value)
      ? [props.value as string]
      : [];
  const filtered = searchable ? filterOptions(options, query) : options;

  function close(refocus: boolean) {
    setOpen(false);
    setQuery("");
    setPlacement(null);
    setShown(false);
    if (refocus) triggerRef.current?.focus();
  }

  function toggleOpen() {
    if (disabled) return;
    if (open) close(false);
    else setOpen(true);
  }

  // Place the menu before it paints: below the trigger unless there's more room above, and
  // left-aligned unless that would run it off the right edge.
  useLayoutEffect(() => {
    if (!open) return;
    const t = triggerRef.current?.getBoundingClientRect();
    const p = panelRef.current?.getBoundingClientRect();
    if (!t || !p) return;
    const width = Math.max(p.width, t.width);
    const below = window.innerHeight - t.bottom - GAP - EDGE;
    const above = t.top - GAP - EDGE;
    const up = p.height > below && above > below;
    const end = t.left + width > window.innerWidth - EDGE && t.right - width >= EDGE;
    // Never taller than the menu's own cap, or than the room on its side: an upward menu's top is
    // placed from this height, so it must be the height it renders at.
    const maxHeight = Math.min(MAX_MENU_PX, Math.max(120, up ? above : below));
    const height = Math.min(p.height, maxHeight);
    const next: Placement = {
      top: up ? Math.max(EDGE, t.top - GAP - height) : t.bottom + GAP,
      left: end ? t.right - width : Math.max(EDGE, Math.min(t.left, window.innerWidth - width - EDGE)),
      minWidth: t.width,
      maxHeight,
      up,
      end,
    };
    setPlacement((cur) => (cur && JSON.stringify(cur) === JSON.stringify(next) ? cur : next));
    // Measured again only when the menu's contents (or a multi-select's chips, which can grow
    // the trigger) change — not on every render of the caller, whose options array is usually
    // a new one each time.
  }, [open, query, filtered.length, selected.length]);

  // Once placed: animate in, and move focus into the menu — the search box, else the
  // selected option, else the first.
  useEffect(() => {
    if (!placement) return;
    const frame = requestAnimationFrame(() => setShown(true));
    const panel = panelRef.current;
    // On a touch screen focus stays put: focusing the search box would raise the keyboard over
    // the list before anyone asked to type, and focusing an option has no keyboard to serve.
    if (canHover()) {
      if (searchable) searchRef.current?.focus();
      else (panel?.querySelector<HTMLElement>("[data-option][aria-selected='true']") ?? items(panel)[0])?.focus();
    }
    return () => cancelAnimationFrame(frame);
    // Only on first placement: refocusing as the list filters would steal the search box's focus.
  }, [placement !== null]);

  // A click elsewhere, a scroll of the page under it, or the window changing closes it. A phone's
  // keyboard coming up only makes the window shorter (Android resizes it as it opens), so only a
  // change of width counts there — otherwise typing in the search box would close the menu.
  useEffect(() => {
    if (!open) return;
    const inside = (n: EventTarget | null) =>
      n instanceof Node && (panelRef.current?.contains(n) || triggerRef.current?.contains(n));
    const onDown = (e: MouseEvent) => !inside(e.target) && close(false);
    const onScroll = (e: Event) => !inside(e.target) && close(false);
    const onLeave = () => close(false);
    const width = window.innerWidth;
    const onResize = () => (canHover() || window.innerWidth !== width) && close(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    window.addEventListener("blur", onLeave);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("blur", onLeave);
    };
  }, [open]);

  function onTriggerKey(e: KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) toggleOpen();
    } else if (e.key === "Escape" && open) {
      e.stopPropagation(); // the menu closes, not a modal around it
      close(true);
    }
  }

  function onPanelKey(e: KeyboardEvent) {
    const list = items(panelRef.current);
    const i = list.indexOf(document.activeElement as HTMLElement);
    const inSearch = document.activeElement === searchRef.current;
    const focus = (n: number) => list[Math.max(0, Math.min(list.length - 1, n))]?.focus();
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focus(i < 0 ? 0 : i + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (i <= 0 && searchable) searchRef.current?.focus();
        else focus(i - 1);
        break;
      case "Home":
      case "End":
        if (inSearch) break;
        e.preventDefault();
        focus(e.key === "Home" ? 0 : list.length - 1);
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation(); // the menu closes, not a modal around it
        close(true);
        break;
      case "Tab":
        e.preventDefault();
        close(true);
        break;
    }
  }

  function toggleLeaf(value: string) {
    if (isMulti) {
      const cur = props.value as string[];
      (props as MultiProps).onChange(
        cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value],
      );
    } else {
      (props as SingleProps).onChange(value);
      close(true);
    }
  }

  // multiSelect: checking a parent checks all its children; unchecking clears them.
  function toggleGroup(group: PickerOption) {
    const childVals = (group.children ?? []).map((c) => c.value);
    const cur = props.value as string[];
    const allOn = childVals.every((v) => cur.includes(v));
    (props as MultiProps).onChange(
      allOn
        ? cur.filter((v) => !childVals.includes(v))
        : [...new Set([...cur, ...childVals])],
    );
  }

  function triggerContent() {
    if (isMulti) {
      const sel = allLeaves.filter((o) => selected.includes(o.value));
      if (sel.length === 0) return <span className="text-slate-400">{placeholder}</span>;
      if (variant !== "field") {
        return <span className="truncate">{sel.length === 1 ? sel[0]!.label : `${sel[0]!.label} +${sel.length - 1}`}</span>;
      }
      return (
        <span className="flex flex-wrap gap-1">
          {sel.map((o) => (
            <span
              key={o.value}
              className="inline-flex items-center gap-1 rounded-md bg-brand-500/10 px-1.5 py-0.5 text-xs text-brand-700 dark:text-brand-300"
            >
              {o.icon}
              {o.label}
              <span
                role="button"
                tabIndex={-1}
                aria-label={`Remove ${o.label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLeaf(o.value);
                }}
                className="rounded hover:text-rose-500"
              >
                <X className="h-3 w-3" />
              </span>
            </span>
          ))}
        </span>
      );
    }
    const sel = allLeaves.find((o) => o.value === (props.value as string));
    if (!sel) return <span className="truncate text-slate-400">{placeholder}</span>;
    return (
      <span className="flex min-w-0 items-center gap-2">
        {sel.icon}
        <span className="truncate">{sel.label}</span>
      </span>
    );
  }

  function renderLeaf(o: PickerOption, nested: boolean) {
    const isSel = selected.includes(o.value);
    return (
      <li key={o.value}>
        <button
          type="button"
          role="option"
          aria-selected={isSel}
          data-option
          onClick={() => toggleLeaf(o.value)}
          className={cn(
            "flex min-h-[34px] w-full items-center gap-2 rounded-md py-1.5 pr-3 text-left text-sm outline-none transition-colors touch:min-h-[44px] touch:text-[15px]",
            nested ? "pl-8" : "pl-2.5",
            isSel && !isMulti
              ? "bg-brand-500/10 text-brand-700 hover:bg-brand-500/15 focus-visible:bg-brand-500/15 dark:text-brand-300"
              : "text-slate-800 hover:bg-slate-500/10 focus-visible:bg-slate-500/10 dark:text-slate-100",
          )}
        >
          {isMulti ? (
            <CheckBox state={isSel ? "all" : "none"} />
          ) : (
            // The selected row is marked with a check; the others keep its space, so labels line up.
            <Check className={cn("h-4 w-4 flex-none", isSel ? "text-brand-600 dark:text-brand-300" : "invisible")} />
          )}
          {o.icon}
          <span className="min-w-0 flex-1">
            <span className="block truncate">{o.label}</span>
            {o.hint && <span className="block truncate text-xs text-slate-400">{o.hint}</span>}
          </span>
        </button>
      </li>
    );
  }

  function renderGroup(o: PickerOption) {
    const childVals = (o.children ?? []).map((c) => c.value);
    const selCount = childVals.filter((v) => selected.includes(v)).length;
    const state = selCount === 0 ? "none" : selCount === childVals.length ? "all" : "some";
    return (
      <li key={o.value}>
        {isMulti ? (
          <button
            type="button"
            data-option
            onClick={() => toggleGroup(o)}
            className="flex min-h-[34px] w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm font-medium outline-none transition-colors hover:bg-slate-500/10 focus-visible:bg-slate-500/10 touch:min-h-[44px] touch:text-[15px]"
          >
            <CheckBox state={state} />
            {o.icon}
            <span className="min-w-0 flex-1 truncate">{o.label}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {o.icon}
            <span className="truncate">{o.label}</span>
          </div>
        )}
        <ul>{(o.children ?? []).map((c) => renderLeaf(c, true))}</ul>
      </li>
    );
  }

  const origin = `${placement?.up ? "bottom" : "top"} ${placement?.end ? "right" : "left"}`;

  return (
    <div className={cn(variant === "field" ? "relative" : "relative inline-flex max-w-full", className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        onKeyDown={onTriggerKey}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={cn(
          TRIGGER[variant],
          variant === "button" && size === "sm" && "h-8 rounded-lg pl-2.5 pr-2 text-[13px]",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <span className="min-w-0 flex-1">{triggerContent()}</span>
        <ChevronDown
          className={cn(
            "flex-none text-slate-400 transition-transform duration-150 ease-out",
            variant === "button" ? "h-3.5 w-3.5" : "h-4 w-4",
            open && "rotate-180",
          )}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            onKeyDown={onPanelKey}
            style={
              placement
                ? { top: placement.top, left: placement.left, minWidth: placement.minWidth, maxHeight: placement.maxHeight, transformOrigin: origin }
                : undefined
            }
            className={cn(
              "fixed left-0 top-0 z-[70] flex max-h-[min(20rem,calc(100vh-1rem))] w-max max-w-[min(22rem,calc(100vw-1rem))] flex-col",
              "rounded-xl border border-black/[0.08] bg-white p-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:border-white/[0.1] dark:bg-slate-800",
              "transition-[opacity,transform] duration-[120ms] ease-out",
              shown ? "scale-100 opacity-100" : "scale-[0.97] opacity-0",
            )}
          >
            {searchable && (
              <div className="mb-1 flex items-center gap-2 border-b border-black/[0.06] px-2.5 pb-1.5 pt-0.5 dark:border-white/[0.08]">
                <Search className="h-4 w-4 flex-none text-slate-400" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  aria-label="Search the options"
                  className="w-full min-w-[8rem] bg-transparent py-1 text-sm outline-none placeholder:text-slate-400"
                />
              </div>
            )}
            <ul role="listbox" aria-multiselectable={isMulti || undefined} aria-label={ariaLabel} className="min-h-0 flex-1 overflow-y-auto">
              {filtered.length === 0 && <li className="px-2.5 py-2 text-sm text-slate-400">No matches</li>}
              {filtered.map((o) => (isGroup(o) ? renderGroup(o) : renderLeaf(o, false)))}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}

/** The menu's focusable rows, in order. */
function items(panel: HTMLElement | null | undefined): HTMLElement[] {
  return panel ? [...panel.querySelectorAll<HTMLElement>("[data-option]:not([disabled])")] : [];
}
