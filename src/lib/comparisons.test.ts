import { describe, expect, it } from "vitest";
import {
  buildComparisonPage,
  comparisonsForModel,
  getAllComparisons,
  getComparison,
} from "@/lib/comparisons";
import { buildYearSnapshot } from "@/lib/yearSnapshot";
import { getYear } from "@/lib/catalog";

describe("comparisons", () => {
  it("defines at least 8 verified pairs", () => {
    const all = getAllComparisons();
    expect(all.length).toBeGreaterThanOrEqual(8);
    expect(getComparison("camry-vs-accord")?.title).toContain("Camry");
  });

  it("builds side-by-side metrics for each pair", () => {
    for (const def of getAllComparisons()) {
      const page = buildComparisonPage(def.slug);
      expect(page, def.slug).toBeTruthy();
      expect(page!.metrics.length).toBeGreaterThanOrEqual(5);
      expect(page!.a.href).toMatch(/^\/makes\//);
      expect(page!.b.href).toMatch(/^\/makes\//);
      expect(page!.summary.split(/\s+/).length).toBeGreaterThanOrEqual(40);
    }
  });

  it("links related comparisons from a model", () => {
    const related = comparisonsForModel("toyota", "camry");
    expect(related.some((c) => c.slug === "camry-vs-accord")).toBe(true);
  });
});

describe("year snapshot", () => {
  it("builds a dated direct answer with proprietary metrics", () => {
    const found = getYear("toyota", "camry", "2024");
    expect(found).toBeTruthy();
    const snapshot = buildYearSnapshot({
      year: found!.year,
      makeName: found!.make.name,
      makeSlug: found!.make.slug,
      modelName: found!.model.name,
      modelSlug: found!.model.slug,
      now: new Date("2026-07-01"),
    });
    expect(snapshot.asOf.length).toBeGreaterThan(3);
    expect(snapshot.metrics.length).toBeGreaterThanOrEqual(2);
    const words = snapshot.directAnswer.split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(40);
    expect(words).toBeLessThanOrEqual(90);
    expect(snapshot.methodology.length).toBeGreaterThan(20);
  });
});
