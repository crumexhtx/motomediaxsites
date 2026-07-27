import { describe, expect, it } from "vitest";
import { getBrandProfile } from "@/lib/brandProfile";
import { getRecentRecalls } from "@/lib/catalog";

describe("brand profiles", () => {
  it("covers every catalog make with history details", async () => {
    const { getAllMakes } = await import("@/lib/catalog");
    for (const make of getAllMakes()) {
      const profile = getBrandProfile(make.slug);
      expect(profile, make.slug).toBeTruthy();
      expect(profile!.founded).toMatch(/^\d{4}$/);
      expect(profile!.headquarters.length).toBeGreaterThan(3);
      expect(profile!.history.length).toBeGreaterThan(80);
    }
  });
});

describe("recent recalls", () => {
  it("returns newest-first recall rows with year links", () => {
    const rows = getRecentRecalls(10);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].campaignNumber).toMatch(/\d/);
    expect(rows[0].href).toMatch(/^\/makes\//);
    if (rows.length > 1) {
      expect(rows[0].date >= rows[1].date).toBe(true);
    }
  });
});
