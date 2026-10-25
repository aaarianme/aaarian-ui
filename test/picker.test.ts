import { describe, it, expect } from "vitest";
import { filterOptions, leaves, type PickerOption } from "../src/picker";

// A grouped option set: an "All" leaf plus two module groups of watchers — the
// shape the Tracked Items / watcher pickers build.
const opts: PickerOption[] = [
  { value: "", label: "All" },
  {
    value: "module:apple",
    label: "Apple Refurbished",
    children: [
      { value: "w1", label: "Mac mini watcher" },
      { value: "w2", label: "Mac Studio watcher" },
    ],
  },
  {
    value: "module:bestbuy",
    label: "Best Buy",
    children: [{ value: "w3", label: "GPU watcher" }],
  },
];

describe("leaves", () => {
  it("flattens to the selectable leaves (childless tops + every child)", () => {
    expect(leaves(opts).map((o) => o.value)).toEqual(["", "w1", "w2", "w3"]);
  });
});

describe("filterOptions", () => {
  it("returns the original list (same reference) for an empty query", () => {
    expect(filterOptions(opts, "")).toBe(opts);
  });

  it("keeps a group but narrows it to the children matching the query", () => {
    const r = filterOptions(opts, "studio");
    expect(r).toHaveLength(1);
    expect(r[0].label).toBe("Apple Refurbished");
    expect(r[0].children?.map((c) => c.value)).toEqual(["w2"]);
  });

  it("keeps ALL children when the group label itself matches", () => {
    const r = filterOptions(opts, "apple");
    expect(r[0].children?.map((c) => c.value)).toEqual(["w1", "w2"]);
  });

  it("matches childless top-level options", () => {
    expect(filterOptions(opts, "all").map((o) => o.value)).toEqual([""]);
  });

  it("drops groups whose children don't match", () => {
    expect(filterOptions(opts, "gpu").map((o) => o.label)).toEqual(["Best Buy"]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterOptions(opts, "zzz")).toEqual([]);
  });
});
