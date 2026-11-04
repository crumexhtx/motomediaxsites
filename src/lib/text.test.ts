import { describe, expect, it } from "vitest";
import {
  SEO_TITLE_MAX,
  enrichYearSummary,
  isThinYearSummary,
  looksTruncatedMidSentence,
  repairUtf8Mojibake,
  truncateAtSentence,
  yearSeoDescription,
  yearSeoTitle,
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

  it("does not collapse meta to only the recall sentence", () => {
    const seo = yearSeoDescription({
      year: 2026,
      makeName: "Ford",
      modelName: "F-150",
      summary:
        "2026 Ford F-150 — The Ford F-Series is a series of light-duty trucks marketed and sold by Ford Motor Company.",
      description:
        "The 2026 Ford F-150 continues this nameplate in the MotoMediaX catalog. The Ford F-Series is a series of light-duty trucks.",
      recallCount: 1,
    });
    expect(seo).toMatch(/2026 Ford F-150/i);
    expect(seo).toMatch(/NHTSA recall/i);
    expect(seo).not.toBe("1 NHTSA recall on record.");
  });

  it("builds a specific year SEO title that fits 60 chars once the site suffix is added", () => {
    // Rendered title = `${title} · MotoMediaX` (root layout template).
    const rendered = (t: string) => `${t} \u00b7 MotoMediaX`;

    const tacoma = yearSeoTitle({
      year: 2024,
      makeName: "Toyota",
      modelName: "Tacoma",
    });
    expect(tacoma).toBe("2024 Toyota Tacoma: Recalls & Specs");
    expect(rendered(tacoma).length).toBeLessThanOrEqual(SEO_TITLE_MAX);

    const f150 = yearSeoTitle({
      year: 2026,
      makeName: "Ford",
      modelName: "F-150",
    });
    expect(f150).toBe("2026 Ford F-150: Recalls & Specs");
    expect(f150.startsWith("2026 Ford F-150")).toBe(true);
  });

  it("keeps the long suffix when the rendered title is within 60 chars", () => {
    // 3-char make + 2-char model: "2024 Kia K5: Recalls, Specs & Used Price Guide · MotoMediaX" = 58.
    const title = yearSeoTitle({ year: 2024, makeName: "Kia", modelName: "K5" });
    expect(title).toBe("2024 Kia K5: Recalls, Specs & Used Price Guide");
    expect(`${title} \u00b7 MotoMediaX`.length).toBeLessThanOrEqual(SEO_TITLE_MAX);
  });

  it("always leads year page titles with year make model", () => {
    for (const [make, model] of [
      ["Mercedes-Benz", "GLE-Class"],
      ["Volkswagen", "Atlas Cross Sport"],
      ["Kia", "K5"],
    ] as const) {
      expect(
        yearSeoTitle({ year: 2025, makeName: make, modelName: model }),
      ).toMatch(new RegExp(`^2025 ${make} ${model}: `));
    }
  });

  it("repairs ??? mojibake from corrupted UTF-8 dashes", () => {
    expect(
      repairUtf8Mojibake(
        "2026 Toyota Camry ??? The Toyota Camry is an automobile.",
      ),
    ).toBe("2026 Toyota Camry — The Toyota Camry is an automobile.");
    expect(
      repairUtf8Mojibake("classification (wide-body)???although the two"),
    ).toBe("classification (wide-body)—although the two");
    expect(repairUtf8Mojibake("Federal Motor Vehicle Safety???")).toBe(
      "Federal Motor Vehicle Safety…",
    );
  });
});
