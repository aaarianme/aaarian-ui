import { useLayoutEffect, useRef, useState } from "react";
import type {
  ReactNode,
  Ref,
  InputHTMLAttributes,
  ButtonHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { Loader2, Moon, Sun, Check, Search, X, ImageOff } from "lucide-react";
import { cn } from "./cn";
import { uiConfig, type ThumbSrc } from "./config";

// ===========================================================================
// Apple-inspired UI kit: cards, buttons, fields, badges, tabs, search, tables. The same in every
// app; what an app makes its own is its tailwind.config.js (the `brand` accent scale), its CSS
// (`.brand-gradient`) and configureUi (config.ts).
// ===========================================================================

// ---------------------------------------------------------------------------
// Theme (dark default, light toggle) — self-contained, no external store.
// ---------------------------------------------------------------------------
/** Your choice of theme, once you've made one: "light" or "dark". Until you choose, it's dark. */
const THEME_KEY = "ui:theme";

export function initTheme(): void {
  const dark = localStorage.getItem(THEME_KEY) !== "light"; // dark unless you've chosen light
  document.documentElement.classList.toggle("dark", dark);
  // "theme" kept choices made while light was the default; every app starts dark again, once.
  localStorage.removeItem("theme");
}

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(
    typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );
  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    setDark(next);
  }
  return (
    <button
      type="button"
      onClick={toggle}
      title={dark ? "Switch to light" : "Switch to dark"}
      aria-label="Toggle theme"
      className={cn(
        "grid h-9 w-9 place-items-center rounded-full text-slate-600 transition hover:bg-slate-100 active:scale-95 dark:text-slate-300 dark:hover:bg-slate-800",
        className,
      )}
    >
      {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}

// Read/flip the current theme. Theme is global via the `dark` class on <html>,
// so a single consumer (the Appearance section) stays in sync without a store.
export function useTheme(): [boolean, () => void] {
  const [dark, setDark] = useState(
    typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );
  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    setDark(next);
  }
  return [dark, toggle];
}

// ---------------------------------------------------------------------------
// AppearanceCard — the canonical light/dark control for every app's /settings.
// ---------------------------------------------------------------------------
export function AppearanceCard() {
  const [dark, toggle] = useTheme();
  return (
    <Card>
      <SectionTitle>Appearance</SectionTitle>
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-black/[0.06] px-4 py-3 dark:border-white/[0.08]">
        <div className="flex items-center gap-3">
          {dark ? (
            <Moon className="h-[18px] w-[18px] text-slate-500" />
          ) : (
            <Sun className="h-[18px] w-[18px] text-slate-500" />
          )}
          <div>
            <div className="text-sm font-medium">Theme</div>
            <div className="text-xs text-slate-400">{dark ? "Dark" : "Light"} mode</div>
          </div>
        </div>
        <button
          type="button"
          onClick={toggle}
          role="switch"
          aria-checked={dark}
          aria-label="Toggle dark mode"
          className={cn(
            "relative h-7 w-12 flex-none rounded-full transition",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900",
            dark ? "bg-brand-500" : "bg-slate-300 dark:bg-slate-700",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 grid h-6 w-6 place-items-center rounded-full bg-white shadow transition-all",
              dark ? "left-[1.375rem]" : "left-0.5",
            )}
          >
            {dark ? (
              <Moon className="h-3.5 w-3.5 text-slate-600" />
            ) : (
              <Sun className="h-3.5 w-3.5 text-amber-500" />
            )}
          </span>
        </button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Switch — a pill toggle (used by settings cards).
// ---------------------------------------------------------------------------
export function Switch({
  checked,
  onChange,
  ariaLabel,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 flex-none rounded-full transition disabled:opacity-50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900",
        checked ? "bg-brand-500" : "bg-slate-300 dark:bg-slate-700",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all",
          checked ? "left-[1.375rem]" : "left-0.5",
        )}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Remember-filters preference — when on, each page's URL filters are restored
// when you return to it (see FilterMemory in Layout). Persisted in localStorage.
// ---------------------------------------------------------------------------
const REMEMBER_FILTERS_KEY = "ui:remember-filters";

export function getRememberFilters(): boolean {
  return localStorage.getItem(REMEMBER_FILTERS_KEY) !== "0"; // default on
}

export function useRememberFilters(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(getRememberFilters());
  const set = (v: boolean) => {
    localStorage.setItem(REMEMBER_FILTERS_KEY, v ? "1" : "0");
    setOn(v);
  };
  return [on, set];
}

export function FiltersCard() {
  const [on, setOn] = useRememberFilters();
  return (
    <Card>
      <SectionTitle>Filters</SectionTitle>
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-black/[0.06] px-4 py-3 dark:border-white/[0.08]">
        <div className="min-w-0">
          <div className="text-sm font-medium">Remember filters</div>
          <div className="text-xs text-slate-400">Restore each page’s filters when you return to it.</div>
        </div>
        <Switch checked={on} onChange={setOn} ariaLabel="Remember filters" />
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Checkbox — macOS-style: rounded square, brand fill + white check when on.
// ---------------------------------------------------------------------------
export function Checkbox({
  checked,
  onChange,
  label,
  hint,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex select-none items-start gap-2.5",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "mt-0.5 grid h-[18px] w-[18px] flex-none place-items-center rounded-[6px] border transition",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/40 peer-focus-visible:ring-offset-1",
          checked
            ? "border-brand-500 bg-brand-500 shadow-sm"
            : "border-black/25 bg-white shadow-inner dark:border-white/25 dark:bg-slate-800",
        )}
      >
        {checked && <Check className="h-3 w-3 text-white" strokeWidth={3.5} />}
      </span>
      {(label || hint) && (
        <span>
          {label && <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>}
          {hint && <span className="block text-xs text-slate-400">{hint}</span>}
        </span>
      )}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("card p-5", className)}>{children}</div>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">{children}</h2>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------
export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = "brand",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  accent?: "brand" | "emerald" | "amber" | "rose" | "slate";
  className?: string;
}) {
  const accents: Record<string, string> = {
    brand: "text-brand-600 bg-brand-500/10 dark:text-brand-300",
    emerald: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-300",
    amber: "text-amber-600 bg-amber-500/10 dark:text-amber-300",
    rose: "text-rose-600 bg-rose-500/10 dark:text-rose-300",
    slate: "text-slate-600 bg-slate-500/10 dark:text-slate-300",
  };
  return (
    <Card className={cn("flex items-center gap-4", className)}>
      {icon && <div className={cn("grid h-12 w-12 place-items-center rounded-2xl", accents[accent])}>{icon}</div>}
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-slate-500 dark:text-slate-400">{label}</div>
        <div className="truncate text-2xl font-semibold tracking-tight">{value}</div>
        {hint && <div className="text-xs text-slate-400">{hint}</div>}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------
export function Badge({
  children,
  color = "slate",
  className,
}: {
  children: ReactNode;
  /** navy and forest are colour scales an app defines (Inventory's statuses); without them they're plain text. */
  color?: "slate" | "emerald" | "amber" | "rose" | "brand" | "blue" | "navy" | "forest" | "black" | "orange" | "rust";
  className?: string;
}) {
  const colors: Record<string, string> = {
    slate: "bg-slate-500/10 text-slate-600 dark:bg-slate-400/15 dark:text-slate-300",
    emerald: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    amber: "bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    rose: "bg-rose-500/10 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    brand: "bg-brand-500/10 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
    blue: "bg-blue-500/10 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    navy: "bg-navy-500/10 text-navy-700 dark:bg-navy-500/25 dark:text-navy-300",
    forest: "bg-forest-500/10 text-forest-700 dark:bg-forest-500/20 dark:text-forest-300",
    // Filled, not tinted: black reads as black only as a solid — ringed on a dark page, so it's still seen.
    black: "bg-slate-950 text-white dark:bg-black dark:text-white dark:ring-1 dark:ring-inset dark:ring-white/25",
    // A return: light orange going back; back, a solid dark orange (as its timeline step is).
    orange: "bg-orange-400/15 text-orange-600 dark:bg-orange-400/20 dark:text-orange-300",
    rust: "bg-orange-700 text-white",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        colors[color],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function RoiBadge({ roi }: { roi: number | null | undefined }) {
  if (roi == null) return <Badge color="slate">—</Badge>;
  const color = roi >= 20 ? "emerald" : roi > 0 ? "amber" : "rose";
  return <Badge color={color}>{roi.toFixed(1)}%</Badge>;
}

// Accepts any status string (decoupled from app-specific enums so this file
// stays identical across apps). Known statuses get a color; others fall back.
export function ScanStatusBadge({ status }: { status: string }) {
  const map: Record<string, "slate" | "emerald" | "amber" | "rose" | "blue"> = {
    QUEUED: "slate",
    RUNNING: "blue",
    COMPLETED: "emerald",
    PARTIAL: "amber",
    FAILED: "rose",
    running: "blue",
    completed: "emerald",
    failed: "rose",
  };
  return <Badge color={map[status] ?? "slate"}>{status}</Badge>;
}

// ---------------------------------------------------------------------------
// Button / inputs
// ---------------------------------------------------------------------------
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
}

export function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...rest }: ButtonProps) {
  const variants: Record<string, string> = {
    primary: "bg-brand-500 text-white shadow-sm hover:bg-brand-600 active:bg-brand-700 disabled:bg-brand-300",
    secondary:
      "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
    ghost: "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
    danger: "bg-rose-600 text-white shadow-sm hover:bg-rose-700",
  };
  // A touch screen gets a little more height: a fingertip, not a pointer.
  const sizes: Record<string, string> = { sm: "px-3 py-1.5 text-xs touch:py-2 touch:text-[13px]", md: "px-4 py-2 text-sm touch:py-2.5" };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900",
        variants[variant],
        variant === "primary" && uiConfig().primaryButtonClassName,
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("input", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn("input", props.className)} />;
}

/**
 * A product thumbnail that degrades to a neutral tile.
 *
 * Never renders an <img> without a real src: `src=""` makes the browser request
 * the current page URL and then draw a broken-image icon, so a product the
 * source had no photo for looked like a rendering failure. A URL that 404s gets
 * the same treatment via onError.
 */
export function Thumb({
  src,
  alt,
  size = 40,
  className,
}: {
  /** One URL, or several tried in order (configureUi's photoCandidates can add an app's own fallbacks). */
  src?: ThumbSrc;
  alt?: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState<string[]>([]);
  const show = uiConfig().photoCandidates(src).find((u) => !failed.includes(u));
  const Fallback = uiConfig().thumbFallback ?? ImageOff;
  return (
    <div
      className={cn(
        "flex-none overflow-hidden rounded-xl bg-slate-100 ring-1 ring-black/[0.04] dark:bg-slate-800 dark:ring-white/[0.06]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {show ? (
        <img
          key={show}
          src={show}
          alt={alt ?? ""}
          loading="lazy"
          onError={() => setFailed((f) => [...f, show])}
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-slate-300 dark:text-slate-600">
          <Fallback style={{ width: size * 0.4, height: size * 0.4 }} />
        </div>
      )}
    </div>
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn("input min-h-[2.5rem] resize-y leading-relaxed", props.className)} />;
}

/**
 * Segmented control. "native" (design.md 8.4) is the iOS one: a grey track, and the chosen segment
 * on a raised thumb that slides to it, a thin divider between two segments that aren't chosen.
 * "accent" fills the chosen segment with the app's accent. Which one a page gets when it doesn't
 * say is the app's (configureUi's `tabs`).
 */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
  size = "md",
  fill,
  variant,
}: {
  /** `activeClassName` colours the thumb under that tab when it's chosen (a status's colour), with white text on it. Native only. */
  tabs: { id: T; label: ReactNode; activeClassName?: string }[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
  size?: "sm" | "md";
  fill?: boolean;
  variant?: "accent" | "native";
}) {
  if ((variant ?? uiConfig().tabs) === "native") {
    return <NativeTabs tabs={tabs} value={value} onChange={onChange} className={className} size={size} fill={fill} />;
  }
  const pad = size === "sm" ? "px-3 py-1 text-xs" : "px-3.5 py-1.5 text-sm";
  return (
    <div
      className={cn(
        "gap-0.5 rounded-xl border border-black/[0.08] p-0.5 dark:border-white/[0.08]",
        fill ? "flex w-full" : "inline-flex",
        className,
      )}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          aria-pressed={value === t.id}
          className={cn(
            "rounded-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50",
            pad,
            fill && "flex-1",
            value === t.id
              ? "bg-brand-500 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-500/10 dark:text-slate-300",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function NativeTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
  size,
  fill,
}: {
  tabs: { id: T; label: ReactNode; activeClassName?: string }[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
  size: "sm" | "md";
  fill?: boolean;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ x: number; width: number } | null>(null);
  const chosen = tabs.findIndex((t) => t.id === value);

  // The thumb is placed under the chosen segment once it's measured, and again whenever the
  // track changes size (a count arriving, the window narrowing a filled control).
  useLayoutEffect(() => {
    const el = track.current;
    if (!el) return;
    const place = () => {
      const active = el.querySelector<HTMLElement>('[aria-pressed="true"]');
      setThumb(active ? { x: active.offsetLeft, width: active.offsetWidth } : null);
    };
    place();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(place);
    ro.observe(el);
    return () => ro.disconnect();
  }, [chosen, tabs.length]);

  return (
    <div ref={track} className={cn("segmented", fill && "flex w-full", className)}>
      {thumb && (
        <span
          aria-hidden
          data-fill={tabs[chosen]?.activeClassName ? "" : undefined}
          className={cn("segment-thumb transition-[transform,width,background-color] duration-200 ease-out motion-reduce:transition-none", tabs[chosen]?.activeClassName)}
          style={{ width: thumb.width, transform: `translateX(${thumb.x}px)` }}
        />
      )}
      {tabs.map((t, i) => {
        const active = i === chosen;
        const divider = i > 0 && !active && i - 1 !== chosen;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            aria-pressed={active}
            className={cn(
              "segment",
              size === "sm" && "px-2.5 py-0.5 text-xs",
              fill && "flex-1",
              active && "segment-active",
              active && !thumb && (t.activeClassName ?? "bg-white shadow-sm dark:bg-slate-600"),
              active && t.activeClassName && "text-white hover:text-white dark:text-white",
            )}
          >
            <span
              aria-hidden
              className={cn("absolute -left-px top-1/2 h-3.5 w-px -translate-y-1/2 bg-slate-500/25 transition-opacity", divider ? "opacity-100" : "opacity-0")}
            />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The search field (design.md 8.9): a filled, borderless field — 36px, radius md, a 16px
 * magnifier in the tertiary grey, an accent ring while focused — with a clear button once there's
 * a query. The one search box for every page.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
  autoFocus,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  /** The box itself, for a page that sends typing to it. */
  inputRef?: Ref<HTMLInputElement>;
}) {
  return (
    <div
      className={cn(
        "flex h-9 items-center gap-2 rounded-[10px] bg-slate-500/[0.1] px-3 transition",
        "focus-within:ring-2 focus-within:ring-brand-500 dark:bg-white/[0.08]",
        className,
      )}
    >
      <Search className="pointer-events-none h-4 w-4 flex-none text-slate-400" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="-mr-1 grid h-5 w-5 flex-none place-items-center rounded-full text-slate-400 transition hover:bg-slate-500/15 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 touch:h-8 touch:w-8 dark:hover:text-slate-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-brand-500", className)} />;
}

export function CenterSpinner() {
  return (
    <div className="grid place-items-center py-16">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export function EmptyState({ title, hint, icon }: { title: string; hint?: string; icon?: ReactNode }) {
  return (
    <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-slate-300 py-12 text-center dark:border-slate-700">
      {icon && <div className="text-slate-400">{icon}</div>}
      <div className="font-medium text-slate-600 dark:text-slate-300">{title}</div>
      {hint && <div className="max-w-sm text-sm text-slate-400">{hint}</div>}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  onChange,
  sticky,
  summary,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
  /** A frosted bar held at the bottom of the screen while the page scrolls, for a long grid. */
  sticky?: boolean;
  /** Said at the bar's start: "1–60 of 1,352". */
  summary?: ReactNode;
}) {
  if (totalPages <= 1) return null;
  if (sticky) {
    return (
      // Bleeds to the main area's edges (its p-4 / sm:p-6), so the bar spans it.
      <div className="glass sticky bottom-0 z-10 -mx-4 mt-4 flex items-center justify-between gap-3 border-t px-4 py-2.5 text-sm sm:-mx-6 sm:px-6">
        <span className="truncate text-slate-500 dark:text-slate-400">{summary}</span>
        <div className="flex flex-none items-center gap-2">
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
            Prev
          </Button>
          <span className="tabular-nums text-slate-500 dark:text-slate-400">
            {page} / {totalPages}
          </span>
          <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
            Next
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-end gap-2 pt-3 text-sm">
      <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Prev
      </Button>
      <span className="text-slate-500">
        Page {page} of {totalPages}
      </span>
      <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Next
      </Button>
    </div>
  );
}

// Table primitives
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}
export function Th({
  children,
  className,
  colSpan,
}: {
  children?: ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <th
      colSpan={colSpan}
      className={cn(
        "border-b border-black/[0.06] px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-white/[0.08]",
        className,
      )}
    >
      {children}
    </th>
  );
}
export function Tr({ children, className, onClick }: { children?: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "transition hover:bg-slate-500/[0.04] dark:hover:bg-white/[0.03]",
        onClick && "cursor-pointer",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function Td({
  children,
  className,
  colSpan,
}: {
  children?: ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn("border-b border-black/[0.04] px-3 py-2.5 align-middle dark:border-white/[0.05]", className)}
    >
      {children}
    </td>
  );
}
