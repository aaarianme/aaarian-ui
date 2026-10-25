import { createContext, Fragment, useContext, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { Bot, ChevronLeft, Settings as SettingsIcon, type LucideIcon } from "lucide-react";
import { cn } from "./cn";

// ===========================================================================
// Settings — part of the shared kit (@aaarianme/ui/router: it needs react-router). See
// aaarian-infra's DESIGN.md, "Settings".
//
// Settings takes over the app's window, the way macOS System Settings does:
//   - the sidebar's top left says "Settings" where the app's name and mark were, and its page
//     links give way to a Back row and the settings' own tabs. The sidebar is never the icon rail
//     here, and its footer (the gear, the rail toggle) is gone;
//   - Back returns to the app, on the page it was on when Settings opened — not a step back
//     through the tabs looked at;
//   - the page has no title of its own, and opens on Overview: the app's mark, name and version,
//     left-aligned, and the agents.aaarian.me agents it runs on, each "Powered by" one.
//
// Layout provides the shell (ShellContext, SettingsSidebarTitle, SettingsSidebarNav); a Settings
// page lays itself out with SettingsTabs and SettingsOverview.
// ===========================================================================

/** The app's name and mark, as its sidebar shows them. */
export interface AppBrand {
  /** The wordmark — "Inventory", "Scouter", "ACO" — with its accent span. */
  name: ReactNode;
  /** A hosted logo. Falls back to `icon` on the brand gradient when it's missing or won't load. */
  iconUrl?: string;
  icon: LucideIcon;
}

/** What the shell lends the page inside it. */
export interface Shell {
  /** On /settings, where SettingsTabs puts the tabs: the sidebar, in place of the page links. */
  settingsSlot: HTMLElement | null;
  /** Close the drawer (below lg) — after a tab is picked in it. */
  closeMenu: () => void;
  brand: AppBrand;
}

export const ShellContext = createContext<Shell | null>(null);

/** The shell around this page, or null outside one. */
export function useShell(): Shell | null {
  return useContext(ShellContext);
}

/** Is this Settings, where the shell gives itself over to the settings? */
export function isSettingsPath(pathname: string): boolean {
  return pathname === "/settings" || pathname.startsWith("/settings/");
}

/** The app page Settings was opened from, kept for this tab so a reload in Settings keeps it. */
const APP_PATH_KEY = "settings:return-to";

/** Called by Layout on every page: remembers the last page outside Settings, where Back returns. */
export function useRememberAppPath() {
  const { pathname, search, hash } = useLocation();
  useEffect(() => {
    if (isSettingsPath(pathname)) return;
    try {
      sessionStorage.setItem(APP_PATH_KEY, pathname + search + hash);
    } catch {
      // Storage blocked: Back goes to the start page.
    }
  }, [pathname, search, hash]);
}

function appPath(): string {
  try {
    const at = sessionStorage.getItem(APP_PATH_KEY);
    if (at && at.startsWith("/") && !isSettingsPath(at.split(/[?#]/)[0]!)) return at;
  } catch {
    // Storage blocked.
  }
  return "/";
}

// ---------------------------------------------------------------------------
// The sidebar, in Settings
// ---------------------------------------------------------------------------

/** The sidebar's top left in Settings: the word "Settings" where the app's name and mark were. */
export function SettingsSidebarTitle() {
  return <div className="truncate text-[20px] font-semibold tracking-tight">Settings</div>;
}

/**
 * The sidebar's links in Settings: Back, then the settings' own tabs, which SettingsTabs renders
 * into `slotRef`. Back returns to the app on the page Settings was opened from (useRememberAppPath)
 * — the start page when Settings was opened directly.
 */
export function SettingsSidebarNav({ slotRef }: { slotRef: (el: HTMLElement | null) => void }) {
  const navigate = useNavigate();
  return (
    <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-3" aria-label="Settings">
      <button
        type="button"
        onClick={() => navigate(appPath())}
        className="mb-2 flex w-full items-center gap-1.5 rounded-xl px-2 py-2 text-[15px] font-medium text-brand-500 transition hover:bg-slate-500/10"
      >
        <ChevronLeft className="h-5 w-5 flex-none" />
        <span>Back</span>
      </button>
      <div ref={slotRef} />
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Tabs (design.md 8.2)
// ---------------------------------------------------------------------------

const TONES = {
  brand: "bg-brand-500 text-white",
  emerald: "bg-emerald-500 text-white",
  amber: "bg-amber-500 text-white",
  // Apple's system yellow — golden, so it carries a white glyph.
  gold: "bg-[#ffcc00] text-white",
  rose: "bg-rose-500 text-white",
  blue: "bg-blue-500 text-white",
  teal: "bg-teal-500 text-white",
  purple: "bg-purple-500 text-white",
  // A dark pink: the Extension tabs.
  pink: "bg-[#c2185b] text-white",
  // White with a dark glyph: Appearance.
  white: "bg-white text-slate-800 ring-1 ring-black/[0.08]",
  // Cream with a dark brown glyph: Inventory's Integrations.
  cream: "bg-[#f6efdf] text-[#4a2c17] ring-1 ring-black/[0.06]",
  slate: "bg-slate-500 text-white",
} as const;
export type SettingsTone = keyof typeof TONES;

export interface SettingsTab<T extends string = string> {
  id: T;
  label: string;
  icon: LucideIcon;
  tone: SettingsTone;
  /** An app's own mark in place of the glyph, which stays as its fallback. */
  imageUrl?: string;
  /** A subtle line before this tab: what follows is set apart (Scouter's other apps, after its own tabs). */
  divider?: boolean;
}

/** A tab's filled, rounded tile — the iOS Settings row glyph, or an app's mark. */
function TabTile({ icon: Icon, tone, imageUrl, size = 28 }: { icon: LucideIcon; tone: SettingsTone; imageUrl?: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size, borderRadius: Math.round(size * 0.3) };
  if (imageUrl && !broken) {
    return (
      <img
        src={imageUrl}
        alt=""
        onError={() => setBroken(true)}
        className="flex-none bg-white object-cover shadow-sm ring-1 ring-black/[0.06]"
        style={style}
      />
    );
  }
  return (
    <span className={cn("grid flex-none place-items-center shadow-sm", TONES[tone])} style={style}>
      <Icon style={{ width: size * 0.55, height: size * 0.55 }} strokeWidth={2.2} />
    </span>
  );
}

/**
 * Settings in tabs. Inside the shell they take over its sidebar (SettingsSidebarNav's slot) and
 * the page keeps the whole width; below lg, where the sidebar is a drawer, the same tabs also run
 * in a scrolling line atop the page. The selected tab is filled, not only coloured, and arrow keys
 * move between tabs.
 */
export function SettingsTabs<T extends string>({
  tabs,
  value,
  onChange,
  children,
}: {
  tabs: SettingsTab<T>[];
  value: T;
  onChange: (id: T) => void;
  children: ReactNode;
}) {
  const shell = useShell();
  const slot = shell?.settingsSlot ?? null;
  return (
    <div>
      <TabList tabs={tabs} value={value} onChange={onChange} layout={slot ? "line" : "line-always"} />
      {slot &&
        createPortal(
          <TabList
            tabs={tabs}
            value={value}
            onChange={(id) => {
              onChange(id);
              shell?.closeMenu();
            }}
            layout="sidebar"
          />,
          slot,
        )}
      <div
        role="tabpanel"
        id={`settings-panel-${value}`}
        aria-labelledby={`settings-tab-${value}`}
        className={cn("min-w-0", slot ? "mt-6 lg:mt-0" : "mt-6")}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * The tabs as one list: "sidebar" a column in the shell's sidebar; "line" a scrolling row atop the
 * page below lg (the sidebar has them from lg); "line-always" that row at every width (no shell).
 */
function TabList<T extends string>({
  tabs,
  value,
  onChange,
  layout,
}: {
  tabs: SettingsTab<T>[];
  value: T;
  onChange: (id: T) => void;
  layout: "sidebar" | "line" | "line-always";
}) {
  const buttons = useRef(new Map<T, HTMLButtonElement>());
  const list = useRef<HTMLDivElement>(null);
  // In the scrolling line, the selected tab is scrolled into it — opened from a link, it can sit
  // past the edge. The list scrolls, never the page.
  useEffect(() => {
    const row = list.current;
    const tab = buttons.current.get(value);
    if (!row || !tab || row.scrollWidth <= row.clientWidth) return;
    const edge = row.getBoundingClientRect();
    const at = tab.getBoundingClientRect();
    if (at.left < edge.left) row.scrollLeft -= edge.left - at.left + 16;
    else if (at.right > edge.right) row.scrollLeft += at.right - edge.right + 16;
  }, [value]);
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const at = tabs.findIndex((t) => t.id === value);
    const next = tabs[(at + step + tabs.length) % tabs.length]!;
    onChange(next.id);
    buttons.current.get(next.id)?.focus();
  }
  const sidebar = layout === "sidebar";
  return (
    <div
      ref={list}
      role="tablist"
      aria-label="Settings"
      aria-orientation={sidebar ? "vertical" : undefined}
      onKeyDown={onKeyDown}
      className={cn(
        // The line runs to the page's edges: -mx-3 fits every app's padding (ACO's is the tightest).
        sidebar ? "flex flex-col gap-0.5" : "-mx-3 flex gap-1 overflow-x-auto px-3 pb-1 [scrollbar-width:none]",
        layout === "line" && "lg:hidden",
      )}
    >
      {tabs.map((t) => {
        const selected = t.id === value;
        return (
          <Fragment key={t.id}>
            {t.divider && (
              <span
                aria-hidden
                className={cn("flex-none bg-black/[0.07] dark:bg-white/[0.08]", sidebar ? "mx-2 my-1.5 h-px" : "mx-1 my-2.5 w-px")}
              />
            )}
            <button
              ref={(el) => {
                if (el) buttons.current.set(t.id, el);
                else buttons.current.delete(t.id);
              }}
              type="button"
              role="tab"
              id={sidebar ? `settings-side-tab-${t.id}` : `settings-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`settings-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(t.id)}
              className={cn(
                "flex h-11 flex-none items-center gap-3 whitespace-nowrap rounded-xl pl-2 pr-3 text-[14.5px] transition",
                sidebar && "w-full lg:h-10",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50",
                selected
                  ? "bg-brand-500/[0.12] font-semibold text-slate-900 dark:bg-brand-400/[0.16] dark:text-white"
                  : "text-slate-700 hover:bg-slate-500/[0.08] dark:text-slate-200 dark:hover:bg-white/[0.06]",
              )}
            >
              <TabTile icon={t.icon} tone={t.tone} imageUrl={t.imageUrl} />
              <span>{t.label}</span>
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview (design.md 7.3)
// ---------------------------------------------------------------------------

/** An agents.aaarian.me agent the app runs on. */
export interface AgentCredit {
  /** The agent's name as it reads: "General", "Order Email". */
  name: string;
  /** What this app has it do, in a few words. */
  does: string;
}

/**
 * Settings → Overview, where Settings opens: the app's mark, name and version, left-aligned, then
 * each agents.aaarian.me agent it runs on — "Powered by", with the bot glyph. The mark and name are
 * the shell's own, so they match the sidebar. `version` is the app's package.json version, set at
 * build time (__APP_VERSION__), and goes up with every change shipped (CHANGELOG.md).
 */
export function SettingsOverview({
  version,
  agents = [],
  tileUrl,
}: {
  version: string;
  agents?: AgentCredit[];
  /** The app's icon as a whole tile, its background its own (Scouter's mark on its blue) — shown edge to edge in place of the shell's mark. */
  tileUrl?: string;
}) {
  const brand = useShell()?.brand;
  const [markBroken, setMarkBroken] = useState(false);
  const Icon = brand?.icon ?? SettingsIcon;
  const src = tileUrl ?? brand?.iconUrl;
  const logo = src && !markBroken;
  return (
    <div className="card flex items-center gap-5 p-6 sm:gap-6">
      <div
        className={cn(
          "grid h-20 w-20 flex-none place-items-center overflow-hidden rounded-[19px] text-white shadow-[0_6px_16px_-6px_rgba(0,0,0,0.35)] sm:h-24 sm:w-24 sm:rounded-[22px]",
          // bg-brand-500 under the gradient, for an app without a .brand-gradient.
          logo ? (tileUrl ? "" : "bg-white ring-1 ring-black/[0.06]") : "brand-gradient bg-brand-500",
        )}
      >
        {logo ? (
          <img src={src} alt="" onError={() => setMarkBroken(true)} className={cn("h-full w-full", tileUrl ? "object-cover" : "object-contain p-1")} />
        ) : (
          <Icon className="h-10 w-10 sm:h-12 sm:w-12" />
        )}
      </div>
      <div className="min-w-0">
        <h2 className="truncate text-[22px] font-semibold leading-7 tracking-tight">{brand?.name}</h2>
        <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">Version {version}</p>
        {agents.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {agents.map((a) => (
              <li key={a.name} className="flex items-center gap-2 text-[13px] leading-5">
                <span className="grid h-5 w-5 flex-none place-items-center rounded-md bg-slate-500/10 text-slate-600 dark:text-slate-300">
                  <Bot className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="text-slate-500 dark:text-slate-400">Powered by </span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">{a.name}</span>
                  <span className="text-slate-400"> · {a.does}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

/** Settings → Health (HeartPulse, rose — ACO's red), in every app. Not built yet in most: this holds its place. */
export function SettingsHealth() {
  return (
    <div className="card p-6">
      <h2 className="text-[17px] font-semibold tracking-tight">Health</h2>
      <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">Health checks for this app are coming soon.</p>
    </div>
  );
}
