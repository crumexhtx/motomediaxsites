import { describe, expect, it } from "vitest";
import type { YearEntry } from "@/data/catalog";
import { diffYears, findPreviousYear } from "@/lib/yearDiff";

function year(
  n: number,
  partial: Partial<YearEntry> & { specs?: YearEntry["specs"] },
): YearEntry {
  return {
    year: n,
    slug: String(n),
    summary: `${n}`,
    description: `${n}`,
    images: [],
    ...partial,
  };
}

describe("yearDiff", () => {
  it("finds the nearest previous year", () => {
    const years = [year(2026, {}), year(2024, {}), year(2025, {})];
    expect(findPreviousYear(years, 2026)?.year).toBe(2025);
    expect(findPreviousYear(years, 2024)).toBeUndefined();
  });

  it("lists numeric and string changes between years", () => {
    const prev = year(2024, {
      specs: {
        mpgCombined: 52,
        overallLengthIn: "192.5",
        curbWeightLb: "3295.9",
        electrificationLevel: "Hybrid",
      },
      performance: {
        defaultTrimId: "le",
        trims: [
          { id: "le", name: "LE Hybrid", horsepower: 208, mpgCombined: 52 },
          { id: "se", name: "SE Hybrid", horsepower: 208 },
        ],
      },
    });
    const curr = year(2025, {
      specs: {
        mpgCombined: 51,
        overallLengthIn: "193.7",
        curbWeightLb: "3626.6",
        electrificationLevel: "Hybrid",
      },
      performance: {
        defaultTrimId: "le",
        trims: [
          { id: "le", name: "LE Hybrid", horsepower: 225, mpgCombined: 51 },
          { id: "xse", name: "XSE Hybrid", horsepower: 232 },
        ],
      },
    });

    const result = diffYears(prev, curr);
    expect(result.previousYear).toBe(2024);
    expect(result.currentYear).toBe(2025);
    expect(result.changes.map((c) => c.key)).toEqual(
      expect.arrayContaining([
        "mpgCombined",
        "horsepower",
        "overallLengthIn",
        "curbWeightLb",
      ]),
    );
    expect(result.changes.find((c) => c.key === "mpgCombined")).toMatchObject({
      previous: "52 mpg",
      current: "51 mpg",
      tone: "down",
    });
    expect(result.trimsAdded).toContain("XSE Hybrid");
    expect(result.trimsRemoved).toContain("SE Hybrid");
    expect(result.changes.find((c) => c.key === "electrificationLevel")).toBeUndefined();
  });

  it("returns empty when nothing changed", () => {
    const a = year(2025, {
      specs: { mpgCombined: 51, overallLengthIn: "193.7" },
    });
    const b = year(2026, {
      specs: { mpgCombined: 51, overallLengthIn: "193.7" },
    });
    const result = diffYears(a, b);
    expect(result.changes).toHaveLength(0);
    expect(result.trimsAdded).toHaveLength(0);
    expect(result.trimsRemoved).toHaveLength(0);
  });
});
