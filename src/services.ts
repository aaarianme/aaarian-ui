import { createElement, forwardRef, useEffect, useState, type SVGProps } from "react";
import { Zap, Boxes, Server, Bell, ShieldCheck, Globe, CodeXml, Ticket, Sparkles, type LucideIcon } from "lucide-react";

// ===========================================================================
// Service catalog for the cross-app switcher.
//
// SOURCE OF TRUTH: auth.aaarian.me/services.json. The bundled list below is a
// fallback (and the icon/accent map) used when that fetch is unavailable
// (offline, Access not yet configured, local dev). Keep this in sync with
// auth/services.json — same keys, groups, order.
// ===========================================================================

export interface ServiceItem {
  key: string;
  label: string;
  host: string;
  url: string;
  description?: string;
}
export interface ServiceGroup {
  group: string;
  items: ServiceItem[];
}

// ACO's mark — a hat + glasses (incognito) glyph in the lucide line style.
// (services.ts is plain .ts, so the SVG is built with createElement, not JSX.)
const HatGlasses = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>((props, ref) =>
  createElement(
    "svg",
    {
      ref,
      xmlns: "http://www.w3.org/2000/svg",
      width: 24,
      height: 24,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      ...props,
    },
    createElement("path", { d: "M6 11c0-3.3 2.7-6 6-6s6 2.7 6 6" }),
    createElement("path", { d: "M3 11h18" }),
    createElement("circle", { cx: 7, cy: 16, r: 3 }),
    createElement("circle", { cx: 17, cy: 16, r: 3 }),
    createElement("path", { d: "M10 16h4" }),
  ),
) as unknown as LucideIcon;

// Icon + accent per service key (visual only; not part of the JSON contract).
export const SERVICE_ICON: Record<string, LucideIcon> = {
  sneakers: Zap,
  retail: HatGlasses,
  inventory: Boxes,
  tix: Ticket,
  proxies: Server,
  notifications: Bell,
  agents: Sparkles,
  auth: ShieldCheck,
  deploys: CodeXml,
  "aaarian.me": Globe,
};
export const SERVICE_ACCENT: Record<string, string> = {
  sneakers: "#0A84FF",
  retail: "#bf5af2",
  inventory: "#7B61FF",
  tix: "#D90368",
  proxies: "#8BE40E",
  notifications: "#ffc300",
  agents: "#5e5ce6",
  auth: "#8E8E93",
  deploys: "#2a2e34",
  "aaarian.me": "#1d1d1f",
};

// Image-URL icons override the lucide glyph above — hosted centrally on the
// personal site (aaarian.me/assets) so every app's switcher uses the same mark.
// These are the drawer's tiles, background and all (Scouter's blue, Proxy Manager's green; ACO's,
// Inventory's and Tix's white); everywhere else an app shows its mark alone, on nothing.
export const SERVICE_ICON_URL: Record<string, string> = {
  sneakers: "https://aaarian.me/assets/scouter-icon.png",
  retail: "https://aaarian.me/assets/aco-tile.png",
  inventory: "https://aaarian.me/assets/inventory-tile.png",
  tix: "https://aaarian.me/assets/tix-tile.png",
  proxies: "https://aaarian.me/assets/proxies-tile.png",
  notifications: "https://aaarian.me/assets/notifications-icon.svg",
  agents: "https://aaarian.me/assets/agents-icon.svg",
};

// Each group is one row of the drawer — four across, the room left a grey placeholder; the
// group's name isn't shown.
export const BUNDLED_SERVICES: ServiceGroup[] = [
  {
    group: "Apps",
    items: [
      { key: "retail", label: "ACO", host: "aco.aaarian.me", url: "https://aco.aaarian.me", description: "Modular retail price tracking." },
      { key: "sneakers", label: "Scouter", host: "scouter.aaarian.me", url: "https://scouter.aaarian.me", description: "Store prices against StockX, size by size, for resale flips." },
      { key: "inventory", label: "Inventory Manager", host: "inventory.aaarian.me", url: "https://inventory.aaarian.me", description: "What you bought, where it is, and the emails that prove it." },
      { key: "tix", label: "Tix", host: "tix.aaarian.me", url: "https://tix.aaarian.me", description: "Profiles, each with its own proxy and browser tab." },
    ],
  },
  {
    group: "Platform",
    items: [
      { key: "proxies", label: "Proxy Manager", host: "proxies.aaarian.me", url: "https://proxies.aaarian.me", description: "Rotating proxy pool + lease API." },
      { key: "notifications", label: "Notifications", host: "notifications.aaarian.me", url: "https://notifications.aaarian.me", description: "Flexible notification dispatch." },
      { key: "agents", label: "Agents", host: "agents.aaarian.me", url: "https://agents.aaarian.me", description: "Small, fast LLM agents the apps call." },
    ],
  },
  {
    group: "Account",
    items: [
      { key: "auth", label: "Accounts", host: "auth.aaarian.me", url: "https://auth.aaarian.me", description: "Sign-in hub & app launcher." },
      { key: "deploys", label: "Deploys", host: "deploys.aaarian.me", url: "https://deploys.aaarian.me", description: "CI/CD deploy status dashboard." },
      { key: "aaarian.me", label: "Personal site", host: "aaarian.me", url: "https://aaarian.me", description: "aaarian.me" },
    ],
  },
];

const AUTH_SERVICES_URL = "https://auth.aaarian.me/services.json";

/** Returns the service groups — bundled immediately, overridden by auth's catalog if reachable. */
export function useServices(): ServiceGroup[] {
  const [groups, setGroups] = useState<ServiceGroup[]>(BUNDLED_SERVICES);
  useEffect(() => {
    let alive = true;
    fetch(AUTH_SERVICES_URL, { credentials: "omit" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (alive && Array.isArray(data?.groups)) setGroups(data.groups as ServiceGroup[]);
      })
      .catch(() => {
        /* keep bundled */
      });
    return () => {
      alive = false;
    };
  }, []);
  return groups;
}

/** The signed-in identity from Cloudflare Access (same-origin; works behind Access). */
export function useIdentity(): { email: string | null; loading: boolean } {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    fetch("/cdn-cgi/access/get-identity", { credentials: "include", headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => alive && setEmail(d?.email || d?.user_email || d?.name || null))
      .catch(() => alive && setEmail(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);
  return { email, loading };
}

export const LOGOUT_URL = "/cdn-cgi/access/logout";
