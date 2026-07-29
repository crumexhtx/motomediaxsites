import { describe, expect, it } from "vitest";
import {
  formatUsd,
  getMsrpBase,
  getYearPricing,
  retentionRate,
} from "@/lib/pricing";

describe("pricing", () => {
  it("loads curated MSRP for catalog models", () => {
    expect(getMsrpBase("toyota", "camry", 2024)).toBeGreaterThan(20000);
    expect(getMsrpBase("ford", "fiesta-st", 2019)).toBeGreaterThan(15000);
    expect(getMsrpBase("nope", "nope", 2024)).toBeUndefined();
  });

  it("estimates used asking below MSRP for older years", () => {
    const pricing = getYearPricing("toyota", "camry", 2024, new Date("2026-07-01"));
    expect(pricing).toBeTruthy();
    expect(pricing!.method).toBe("retention-estimate");
    expect(pricing!.usedAverage).toBeLessThan(pricing!.msrpBase);
    expect(pricing!.retainedPct).toBeGreaterThan(0.4);
    expect(pricing!.retainedPct).toBeLessThan(1);
    expect(formatUsd(pricing!.msrpBase)).toMatch(/^\$/);
  });

  it("keeps nearly-new years close to MSRP", () => {
    const pricing = getYearPricing("toyota", "camry", 2026, new Date("2026-07-01"));
    expect(pricing!.retainedPct).toBeGreaterThan(0.85);
  });

  it("uses a declining retention table", () => {
    expect(retentionRate(0)).toBeGreaterThan(retentionRate(3));
    expect(retentionRate(3)).toBeGreaterThan(retentionRate(8));
    expect(retentionRate(20)).toBeGreaterThanOrEqual(0.12);
  });

  it("covers every catalog model year with pricing", async () => {
    const { getAllMakes } = await import("@/lib/catalog");
    for (const make of getAllMakes()) {
      for (const model of make.models) {
        for (const year of model.years) {
          const pricing = getYearPricing(make.slug, model.slug, year.year);
          expect(pricing, `${make.slug}/${model.slug}/${year.year}`).toBeTruthy();
          expect(pricing!.msrpBase).toBeGreaterThan(5000);
          expect(pricing!.usedAverage).toBeGreaterThan(1000);
        }
      }
    }
  });
});
