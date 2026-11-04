import { describe, expect, it } from "vitest";
import { getCatalog } from "@/data/catalog.server";
import {
  buildComparisonPage,
  getAllComparisonParams,
} from "@/lib/comparisons";
import {
  composeMetaDescription,
  modelHubSeoDescription,
  splitSentences,
  yearMetaDescription,
} from "@/lib/text";

const MIN = 110;
const MAX = 160;

describe("splitSentences", () => {
  it("does not split on U.S.", () => {
    expect(
      splitSentences("Sold in the U.S. market since 2020. Great value."),
    ).toEqual(["Sold in the U.S. market since 2020.", "Great value."]);
  });
});

describe("composeMetaDescription", () => {
  it("keeps whole sentences and tops up short bodies with fillers", () => {
    const out = composeMetaDescription({
      body: "Short lead.",
      fillers: ["A data-only filler sentence that is long enough to matter here ok.", "Tiny."],
      target: 40,
    });
    expect(out.startsWith("Short lead. A data-only filler")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(155);
  });

  it("never exceeds max", () => {
    const body = `${"Word ".repeat(40).trim()}. Second sentence.`;
    expect(composeMetaDescription({ body }).length).toBeLessThanOrEqual(155);
  });
});

describe("generated meta descriptions fit 110–160 chars", () => {
  it("year pages (every catalog year)", () => {
    for (const make of getCatalog()) {
      for (const model of make.models) {
        for (const y of model.years) {
          const d = yearMetaDescription({
            year: y.year,
            makeName: make.name,
            modelName: model.name,
            summary: y.summary,
            description: y.description,
            recallCount: y.recalls?.length,
          });
          const label = `${make.slug}/${model.slug}/${y.year}: ${d}`;
          expect(d.length, label).toBeGreaterThanOrEqual(MIN);
          expect(d.length, label).toBeLessThanOrEqual(MAX);
        }
      }
    }
  });

  it("model hub pages (every catalog model)", () => {
    for (const make of getCatalog()) {
      for (const model of make.models) {
        const years = model.years.map((y) => y.year);
        const lo = Math.min(...years);
        const hi = Math.max(...years);
        const d = modelHubSeoDescription({
          makeName: make.name,
          modelName: model.name,
          yearRange: lo === hi ? String(lo) : `${lo}–${hi}`,
          tagline: model.tagline,
        });
        const label = `${make.slug}/${model.slug}: ${d}`;
        expect(d.length, label).toBeGreaterThanOrEqual(MIN);
        expect(d.length, label).toBeLessThanOrEqual(MAX);
      }
    }
  });

  it("comparison pages", () => {
    for (const { slug } of getAllComparisonParams()) {
      const page = buildComparisonPage(slug);
      if (!page) continue;
      const d = composeMetaDescription({
        body: page.summary,
        fillers: [
          "Compare MSRP, used asking prices, recalls, and running costs on MotoMediaX.",
          "See recalls and used prices on MotoMediaX.",
        ],
      });
      expect(d.length, `${slug}: ${d}`).toBeGreaterThanOrEqual(MIN);
      expect(d.length, `${slug}: ${d}`).toBeLessThanOrEqual(MAX);
    }
  });
});
