import { describe, expect, it } from "vitest";
import {
  enrichYearSummary,
  isThinYearSummary,
  looksTruncatedMidSentence,
  truncateAtSentence,
  yearSeoDescription,
} from "@/lib/text";

describe("text helpers", () => {
  it("truncates blurbs on a sentence boundary", () => {
    const raw =
      "Bayerische Motoren Werke AG was founded in 1917. Thereafter, in 1922, the name and assets of BMW GmbH were transferred to th";
    const fixed = truncateAtSentence(raw, 120);
    expect(fixed.endsWith(".")).toBe(true);
    expect(fixed).toContain("founded in 1917");
    expect(fixed).not.toMatch(/transferred to th$/);
    expect(looksTruncatedMidSentence(raw)).toBe(true);
    expect(looksTruncatedMidSentence(fixed)).toBe(false);

    // Exact maxLen mid-sentence fragments (catalog hard-slice bug) must also be repaired.
    expect(truncateAtSentence(raw, 400)).toMatch(/1917\.$/);
  });

  it("detects thin year summaries", () => {
    expect(
      isThinYearSummary("2026 BMW M2 — offered in the U.S. market."),
    ).toBe(true);
    expect(
      isThinYearSummary(
        "2025 Toyota Camry — NHTSA overall safety rating 5/5 from a representative config.",
      ),
    ).toBe(false);
  });

  it("builds richer SEO descriptions from year copy", () => {
    const description =
      "The 2026 BMW M2 continues this nameplate in the MotoMediaX catalog. The BMW M2 is a high-performance version of the BMW 2 Series automobile developed by BMW's motorsport division, BMW M.";
    const seo = yearSeoDescription({
      year: 2026,
      makeName: "BMW",
      modelName: "M2",
      summary: "2026 BMW M2 — offered in the U.S. market.",
      description,
    });
    expect(seo.toLowerCase()).toContain("m2");
    expect(seo).not.toMatch(/offered in the U\.S\. market/i);
    expect(seo.length).toBeGreaterThan(60);

    const enriched = enrichYearSummary({
      year: 2026,
      makeName: "BMW",
      modelName: "M2",
      summary: "2026 BMW M2 — offered in the U.S. market.",
      description,
    });
    expect(enriched).toBe(seo);
  });
});
