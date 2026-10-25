import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

// ===========================================================================
// useUrlState — keep a piece of state in the URL query string, via react-router.
// Filters and selected ids go here so every view is shareable, bookmarkable,
// survives refresh / back-forward, and can be remembered per page (FilterMemory).
//
//   const [status, setStatus] = useUrlState("status", "");   // "" => param removed
//
// Built on react-router's useSearchParams so changes flow through the router
// (FilterMemory observes them). Pass { push: true } to add a history entry;
// omit it for filters (replaces — no history spam).
// ===========================================================================
export function useUrlState(
  key: string,
  defaultValue = "",
  opts: { push?: boolean } = {},
): [string, (v: string) => void] {
  const [params, setParams] = useSearchParams();
  const value = params.get(key) ?? defaultValue;

  const set = useCallback(
    (v: string) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (!v || v === defaultValue) next.delete(key);
          else next.set(key, v);
          return next;
        },
        { replace: !opts.push },
      );
    },
    [key, defaultValue, opts.push, setParams],
  );

  return [value, set];
}
