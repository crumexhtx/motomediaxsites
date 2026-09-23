import { describe, expect, it } from "vitest";
import {
  getPublishedReliabilityGuides,
  getReliabilityGuide,
  getYearReliabilityGlance,
  reliabilityGuideHref,
} from "@/lib/reliability";

describe("reliability accessors", () => {
  it("scaffolds every catalog model as unpublished empty guides", () => {
    const guide = getReliabilityGuide("chevrolet", "trax");
    expect(guide).toBeDefined();
    expect(guide?.published).toBe(false);
    expect(guide?.bestYears).toEqual([]);
    expect(guide?.yearsToAvoid).toEqual([]);
    expect(guide?.generations).toEqual([]);
    expect(guide?.byYear).toEqual({});

    expect(getReliabilityGuide("toyota", "camry")?.published).toBe(false);
    expect(getReliabilityGuide("honda", "civic")?.published).toBe(false);
  });

  it("hides unpublished guides from the hub and year glance", () => {
    expect(getPublishedReliabilityGuides()).toEqual([]);
    expect(getYearReliabilityGlance("chevrolet", "trax", 2025)).toBeNull();
  });

  it("builds guide hrefs", () => {
    expect(reliabilityGuideHref("chevrolet", "trax")).toBe(
      "/makes/chevrolet/trax/reliability",
    );
  });
});
