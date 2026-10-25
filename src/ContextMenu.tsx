import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, MoreHorizontal, MoreVertical, type LucideIcon } from "lucide-react";
import { cn } from "./cn";
import { uiConfig } from "./config";

// ===========================================================================
// ContextMenu — a right-click menu. macOS-style: small frosted rounded panel,
// positioned at the cursor and clamped to the viewport. Closes on outside
// click, Escape, scroll, resize or blur. Part of the shared UI kit (@aaarianme/ui).
//
// A touch screen has no right-click (iOS never sends one), so a card that has
// a menu also carries a <MenuButton> — a "…" shown only where nothing can
// hover, which opens the same menu under it.
//
//   const menu = useContextMenu();
//   <div onContextMenu={menu.show}>… <MenuButton show={menu.show} /></div>
//   <ContextMenu {...menu} items={[{ label: "New Folder", icon: FolderPlus, onClick }]} />
//
// The same menu opens from a button (a "⋮" menu) with menu.showUnder(button): just under it,
// its right edge on the button's. An item with `checked` is a toggle: a check shows while it's on;
// one with `separator` has a line above it, setting it and what follows apart.
// <MoreMenu items> is that ⋮ button and its menu in one, opening on hover too.
// ===========================================================================
export interface ContextMenuItem {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** A toggle: a check shows beside it while it's on. Every toggle in a menu sets it, on or off. */
  checked?: boolean;
  /** A line above it: it and what follows are a group of their own. */
  separator?: boolean;
}

export function useContextMenu() {
  const [state, setState] = useState<{ open: boolean; x: number; y: number; alignEnd: boolean }>({ open: false, x: 0, y: 0, alignEnd: false });
  const show = (e: { preventDefault: () => void; clientX: number; clientY: number }) => {
    e.preventDefault();
    setState({ open: true, x: e.clientX, y: e.clientY, alignEnd: false });
  };
  /** Open just under a button, the menu's right edge on the button's. */
  const showUnder = (button: HTMLElement, gap = 6) => {
    const r = button.getBoundingClientRect();
    setState({ open: true, x: r.right, y: r.bottom + gap, alignEnd: true });
  };
  const close = () => setState((s) => ({ ...s, open: false }));
  return { open: state.open, x: state.x, y: state.y, alignEnd: state.alignEnd, show, showUnder, close };
}

/**
 * The menu's "…" button, for touch screens only (hidden where a mouse can hover and right-click).
 * Opens the menu just under it. Stops the tap there, so a card it sits on doesn't also open.
 */
export function MenuButton({
  show,
  label = "More actions",
  className,
}: {
  show: ReturnType<typeof useContextMenu>["show"];
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-haspopup="menu"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const r = e.currentTarget.getBoundingClientRect();
        show({ preventDefault: () => undefined, clientX: r.left, clientY: r.bottom + 6 });
      }}
      className={cn(
        "hidden h-9 w-9 place-items-center rounded-full bg-white/90 text-slate-600 shadow-sm ring-1 ring-black/[0.06] backdrop-blur transition active:scale-95 touch:grid",
        "dark:bg-slate-900/80 dark:text-slate-200 dark:ring-white/10",
        className,
      )}
    >
      {uiConfig().menuIcon === "vertical" ? <MoreVertical className="h-[18px] w-[18px]" /> : <MoreHorizontal className="h-[18px] w-[18px]" />}
    </button>
  );
}

export function ContextMenu({
  open,
  x,
  y,
  items,
  close,
  alignEnd = false,
  onMouseEnter,
  onMouseLeave,
}: {
  open: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
  close: () => void;
  /** x is where the menu's right edge goes (showUnder), not its left. */
  alignEnd?: boolean;
  /** For a menu opened by hovering: kept open while the pointer's over it. */
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });

  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const { width, height } = ref.current.getBoundingClientRect();
    const pad = 8;
    const left = alignEnd ? x - width : x;
    setPos({
      x: Math.max(pad, Math.min(left, window.innerWidth - width - pad)),
      y: Math.max(pad, Math.min(y, window.innerHeight - height - pad)),
    });
  }, [open, x, y, alignEnd, items.length]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("blur", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("blur", close);
    };
  }, [open, close]);

  if (!open) return null;

  const toggles = items.some((it) => it.checked !== undefined);
  return createPortal(
    <div
      ref={ref}
      role="menu"
      // Portaled, but React still bubbles its events up the tree it was rendered in: a click on an
      // item would also reach the row or card around it, and a right-click would reopen it.
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ left: pos.x, top: pos.y }}
      className="fixed z-[70] min-w-[11rem] overflow-hidden touch:min-w-[13rem] rounded-xl border border-black/10 bg-white/90 p-1 shadow-xl backdrop-blur-xl animate-[fade_0.1s_ease] dark:border-white/10 dark:bg-slate-900/90"
    >
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <Fragment key={i}>
            {item.separator && i > 0 && <div role="separator" className="mx-2 my-1 h-px bg-black/[0.08] dark:bg-white/10" />}
            <button
              type="button"
              role={item.checked !== undefined ? "menuitemcheckbox" : "menuitem"}
              aria-checked={item.checked}
              disabled={item.disabled}
              onClick={() => {
                close();
                item.onClick();
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/50 disabled:pointer-events-none disabled:opacity-40",
                // A fingertip needs a taller row than a pointer.
                "touch:py-2.5 touch:text-[15px]",
                item.danger
                  ? "text-rose-600 hover:bg-rose-500/10 active:bg-rose-500/10 dark:text-rose-400"
                  : "text-slate-700 hover:bg-brand-500/10 hover:text-brand-700 active:bg-brand-500/10 dark:text-slate-200 dark:hover:text-brand-300",
              )}
            >
              {Icon && <Icon className="h-4 w-4 flex-none" />}
              {item.label}
              {toggles && <Check className={cn("h-4 w-4 flex-none", !item.checked && "invisible")} />}
            </button>
          </Fragment>
        );
      })}
    </div>,
    document.body,
  );
}

/** Long enough to move from the button into its menu without it closing. */
const HOVER_CLOSE_MS = 160;

/**
 * A ⋮ button with its menu: open while it or the menu is hovered — or on a click, for a touch
 * screen or the keyboard — hanging under the button, right-aligned.
 */
export function MoreMenu({ items, label = "More", size = "md" }: { items: ContextMenuItem[]; label?: string; /** lg: beside a page's title. */ size?: "md" | "lg" }) {
  const menu = useContextMenu();
  const button = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stay = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const open = () => {
    stay();
    if (button.current) menu.showUnder(button.current, 4);
  };
  const leave = () => {
    stay();
    timer.current = setTimeout(menu.close, HOVER_CLOSE_MS);
  };
  useEffect(() => stay, []);
  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={menu.open}
        onMouseEnter={open}
        onMouseLeave={leave}
        onClick={open}
        className={cn(
          "grid place-items-center rounded-full text-slate-500 transition hover:bg-slate-500/10 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 dark:text-slate-400 dark:hover:text-white",
          size === "lg" ? "h-10 w-10" : "h-9 w-9",
          menu.open && "bg-slate-500/10 text-slate-900 dark:text-white",
        )}
      >
        <MoreVertical className={size === "lg" ? "h-6 w-6" : "h-[18px] w-[18px]"} />
      </button>
      <ContextMenu {...menu} items={items} onMouseEnter={stay} onMouseLeave={leave} />
    </>
  );
}
