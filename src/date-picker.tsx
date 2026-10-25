import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { DayPicker, type ClassNames, type Matcher } from "@daypicker/react";
import { addMonths, addYears, endOfMonth, format, isValid } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "./cn";
import { dayKey } from "./time-zone";

// ===========================================================================
// DatePicker — the shared date field, in place of the browser's own
// <input type="date"> and "datetime-local", whose calendars are the browser's.
// Its value is the one those inputs had — "2026-10-24", or with `time`
// "2026-10-24T19:30" — and "" for none, so it goes where one of them was.
//
//   <DatePicker value={day} onChange={setDay} required />
//   <DatePicker time value={at} onChange={setAt} />
//   <DatePicker value={from} onChange={setFrom} max={to} ariaLabel="From" />
//   <DatePicker variant="bare" className={BARE_FIELD} value={day} onChange={setDay} />
//
// The calendar (DayPicker, from @daypicker/react) opens in a portal, placed and
// animated as the Picker's menu is: below the field (above when there's no
// room), so a card's overflow or a modal's edge never clips it. Its header is
// iOS's: the month, which turns to the year's twelve when tapped, and arrows
// that step a month (a year, there). Arrow keys move a day, Page Up and Page
// Down a month, Enter picks, Tab goes round the calendar, and Escape closes it
// back to the field. A day is the suite's (time-zone.ts); a time is this
// browser's, as datetime-local's was.
//
// Part of the shared kit as its own entry, @aaarianme/ui/date-picker: it needs
// @daypicker/react and date-fns, which only an app with dates installs.
// ===========================================================================

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  /** A time of day too: the value is "2026-10-24T19:30". */
  time?: boolean;
  /** The first day that can be picked, "2026-10-01". */
  min?: string;
  /** The last day that can be picked. */
  max?: string;
  /** It always has a day: no Clear. */
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  /** "field" (default) a form field; "bare" no look of its own — `className` gives it one (a row's field, a word in a line). */
  variant?: "field" | "bare";
  /** What the closed field shows in place of the day: the line's own wording. */
  display?: ReactNode;
  className?: string;
  /** The field's name for screen readers, when no visible label is tied to it. */
  ariaLabel?: string;
  title?: string;
}

/** A day picked with no time yet starts at noon: it never slips a day, whatever the zone. */
const NOON = { h: 12, m: 0 };

/** Space between the field and the calendar, and between the calendar and the viewport's edge. */
const GAP = 6;
const EDGE = 8;

interface Placement {
  top: number;
  left: number;
  up: boolean;
  end: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-10-24" (or a value starting with it) as that day on this device's calendar — what DayPicker draws — or null. */
function toDay(value: string | undefined): Date | null {
  const m = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isValid(d) ? d : null;
}

const keyOf = (d: Date): string => format(d, "yyyy-MM-dd");

/** A value's time of day, or null when it has none. */
function timeOf(value: string): { h: number; m: number } | null {
  const m = /T(\d{2}):(\d{2})/.exec(value);
  return m ? { h: Number(m[1]), m: Number(m[2]) } : null;
}

/** "Oct 24, 2026" — "Oct 24, 2026, 7:30 PM" with a time. */
function describe(value: string, time: boolean): string | null {
  const day = toDay(value);
  if (!day) return null;
  const t = time ? timeOf(value) : null;
  if (!t) return format(day, "MMM d, yyyy");
  day.setHours(t.h, t.m);
  return format(day, "MMM d, yyyy, h:mm a");
}

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50";

/** The calendar's look, in the kit's: the app's colour for today and the day picked, the Picker's hover. */
const CALENDAR: Partial<ClassNames> = {
  root: "w-max",
  month_caption: "sr-only",
  month_grid: "border-collapse",
  weekday: "h-6 w-9 p-0 text-center align-top text-[10.5px] font-semibold uppercase tracking-wide text-slate-400",
  day: "h-9 w-9 p-0 text-center align-middle",
  day_button: cn(
    "mx-auto grid h-9 w-9 place-items-center rounded-full text-[14px] tabular-nums transition-colors hover:bg-slate-500/10",
    "disabled:cursor-default disabled:hover:bg-transparent",
    FOCUS_RING,
  ),
  today: "font-semibold text-brand-600 dark:text-brand-400",
  selected: "font-semibold [&>button]:bg-brand-500 [&>button]:text-white [&>button]:shadow-sm [&>button:hover]:bg-brand-600",
  outside: "text-slate-300 dark:text-slate-600",
  disabled: "text-slate-300 line-through decoration-slate-300/70 dark:text-slate-600 dark:decoration-slate-600/70",
  hidden: "invisible",
};

export function DatePicker({
  value,
  onChange,
  time = false,
  min,
  max,
  required,
  placeholder,
  disabled,
  variant = "field",
  display,
  className,
  ariaLabel,
  title,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"days" | "months">("days");
  const [month, setMonth] = useState<Date>(() => new Date());
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [shown, setShown] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // A day is the suite's; with a time, the value is read as this browser's (datetime-local's way), so its today is too.
  const todayKey = time ? keyOf(new Date()) : dayKey(new Date());
  const today = toDay(todayKey)!;
  const selected = toDay(value);
  const minDay = toDay(min);
  const maxDay = toDay(max);
  const off: Matcher[] = [];
  if (minDay) off.push({ before: minDay });
  if (maxDay) off.push({ after: maxDay });
  const outOfRange = (d: Date) => (minDay != null && d < minDay) || (maxDay != null && d > maxDay);
  const label = describe(value, time);

  function close(refocus: boolean) {
    setOpen(false);
    setPlacement(null);
    setShown(false);
    if (refocus) triggerRef.current?.focus();
  }

  function toggleOpen() {
    if (disabled) return;
    if (open) return close(false);
    setMonth(selected ?? today);
    setView("days");
    setOpen(true);
  }

  // Place the calendar before it paints: below the field unless there's more room above, and
  // left-aligned unless that would run it off the right edge.
  useLayoutEffect(() => {
    if (!open) return;
    const t = triggerRef.current?.getBoundingClientRect();
    const p = panelRef.current?.getBoundingClientRect();
    if (!t || !p) return;
    const below = window.innerHeight - t.bottom - GAP - EDGE;
    const up = p.height > below && t.top > below;
    const end = t.left + p.width > window.innerWidth - EDGE && t.right - p.width >= EDGE;
    const next: Placement = {
      top: up ? Math.max(EDGE, t.top - GAP - p.height) : t.bottom + GAP,
      left: end ? t.right - p.width : Math.max(EDGE, Math.min(t.left, window.innerWidth - p.width - EDGE)),
      up,
      end,
    };
    setPlacement((cur) => (cur && JSON.stringify(cur) === JSON.stringify(next) ? cur : next));
  }, [open, view]);

  // Once placed, it animates in. DayPicker has already put the focus on the day picked (else today).
  useEffect(() => {
    if (!placement) return;
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, [placement !== null]);

  // A click elsewhere, a scroll of the page under it, or the window changing closes it.
  useEffect(() => {
    if (!open) return;
    const inside = (n: EventTarget | null) =>
      n instanceof Node && (panelRef.current?.contains(n) || triggerRef.current?.contains(n));
    const onDown = (e: MouseEvent) => !inside(e.target) && close(false);
    const onScroll = (e: Event) => !inside(e.target) && close(false);
    const onLeave = () => close(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onLeave);
    window.addEventListener("blur", onLeave);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, [open]);

  // Changing view, the focus goes with it: to the month picked (else this one) among the months,
  // and back among the days to the one DayPicker would tab to, when the month left took it along.
  useEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;
    if (view === "months") {
      (panel.querySelector<HTMLElement>("[data-month][aria-pressed='true']") ?? panel.querySelector<HTMLElement>("[data-month][data-current]") ?? panel.querySelector<HTMLElement>("[data-month]:not([disabled])"))?.focus();
    } else if (!panel.contains(document.activeElement)) {
      panel.querySelector<HTMLElement>("td button[tabindex='0']")?.focus();
    }
  }, [view]);

  function onTriggerKey(e: KeyboardEvent) {
    if (e.key === "ArrowDown" && !open) {
      e.preventDefault();
      toggleOpen();
    } else if (e.key === "Escape" && open) {
      e.stopPropagation(); // the calendar closes, not a modal around it
      close(true);
    }
  }

  function onPanelKey(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation(); // the calendar closes, not a modal around it
      if (view === "months") setView("days");
      else close(true);
    } else if (e.key === "Tab") {
      // Round the calendar: from the last of its controls back to the first.
      const all = [...(panelRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]):not([tabindex='-1']), input:not([disabled])") ?? [])];
      const at = all.indexOf(document.activeElement as HTMLElement);
      const wrap = e.shiftKey ? at <= 0 : at === all.length - 1;
      if (wrap && all.length) {
        e.preventDefault();
        all[e.shiftKey ? all.length - 1 : 0]!.focus();
      }
    }
  }

  function pick(d: Date) {
    const key = keyOf(d);
    if (!time) {
      onChange(key);
      return close(true);
    }
    const t = timeOf(value) ?? NOON;
    onChange(`${key}T${pad(t.h)}:${pad(t.m)}`);
  }

  function setTime(h: number, m: number) {
    const day = selected ? keyOf(selected) : todayKey;
    onChange(`${day}T${pad(h)}:${pad(m)}`);
  }

  function pickToday() {
    if (time) {
      const now = new Date();
      onChange(format(now, "yyyy-MM-dd'T'HH:mm"));
    } else {
      onChange(todayKey);
    }
    close(true);
  }

  const step = (n: -1 | 1) => setMonth((m) => (view === "months" ? addYears(m, n) : addMonths(m, n)));
  const origin = `${placement?.up ? "bottom" : "top"} ${placement?.end ? "right" : "left"}`;
  const empty = placeholder ?? (time ? "Choose a date and time" : "Choose a date");

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation(); // a row it's in doesn't open too
          toggleOpen();
        }}
        onKeyDown={onTriggerKey}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        title={title}
        className={cn(
          variant === "field"
            ? "input flex h-[2.375rem] items-center justify-between gap-2 text-left aria-expanded:border-brand-500 aria-expanded:ring-4 aria-expanded:ring-brand-500/15 dark:aria-expanded:border-brand-400"
            : cn("rounded-md text-left", FOCUS_RING),
          disabled && "cursor-not-allowed opacity-60",
          className,
        )}
      >
        {variant === "field" ? (
          <>
            <span className={cn("min-w-0 flex-1 truncate", !display && !label && "text-slate-400")}>{display ?? label ?? empty}</span>
            <CalendarDays className="h-4 w-4 flex-none text-slate-400" />
          </>
        ) : (
          (display ?? label ?? <span className="opacity-50">{empty}</span>)
        )}
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={ariaLabel ?? (time ? "Choose a date and time" : "Choose a date")}
            onKeyDown={onPanelKey}
            // Nothing in it is a click on what it's over (a row that opens, a label), or a press
            // outside what it was opened from (the Filters panel closes on one).
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={placement ? { top: placement.top, left: placement.left, transformOrigin: origin } : undefined}
            className={cn(
              "fixed left-0 top-0 z-[70] w-max rounded-xl border border-black/[0.08] bg-white p-3 text-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.08)]",
              "dark:border-white/[0.1] dark:bg-slate-800 dark:text-slate-100",
              "transition-[opacity,transform] duration-[120ms] ease-out",
              shown ? "scale-100 opacity-100" : "scale-[0.97] opacity-0",
            )}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setView((v) => (v === "days" ? "months" : "days"))}
                aria-expanded={view === "months"}
                aria-label={view === "days" ? `${format(month, "MMMM yyyy")}: choose the month` : "Back to the days"}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[15px] font-semibold tracking-tight transition hover:bg-slate-500/10",
                  view === "months" ? "text-brand-600 dark:text-brand-400" : "text-slate-900 dark:text-white",
                  FOCUS_RING,
                )}
              >
                {view === "days" ? format(month, "MMMM yyyy") : format(month, "yyyy")}
                <ChevronRight className={cn("h-4 w-4 text-brand-500 transition-transform duration-150 ease-out", view === "months" && "rotate-90")} strokeWidth={2.5} />
              </button>
              <div className="flex items-center">
                <NavButton label={view === "days" ? "Previous month" : "Previous year"} onClick={() => step(-1)}>
                  <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2.25} />
                </NavButton>
                <NavButton label={view === "days" ? "Next month" : "Next year"} onClick={() => step(1)}>
                  <ChevronRight className="h-[18px] w-[18px]" strokeWidth={2.25} />
                </NavButton>
              </div>
            </div>

            {view === "days" ? (
              <DayPicker
                mode="single"
                required
                selected={selected ?? undefined}
                onSelect={pick}
                month={month}
                onMonthChange={setMonth}
                today={today}
                disabled={off}
                hideNavigation
                showOutsideDays
                fixedWeeks
                autoFocus
                formatters={{ formatWeekdayName: (d) => format(d, "EEE") }}
                classNames={CALENDAR}
              />
            ) : (
              // The year's months, a height with the days', so the calendar doesn't jump.
              <div className="grid h-[15rem] w-[15.75rem] grid-cols-3 grid-rows-4 gap-1.5 py-1">
                {Array.from({ length: 12 }, (_, i) => {
                  const first = new Date(month.getFullYear(), i, 1);
                  const picked = selected != null && selected.getFullYear() === first.getFullYear() && selected.getMonth() === i;
                  const current = today.getFullYear() === first.getFullYear() && today.getMonth() === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      data-month
                      data-current={current || undefined}
                      aria-pressed={picked}
                      disabled={(minDay != null && endOfMonth(first) < minDay) || (maxDay != null && first > maxDay)}
                      onClick={() => {
                        setMonth(first);
                        setView("days");
                      }}
                      className={cn(
                        "rounded-lg text-[14px] font-medium transition disabled:pointer-events-none disabled:opacity-30",
                        picked
                          ? "bg-brand-500 text-white shadow-sm hover:bg-brand-600"
                          : current
                            ? "text-brand-600 hover:bg-slate-500/10 dark:text-brand-400"
                            : "hover:bg-slate-500/10",
                        FOCUS_RING,
                      )}
                    >
                      {format(first, "MMM")}
                    </button>
                  );
                })}
              </div>
            )}

            {time && (
              <div className="mt-2 flex items-center justify-between gap-3 border-t border-black/[0.06] pt-2.5 dark:border-white/[0.08]">
                <span className="pl-1.5 text-[14px] font-medium">Time</span>
                <TimeField value={timeOf(value) ?? NOON} onChange={setTime} onDone={() => close(true)} />
              </div>
            )}

            <div className="mt-2 flex items-center justify-between border-t border-black/[0.06] pt-2 dark:border-white/[0.08]">
              <button
                type="button"
                onClick={pickToday}
                disabled={outOfRange(today)}
                className={cn("rounded-md px-1.5 py-1 text-[13px] font-medium text-brand-600 transition hover:bg-brand-500/10 disabled:opacity-40 dark:text-brand-400", FOCUS_RING)}
              >
                {time ? "Now" : "Today"}
              </button>
              {!required && value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    close(true);
                  }}
                  className={cn("rounded-md px-1.5 py-1 text-[13px] font-medium text-slate-500 transition hover:bg-slate-500/10 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100", FOCUS_RING)}
                >
                  Clear
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function NavButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn("grid h-8 w-8 place-items-center rounded-full text-brand-500 transition hover:bg-slate-500/10 active:scale-95", FOCUS_RING)}
    >
      {children}
    </button>
  );
}

/**
 * The time of day, iOS's way: the hour and the minute, each typed or stepped with ↑ ↓, and AM or
 * PM beside them. A typed hour moves on to the minute once it can't be more; Enter closes the calendar.
 */
function TimeField({ value, onChange, onDone }: { value: { h: number; m: number }; onChange: (h: number, m: number) => void; onDone: () => void }) {
  const { h, m } = value;
  const pm = h >= 12;
  const h12 = h % 12 || 12;
  // What's being typed, until it's left: a field holds "0" or "" on the way to a time.
  const [hourDraft, setHourDraft] = useState<string | null>(null);
  const [minuteDraft, setMinuteDraft] = useState<string | null>(null);
  const minuteRef = useRef<HTMLInputElement>(null);
  const to24 = (hour12: number, isPm: boolean) => (hour12 % 12) + (isPm ? 12 : 0);

  function typeHour(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    setHourDraft(digits);
    const n = Number(digits);
    if (digits && n >= 1 && n <= 12) onChange(to24(n, pm), m);
    if (digits.length === 2 || n > 1) minuteRef.current?.focus();
  }

  function typeMinute(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    setMinuteDraft(digits);
    const n = Number(digits);
    if (digits && n <= 59) onChange(h, n);
  }

  function keys(e: KeyboardEvent<HTMLInputElement>, which: "hour" | "minute") {
    if (e.key === "Enter") {
      e.preventDefault();
      onDone();
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const by = e.key === "ArrowUp" ? 1 : -1;
      if (which === "hour") onChange(to24(((h12 - 1 + by + 12) % 12) + 1, pm), m);
      else onChange(h, (m + by + 60) % 60);
      setHourDraft(null);
      setMinuteDraft(null);
    }
  }

  const field = "w-[1.625rem] rounded-md bg-transparent py-1 text-center text-[15px] tabular-nums outline-none transition focus:bg-brand-500/15 focus:text-brand-700 dark:focus:text-brand-200";

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center rounded-lg bg-slate-500/[0.1] px-1 dark:bg-white/[0.08]">
        <input
          value={hourDraft ?? String(h12)}
          onChange={(e) => typeHour(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={() => setHourDraft(null)}
          onKeyDown={(e) => keys(e, "hour")}
          inputMode="numeric"
          maxLength={2}
          aria-label="Hour"
          className={field}
        />
        <span className="text-[15px] text-slate-400">:</span>
        <input
          ref={minuteRef}
          value={minuteDraft ?? pad(m)}
          onChange={(e) => typeMinute(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={() => setMinuteDraft(null)}
          onKeyDown={(e) => keys(e, "minute")}
          inputMode="numeric"
          maxLength={2}
          aria-label="Minute"
          className={field}
        />
      </div>
      <div className="inline-flex rounded-lg bg-slate-500/[0.12] p-0.5 dark:bg-white/[0.08]" role="group" aria-label="AM or PM">
        {(["AM", "PM"] as const).map((half) => {
          const on = (half === "PM") === pm;
          return (
            <button
              key={half}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(to24(h12, half === "PM"), m)}
              className={cn(
                "rounded-md px-2 py-1 text-[12.5px] font-semibold transition",
                on
                  ? "bg-white text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.04)] dark:bg-slate-600 dark:text-white"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100",
                FOCUS_RING,
              )}
            >
              {half}
            </button>
          );
        })}
      </div>
    </div>
  );
}
