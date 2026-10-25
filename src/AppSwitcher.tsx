import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LayoutGrid, LogOut, type LucideIcon } from "lucide-react";
import { cn } from "./cn";
import {
  useServices,
  useIdentity,
  SERVICE_ICON,
  SERVICE_ICON_URL,
  SERVICE_ACCENT,
  LOGOUT_URL,
} from "./services";

/** How many apps a row of the drawer holds. */
const ROW = 4;

// One app tile's icon: a hosted image (filling the rounded tile) when the service has
// one, else the lucide glyph on the accent gradient. The gradient stays as the image's
// fallback background, so a hosted image that fails to load degrades to the glyph.
function ServiceTile({
  iconUrl,
  Icon,
  accent,
}: {
  iconUrl?: string;
  Icon: LucideIcon;
  accent: string;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <span
      className="relative grid h-14 w-14 place-items-center overflow-hidden rounded-[18px] text-white shadow-[0_6px_16px_-6px_rgba(0,0,0,0.45)] ring-1 ring-black/[0.06] transition group-hover:scale-105"
      style={{ backgroundImage: `linear-gradient(160deg, ${accent} 0%, ${shade(accent, -0.18)} 100%)` }}
    >
      {iconUrl && !broken ? (
        <img
          src={iconUrl}
          alt=""
          onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <Icon className="h-7 w-7" strokeWidth={2.1} />
      )}
    </span>
  );
}

// ===========================================================================
// AppSwitcher — a top-bar "waffle" launcher.
//
// Opens a centered, macOS-Launchpad-style POPUP (the same overlay language used
// everywhere else) listing every service as an app icon, a row per section
// (source of truth: auth.aaarian.me/services.json) — four across, the room left
// a grey placeholder, no titles. Every app — including the current one — renders
// as a plain, navigable tile; the signed-in identity + sign-out live in the footer.
//
//   <AppSwitcher current="proxies" />
// ===========================================================================
export function AppSwitcher({ current }: { current: string }) {
  const [open, setOpen] = useState(false);
  const groups = useServices();
  const { email } = useIdentity();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Switch app"
        title="Switch app"
        className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-slate-500/10 active:scale-95"
      >
        <img src="/aaarian-logo.png" alt="" className="h-[22px] w-[22px] rounded-[5px]" />
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[55] flex items-end justify-center sm:items-center"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-xl animate-[fade_0.15s_ease] dark:bg-black/55"
              onClick={() => setOpen(false)}
            />
            <div
              className={cn(
                "relative z-10 flex max-h-[88vh] w-full max-w-[24rem] flex-col overflow-hidden",
                "rounded-t-3xl border border-white/40 bg-white/70 shadow-2xl backdrop-blur-2xl",
                "dark:border-white/[0.08] dark:bg-slate-900/70 sm:rounded-3xl",
                "animate-[sheet_0.22s_cubic-bezier(0.32,0.72,0,1)] sm:animate-[pop_0.18s_cubic-bezier(0.32,0.72,0,1)]",
              )}
            >
              {/* The apps: a row per group, four across, the room left grey. */}
              <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3 pt-4">
                {groups.map((g) => (
                  <div key={g.group} className="grid grid-cols-4">
                    {g.items.map((s) => {
                      const Icon = SERVICE_ICON[s.key] ?? LayoutGrid;
                      const accent = SERVICE_ACCENT[s.key] ?? "#8E8E93";
                      const active = s.key === current;
                      return (
                        <a
                          key={s.key}
                          href={s.url}
                          aria-current={active ? "page" : undefined}
                          title={s.host}
                          className="group flex select-none flex-col items-center gap-1.5 rounded-2xl p-1.5 outline-none transition active:scale-95"
                        >
                          <ServiceTile iconUrl={SERVICE_ICON_URL[s.key]} Icon={Icon} accent={accent} />
                          <span className="line-clamp-2 max-w-[5.5rem] text-center text-[11.5px] font-medium leading-tight text-slate-700 dark:text-slate-200">
                            {s.label}
                          </span>
                        </a>
                      );
                    })}
                    {Array.from({ length: (ROW - (g.items.length % ROW)) % ROW }, (_, i) => (
                      <span key={`spare-${i}`} aria-hidden className="flex justify-center p-1.5">
                        <span className="h-14 w-14 rounded-[18px] bg-slate-500/[0.12] dark:bg-white/[0.08]" />
                      </span>
                    ))}
                  </div>
                ))}
              </div>

              {/* Identity + sign out */}
              <div className="flex items-center justify-between gap-3 border-t border-black/[0.06] px-4 py-3 dark:border-white/[0.08]">
                <div className="min-w-0">
                  <div className="text-[11px] text-slate-400">Signed in as</div>
                  <div className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                    {email ?? "authenticated"}
                  </div>
                </div>
                <a
                  href={LOGOUT_URL}
                  className="flex flex-none items-center gap-2 rounded-xl bg-slate-500/[0.08] px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-rose-500/10 hover:text-rose-600 dark:bg-white/[0.06] dark:text-slate-200"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </a>
              </div>

              <style>{`
                @keyframes fade { from { opacity: 0 } to { opacity: 1 } }
                @keyframes pop { from { opacity: 0; transform: scale(0.96) } to { opacity: 1; transform: scale(1) } }
                @keyframes sheet { from { transform: translateY(100%) } to { transform: translateY(0) } }
              `}</style>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

/** Darkens (amount<0) / lightens a hex color by a fraction — for the icon gradient. */
function shade(hex: string, amount: number): string {
  const n = hex.replace("#", "");
  const num = parseInt(n.length === 3 ? n.replace(/./g, "$&$&") : n, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  const f = (c: number) =>
    Math.max(0, Math.min(255, Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount)));
  r = f(r);
  g = f(g);
  b = f(b);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
