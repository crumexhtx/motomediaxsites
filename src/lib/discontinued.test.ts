import { describe, expect, it } from "vitest";
import {
  getDiscontinuedInfo,
  ghostYearRedirectTarget,
  shouldShowDiscontinuedBanner,
} from "@/lib/discontinued";

describe("discontinued helpers", () => {
  it("resolves ghost years so pages can 404 instead of redirecting", () => {
    expect(ghostYearRedirectTarget("ford", "fiesta-st", "2026")).toBe(2019);
    expect(ghostYearRedirectTarget("chevrolet", "bolt-ev", "2024")).toBe(2023);
    expect(ghostYearRedirectTarget("bmw", "m5", "2024")).toBe(2025);
    expect(ghostYearRedirectTarget("ford", "fusion", "2025")).toBe(2020);
    expect(ghostYearRedirectTarget("ford", "fiesta-st", "2019")).toBeUndefined();
  });

  it("covers model-years pins such as Fusion with banner copy", () => {
    const info = getDiscontinuedInfo("ford", "fusion");
    expect(info?.lastYear).toBe(2020);
    expect(info?.ghostYears).toEqual([2024, 2025, 2026]);
    expect(shouldShowDiscontinuedBanner(info)).toBe(true);
  });

  it("exposes discontinued banner copy", () => {
    const info = getDiscontinuedInfo("jeep", "renegade");
    expect(info?.lastYear).toBe(2023);
    expect(shouldShowDiscontinuedBanner(info)).toBe(true);
  });

  it("skips banner for gap-only entries like M5 2024", () => {
    const info = getDiscontinuedInfo("bmw", "m5");
    expect(shouldShowDiscontinuedBanner(info)).toBe(false);
  });
});
