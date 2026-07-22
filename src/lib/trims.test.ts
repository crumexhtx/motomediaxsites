import { describe, expect, it } from "vitest";
import {
  curatedMakeSlugs,
  enrichYearEntry,
  getCuratedPerformance,
} from "@/lib/trims";
import { getAllMakes, getYear } from "@/lib/catalog";
import type { YearEntry } from "@/data/catalog";

describe("toyota curated trims", () => {
  it("loads Camry / RAV4 / Supra for 2025", () => {
    for (const model of ["camry", "rav4", "supra"] as const) {
      const perf = getCuratedPerformance("toyota", model, 2025);
      expect(perf?.trims.length).toBeGreaterThan(0);
      expect(perf?.trims[0]?.horsepower).toBeGreaterThan(0);
    }
  });

  it("attaches trim image paths when available", () => {
    const perf = getCuratedPerformance("toyota", "camry", 2025);
    const withImage = perf?.trims.filter((t) => t.image);
    expect(withImage?.length).toBeGreaterThan(0);
    expect(withImage?.[0]?.image?.startsWith("/catalog/toyota--")).toBe(true);
  });

  it("enriches year entries with performance and mpg", () => {
    const year: YearEntry = {
      year: 2025,
      slug: "2025",
      summary: "test",
      description: "test",
      images: [],
      specs: { overallLengthIn: "192.1" },
    };
    const enriched = enrichYearEntry("toyota", "camry", year);
    expect(enriched.performance?.trims.length).toBeGreaterThan(0);
    expect(enriched.specs?.mpgCombined).toBeGreaterThan(0);
    expect(enriched.specs?.overallLengthIn).toBe("192.1");
  });
});

describe("ford curated trims", () => {
  it("loads Mustang / F-150 / Bronco for 2025", () => {
    for (const model of ["mustang", "f-150", "bronco"] as const) {
      const perf = getCuratedPerformance("ford", model, 2025);
      expect(perf?.trims.length).toBeGreaterThan(0);
      expect(perf?.trims.some((t) => (t.horsepower ?? 0) > 0 || t.notes)).toBe(
        true,
      );
    }
  });
});

describe("all curated brands smoke", () => {
  it("covers all top-15 makes", () => {
    const curated = curatedMakeSlugs();
    expect(curated).toEqual([
      "bmw",
      "chevrolet",
      "ford",
      "gmc",
      "honda",
      "hyundai",
      "jeep",
      "kia",
      "mazda",
      "mercedes-benz",
      "nissan",
      "subaru",
      "tesla",
      "toyota",
      "volkswagen",
    ]);
  });

  it("every catalog make/model/year resolves curated performance", () => {
    const makes = getAllMakes();
    expect(makes.length).toBe(15);

    let missing = 0;
    const samples: string[] = [];

    for (const make of makes) {
      for (const model of make.models) {
        for (const year of model.years) {
          const found = getYear(make.slug, model.slug, year.slug);
          expect(found).toBeTruthy();
          const perf = found!.year.performance;
          if (!perf?.trims?.length) {
            missing += 1;
            if (samples.length < 8) {
              samples.push(`${make.slug}/${model.slug}/${year.year}`);
            }
          }
        }
      }
    }

    expect(missing, `missing curated trims: ${samples.join(", ")}`).toBe(0);
  });

  it("spot-checks hero stats for flagship models", () => {
    const checks: Array<[string, string, number]> = [
      ["chevrolet", "corvette", 2024],
      ["honda", "civic-type-r", 2025],
      ["nissan", "z", 2024],
      ["hyundai", "ioniq-5", 2025],
      ["kia", "telluride", 2025],
      ["subaru", "wrx-sti", 2024],
      ["jeep", "wrangler", 2025],
      ["gmc", "sierra", 2025],
      ["bmw", "m3", 2025],
      ["mercedes-benz", "g-class", 2025],
      ["tesla", "model-3", 2025],
      ["volkswagen", "gti", 2025],
      ["mazda", "cx-90", 2025],
    ];

    for (const [make, model, year] of checks) {
      const perf = getCuratedPerformance(make, model, year);
      expect(perf?.trims.length, `${make}/${model}`).toBeGreaterThan(0);
      expect(
        perf!.trims.some((t) => (t.horsepower ?? 0) > 0 || (t.rangeMiles ?? 0) > 0 || t.notes),
        `${make}/${model} needs hp/range/notes`,
      ).toBe(true);
    }
  });
});
