import { describe, expect, it } from "vitest";
import type { YearEntry } from "@/data/catalog";
import {
  bestCombinedMpg,
  clampMinMpg,
  DEFAULT_MIN_MPG,
  efficiencyMpgBounds,
  filterModelsByMinMpg,
  type EfficiencyCandidate,
} from "@/lib/efficiency";
import { getEfficiencyCandidates } from "@/lib/efficiency.server";

function candidate(
  partial: Partial<EfficiencyCandidate> &
    Pick<
      EfficiencyCandidate,
      "makeSlug" | "modelSlug" | "year" | "mpgCombined"
    >,
): EfficiencyCandidate {
  return {
    makeName: partial.makeName ?? "Make",
    modelName: partial.modelName ?? "Model",
    yearSlug: partial.yearSlug ?? String(partial.year),
    href: partial.href ?? "/",
    trimName: partial.trimName ?? null,
    powertrain: partial.powertrain ?? "gas",
    ...partial,
  };
}

describe("bestCombinedMpg", () => {
  it("uses year specs when no trims beat them", () => {
    const year = {
      year: 2024,
      slug: "2024",
      specs: { mpgCombined: 32 },
    } as YearEntry;
    expect(bestCombinedMpg(year)).toMatchObject({
      mpg: 32,
      trimName: null,
    });
  });

  it("picks the highest trim MPG and names that trim", () => {
    const year = {
      year: 2025,
      slug: "2025",
      specs: { mpgCombined: 28 },
      performance: {
        defaultTrimId: "se",
        trims: [
          { id: "se", name: "SE", mpgCombined: 28 },
          { id: "hybrid", name: "Hybrid LE", mpgCombined: 52, engine: "2.5L Hybrid" },
        ],
      },
    } as YearEntry;
    const result = bestCombinedMpg(year);
    expect(result.mpg).toBe(52);
    expect(result.trimName).toBe("Hybrid LE");
    expect(result.powertrain).toBe("hybrid");
  });
});

describe("filterModelsByMinMpg", () => {
  const rows = [
    candidate({
      makeSlug: "toyota",
      modelSlug: "camry",
      makeName: "Toyota",
      modelName: "Camry",
      year: 2024,
      mpgCombined: 52,
      powertrain: "hybrid",
    }),
    candidate({
      makeSlug: "toyota",
      modelSlug: "camry",
      makeName: "Toyota",
      modelName: "Camry",
      year: 2025,
      mpgCombined: 48,
      powertrain: "hybrid",
    }),
    candidate({
      makeSlug: "toyota",
      modelSlug: "tundra",
      makeName: "Toyota",
      modelName: "Tundra",
      year: 2025,
      mpgCombined: 20,
    }),
    candidate({
      makeSlug: "honda",
      modelSlug: "civic",
      makeName: "Honda",
      modelName: "Civic",
      year: 2025,
      mpgCombined: 36,
    }),
  ];

  it("keeps the newest year per model that meets the bar", () => {
    const at40 = filterModelsByMinMpg(rows, 40);
    expect(at40).toHaveLength(1);
    expect(at40[0]).toMatchObject({
      modelSlug: "camry",
      year: 2025,
      mpgCombined: 48,
    });
  });

  it("includes lower-mpg models when the floor drops", () => {
    const at30 = filterModelsByMinMpg(rows, 30);
    expect(at30.map((r) => r.modelSlug)).toEqual(["camry", "civic"]);
  });

  it("sorts by MPG descending", () => {
    const at15 = filterModelsByMinMpg(rows, 15);
    expect(at15.map((r) => r.mpgCombined)).toEqual([48, 36, 20]);
  });
});

describe("efficiencyMpgBounds / clampMinMpg", () => {
  it("derives bounds from candidates", () => {
    expect(
      efficiencyMpgBounds([
        candidate({ makeSlug: "a", modelSlug: "a", year: 2024, mpgCombined: 18.2 }),
        candidate({ makeSlug: "b", modelSlug: "b", year: 2024, mpgCombined: 51.7 }),
      ]),
    ).toEqual({ min: 18, max: 52 });
  });

  it("clamps into bounds", () => {
    expect(clampMinMpg(99, { min: 15, max: 60 })).toBe(60);
    expect(clampMinMpg(5, { min: 15, max: 60 })).toBe(15);
    expect(clampMinMpg(Number.NaN, { min: 15, max: 60 })).toBe(DEFAULT_MIN_MPG);
  });
});

describe("getEfficiencyCandidates", () => {
  it("returns catalog years with combined MPG", () => {
    const list = getEfficiencyCandidates();
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((c) => c.mpgCombined > 0)).toBe(true);
    expect(list[0].mpgCombined).toBeGreaterThanOrEqual(
      list[list.length - 1].mpgCombined,
    );
  });
});
