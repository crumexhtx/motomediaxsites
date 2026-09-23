import { describe, expect, it } from "vitest";
import {
  getCargurusTop10,
  getCatalogBrandReliabilityRanking,
} from "@/lib/brandReliability";

describe("brand reliability ranking", () => {
  it("returns CarGurus top 10 with Toyota near the top", () => {
    const top = getCargurusTop10();
    expect(top).toHaveLength(10);
    expect(top[0].brand).toBe("Lexus");
    expect(top[1].brand).toBe("Toyota");
    expect(top.some((r) => r.makeSlug === "toyota")).toBe(true);
  });

  it("ranks catalog brands most to least using CR + JD Power", () => {
    const rows = getCatalogBrandReliabilityRanking();
    expect(rows.length).toBe(15);
    // Subaru leads: strong CR score + strong JD PP100 among catalog makes.
    expect(rows[0].makeSlug).toBe("subaru");
    expect(rows.map((r) => r.makeSlug)).toContain("toyota");
    expect(rows[rows.length - 1].makeSlug).toBe("jeep");
    expect(rows.every((r) => r.crScore != null || r.jdPp100 != null)).toBe(
      true,
    );
    // Strictly most → least by average ordinal rank.
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].averageRank).toBeGreaterThanOrEqual(rows[i - 1].averageRank);
    }
  });
});
