import { describe, expect, it } from "vitest";
import {
  getAllMakeParams,
  getAllModelParams,
  getAllYearParams,
  getHeroBackdropImages,
  getLatestEntries,
  getMake,
  getModel,
  getYear,
  makeHref,
  modelHref,
  searchCatalog,
  yearHref,
} from "@/lib/catalog";

describe("catalog lookups", () => {
  it("returns makes sorted alphabetically", async () => {
    const { getAllMakes } = await import("@/lib/catalog");
    const makes = getAllMakes();
    const names = makes.map((m) => m.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(makes.length).toBe(15);
  });

  it("resolves make, model, and year by slug", () => {
    const make = getMake("toyota");
    expect(make?.name).toBe("Toyota");

    const model = getModel("toyota", "camry");
    expect(model?.model.name).toBe("Camry");

    const year = getYear("toyota", "camry", "2025");
    expect(year?.year.year).toBe(2025);
  });

  it("returns undefined for unknown slugs", () => {
    expect(getMake("nope")).toBeUndefined();
    expect(getModel("toyota", "nope")).toBeUndefined();
    expect(getYear("toyota", "camry", "1999")).toBeUndefined();
  });

  it("builds static params for every catalog entry", () => {
    const makes = getAllMakeParams();
    const models = getAllModelParams();
    const years = getAllYearParams();

    expect(makes.length).toBe(15);
    expect(models.length).toBeGreaterThanOrEqual(makes.length);
    expect(years.length).toBeGreaterThanOrEqual(models.length);
    expect(makes.every((p) => typeof p.make === "string")).toBe(true);
    expect(years.every((p) => p.make && p.model && p.year)).toBe(true);
    expect(years.every((p) => ["2024", "2025", "2026"].includes(p.year))).toBe(
      true,
    );
  });

  it("builds href helpers", () => {
    expect(makeHref("bmw")).toBe("/makes/bmw");
    expect(modelHref("bmw", "x5")).toBe("/makes/bmw/x5");
    expect(yearHref("bmw", "x5", "2025")).toBe("/makes/bmw/x5/2025");
  });

  it("picks diverse local hero backdrop images when catalog photos exist", () => {
    const images = getHeroBackdropImages(4);
    expect(images.length).toBeGreaterThan(0);
    expect(images.length).toBeLessThanOrEqual(4);
    expect(new Set(images.map((img) => img.src)).size).toBe(images.length);
    for (const img of images) {
      expect(img.src.startsWith("/catalog/")).toBe(true);
    }
  });

  it("picks a car photo for make cover tiles", async () => {
    const { makeCoverImage, getMake } = await import("@/lib/catalog");
    const toyota = getMake("toyota");
    expect(toyota).toBeTruthy();
    const cover = makeCoverImage(toyota!);
    expect(cover.src.startsWith("/catalog/")).toBe(true);
    expect(cover.src.endsWith(".svg")).toBe(false);
  });

  it("returns latest entries sorted by year descending", () => {
    const latest = getLatestEntries(3);
    expect(latest).toHaveLength(3);
    for (let i = 1; i < latest.length; i += 1) {
      expect(latest[i - 1].year.year).toBeGreaterThanOrEqual(
        latest[i].year.year,
      );
    }
  });
});

describe("searchCatalog", () => {
  it("returns empty results for blank queries", () => {
    expect(searchCatalog("")).toEqual([]);
    expect(searchCatalog("   ")).toEqual([]);
  });

  it("finds makes by name", () => {
    const results = searchCatalog("toyota");
    expect(results.some((r) => r.type === "make" && r.title === "Toyota")).toBe(
      true,
    );
  });

  it("matches exact four-digit years only for numeric queries", () => {
    const exact = searchCatalog("2025");
    expect(exact.length).toBeGreaterThan(0);
    expect(exact.every((r) => r.type === "year")).toBe(true);
    expect(exact.every((r) => r.title.endsWith("2025"))).toBe(true);

    const partial = searchCatalog("20");
    expect(partial.filter((r) => r.type === "year")).toHaveLength(0);
  });

  it("finds models by name", () => {
    const results = searchCatalog("camry");
    expect(
      results.some((r) => r.type === "model" && r.title.includes("Camry")),
    ).toBe(true);
  });
});
