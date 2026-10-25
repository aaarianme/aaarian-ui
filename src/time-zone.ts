// ===========================================================================
// The suite's time zone (@aaarianme/ui/time-zone). Imported first, before anything else on the page:
// `import "@aaarianme/ui/time-zone";` at the top of main.tsx.
//
// Every date and time these pages show is in one time zone, whatever zone the device is in: the one
// set in Accounts (auth.aaarian.me → Account → Time zone), for every app at once. What's stored stays
// UTC; only how it's shown changes. This app's nginx hands the zone out at /suite.json (asked of
// Accounts' API over aaarian-net), and the last one read is kept in this browser, so a page starts
// in it at once; one that's changed since reloads the page once, so nothing is left in the old zone.
//
// Importing this points the browser's own date formatting at that zone — Intl.DateTimeFormat and a
// Date's toLocaleString / toLocaleDateString / toLocaleTimeString — wherever a call doesn't name a
// zone itself. What reads a Date's own fields (getHours, getDate, date-fns' format) is still the
// device's: calendar math goes through the helpers below instead.
// ===========================================================================

/** Until Accounts says otherwise (or can't be asked). */
export const DEFAULT_TIME_ZONE = "America/Edmonton";

const KEPT = "aaarian.timeZone";
const RELOADED = "aaarian.timeZoneReloaded";
const INSTALLED = Symbol.for("aaarian.suiteTimeZone");

const NativeDateTimeFormat: typeof Intl.DateTimeFormat = (globalThis as Record<symbol, typeof Intl.DateTimeFormat | undefined>)[INSTALLED] ?? Intl.DateTimeFormat;

/** Whether the browser knows `z` as a time zone ("America/Edmonton"). */
export function isTimeZone(z: unknown): z is string {
  if (typeof z !== "string" || !z.trim()) return false;
  try {
    new NativeDateTimeFormat("en-US", { timeZone: z });
    return true;
  } catch {
    return false;
  }
}

let zone: string = (() => {
  try {
    const kept = localStorage.getItem(KEPT);
    return isTimeZone(kept) ? kept : DEFAULT_TIME_ZONE;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
})();

/** The zone every date and time on the page is shown in. */
export const suiteTimeZone = (): string => zone;

const zoned = (options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormatOptions => ({ ...options, timeZone: options?.timeZone ?? zone });

// Once per page, however many times this is imported (a dev reload evaluates it again): each patch
// wraps the browser's own, never a wrapper.
if (!(globalThis as Record<symbol, unknown>)[INSTALLED]) {
  (globalThis as Record<symbol, unknown>)[INSTALLED] = NativeDateTimeFormat;
  const SuiteDateTimeFormat = function (locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
    return new NativeDateTimeFormat(locales, zoned(options));
  } as unknown as typeof Intl.DateTimeFormat;
  Object.defineProperties(SuiteDateTimeFormat, {
    prototype: { value: NativeDateTimeFormat.prototype },
    supportedLocalesOf: { value: NativeDateTimeFormat.supportedLocalesOf.bind(NativeDateTimeFormat) },
  });
  Object.defineProperty(Intl, "DateTimeFormat", { value: SuiteDateTimeFormat, writable: true, configurable: true });
  for (const name of ["toLocaleString", "toLocaleDateString", "toLocaleTimeString"] as const) {
    const own = Date.prototype[name] as (this: Date, locales?: string | string[], options?: Intl.DateTimeFormatOptions) => string;
    Object.defineProperty(Date.prototype, name, {
      value: function (this: Date, locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
        return own.call(this, locales, zoned(options));
      },
      writable: true,
      configurable: true,
    });
  }
  void refresh();
}

/** Starts showing times in `next` now (Accounts, having just set it): kept, and the page reloaded in it. */
export function adoptTimeZone(next: string): void {
  if (!isTimeZone(next)) return;
  try {
    localStorage.setItem(KEPT, next);
  } catch {
    // Not kept: the page asks Accounts again as it loads.
  }
  zone = next;
  window.location.reload();
}

/** Asks for the zone set in Accounts; a different one is kept, and the page starts over in it once. */
async function refresh(): Promise<void> {
  try {
    const res = await fetch("/suite.json", { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) return;
    const next: unknown = (await res.json())?.timeZone;
    if (!isTimeZone(next) || next === zone) return;
    try {
      localStorage.setItem(KEPT, next);
    } catch {
      // Not kept (a private window): the page asks again next time.
    }
    // Once per zone, never a loop: a browser that can't keep it (or say it reloaded) just switches.
    let again = false;
    try {
      again = sessionStorage.getItem(RELOADED) !== next;
      sessionStorage.setItem(RELOADED, next);
    } catch {
      again = false;
    }
    zone = next;
    if (again) window.location.reload();
  } catch {
    // Offline, or no /suite.json (the dev server): the kept zone stays.
  }
}

// ---------------------------------------------------------------------------
// Calendar math in the suite's zone
// ---------------------------------------------------------------------------

export interface ZonedParts {
  year: number;
  /** 1–12. */
  month: number;
  day: number;
  /** 0–23. */
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sunday. */
  weekday: number;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const partsFormats = new Map<string, Intl.DateTimeFormat>();

/** A moment's calendar fields in the suite's zone (or `in`): what getFullYear, getHours… give in that zone. */
export function zonedParts(at: Date | string | number, inZone: string = zone): ZonedParts {
  let format = partsFormats.get(inZone);
  if (!format) {
    format = new NativeDateTimeFormat("en-US", {
      timeZone: inZone,
      hourCycle: "h23",
      weekday: "short",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    partsFormats.set(inZone, format);
  }
  const fields: Record<string, string> = {};
  for (const p of format.formatToParts(new Date(at))) fields[p.type] = p.value;
  return {
    year: Number(fields.year),
    month: Number(fields.month),
    day: Number(fields.day),
    hour: Number(fields.hour) % 24,
    minute: Number(fields.minute),
    second: Number(fields.second),
    weekday: WEEKDAYS.indexOf(fields.weekday),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The day a moment falls on in the suite's zone: "2026-10-18". */
export function dayKey(at: Date | string | number): string {
  const p = zonedParts(at);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** The month a moment falls in, in the suite's zone: "2026-10". */
export function monthKey(at: Date | string | number): string {
  const p = zonedParts(at);
  return `${p.year}-${pad(p.month)}`;
}

/** Whether two moments fall on the same day in the suite's zone. */
export const sameDay = (a: Date | string | number, b: Date | string | number): boolean => dayKey(a) === dayKey(b);

/** Whole days from the day `from` falls on to the day `to` does, in the suite's zone (a clock change doesn't count). */
export function daysBetween(from: Date | string | number, to: Date | string | number): number {
  const a = zonedParts(from);
  const b = zonedParts(to);
  return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86_400_000);
}

/** How far the suite's zone is ahead of UTC at a moment, in ms. */
function offsetAt(ms: number): number {
  const p = zonedParts(ms);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - (ms - (((ms % 1000) + 1000) % 1000));
}

/**
 * The moment a wall-clock time in the suite's zone is: `zonedDate(2026, 10, 18)` is midnight that
 * day there, whatever the device's zone. Months and days past their end roll over (month 13 is next
 * January), as Date.UTC's do.
 */
export function zonedDate(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): Date {
  const wall = Date.UTC(year, month - 1, day, hour, minute, second);
  const guess = wall - offsetAt(wall);
  // Across a clock change the offset at the answer can differ from the one at the guess.
  return new Date(wall - offsetAt(guess));
}

/** When the day `at` falls on began, in the suite's zone. */
export function startOfZonedDay(at: Date | string | number): Date {
  const p = zonedParts(at);
  return zonedDate(p.year, p.month, p.day);
}
