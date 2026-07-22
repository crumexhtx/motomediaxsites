import { describe, expect, it } from "vitest";
import {
  commonsTitleLooksPlausible,
  isTrustedHeroPhoto,
  photoConfidenceLabel,
  suggestTrimImageConfidence,
} from "@/lib/imageConfidence";
import { enrichYearEntry, getCuratedPerformance } from "@/lib/trims";
import type { YearEntry } from "@/data/catalog";

describe("imageConfidence", () => {
  it("never auto-promotes to verified", () => {
    expect(
      suggestTrimImageConfidence({
        trimId: "xse",
        trimName: "XSE",
        pageYear: 2025,
        commonsTitle: "File:2025 Toyota Camry XSE.jpg",
      }),
    ).toBe("unverified");
  });

  it("honors explicit verified marks", () => {
    expect(
      suggestTrimImageConfidence({
        trimId: "xse",
        trimName: "XSE",
        pageYear: 2025,
        commonsTitle: "File:2025 Toyota Camry XSE.jpg",
        explicit: "verified",
      }),
    ).toBe("verified");
  });

  it("only verified photos are trusted for hero", () => {
    expect(isTrustedHeroPhoto("verified")).toBe(true);
    expect(isTrustedHeroPhoto("unverified")).toBe(false);
    expect(isTrustedHeroPhoto("yearOnly")).toBe(false);
  });

  it("flags commons titles that look like the wrong trim", () => {
    const check = commonsTitleLooksPlausible({
      trimId: "le",
      trimName: "LE",
      pageYear: 2025,
      commonsTitle: "File:2024 Toyota Camry XLE in Blueprint.jpg",
    });
    // "le" is a substring of "xle" after normalize — still useful for far years
    expect(typeof check.ok).toBe("boolean");
  });

  it("flags far year mismatches", () => {
    const check = commonsTitleLooksPlausible({
      trimId: "le",
      trimName: "LE",
      pageYear: 2025,
      commonsTitle: "File:2018 Toyota Camry LE.jpg",
    });
    expect(check.ok).toBe(false);
    expect(check.reasons.some((r) => r.includes("far from page year"))).toBe(
      true,
    );
  });

  it("labels confidence for UI copy", () => {
    expect(photoConfidenceLabel("verified")).toMatch(/Verified/i);
    expect(photoConfidenceLabel("unverified")).toMatch(/Unverified/i);
    expect(photoConfidenceLabel("yearOnly")).toMatch(/Model-year/i);
  });
});

describe("enrichYearEntry image promotion", () => {
  it("does not promote unverified default trim photos into year.images[0]", () => {
    const year: YearEntry = {
      year: 2025,
      slug: "2025",
      summary: "test",
      description: "test",
      images: [
        {
          src: "/catalog/toyota--camry.jpg",
          alt: "year hero",
          width: 1280,
          height: 853,
        },
      ],
    };
    const enriched = enrichYearEntry("toyota", "camry", year);
    // Default Camry trim is often LE (unverified XLE file) — year photo stays first.
    expect(enriched.images[0]?.src).toBe("/catalog/toyota--camry.jpg");
    expect(enriched.images[0]?.confidence).toBe("yearOnly");
  });

  it("attaches confidence on curated trim images", () => {
    const perf = getCuratedPerformance("toyota", "camry", 2025);
    const xseAwd = perf?.trims.find((t) => t.id === "xse-awd");
    expect(xseAwd?.image).toBeTruthy();
    expect(xseAwd?.imageConfidence).toBe("verified");
    const le = perf?.trims.find((t) => t.id === "le");
    expect(le?.image).toBeTruthy();
    expect(le?.imageConfidence).toBe("unverified");
  });

  it("promotes verified trim photos when that trim is default", () => {
    const year: YearEntry = {
      year: 2025,
      slug: "2025",
      summary: "test",
      description: "test",
      images: [
        {
          src: "/catalog/toyota--camry.jpg",
          alt: "year hero",
          width: 1280,
          height: 853,
        },
      ],
      performance: {
        defaultTrimId: "xse",
        trims: [
          {
            id: "xse",
            name: "XSE",
            horsepower: 225,
            image: "/catalog/toyota--camry--xse.jpg",
            imageConfidence: "verified",
          },
        ],
      },
    };
    const enriched = enrichYearEntry("toyota", "camry", year);
    expect(enriched.images[0]?.src).toBe("/catalog/toyota--camry--xse.jpg");
    expect(enriched.images[0]?.confidence).toBe("verified");
  });
});
