import { describe, expect, it } from "vitest";
import type { YearEntry } from "@/data/catalog";
import { getCatalog } from "@/data/catalog.server";
import {
  buildModelYearTable,
  buildYearSiblingComparison,
  pickFewestIssuesPerDollar,
  summarizeChangesVsPrevious,
  yearMetrics,
} from "@/lib/yearComparison";
import { META_DESCRIPTION_MAX, makeSeoDescription } from "@/lib/text";
import { organizationJsonLd } from "@/lib/seo";
import { SITE } from "@/data/catalog";

function year(n: number, partial: Partial<YearEntry> = {}): YearEntry {
  return {
    year: n,
    slug: String(n),
    summary: `${n}`,
    description: `${n}`,
    images: [],
    safetyStatus: { recalls: "ok", complaints: "ok" },
    recalls: [],
    complaints: { total: 0, crashCount: 0, fireCount: 0, injuryCount: 0, byComponent: [] },
    ...partial,
  };
}

function recalls(n: number): YearEntry["recalls"] {
  return Array.from({ length: n }, (_, i) => ({
    campaignNumber: `X${i}`,
    date: "2024-01-01",
    component: "TEST",
    summary: "test",
  }));
}

function complaints(total: number): YearEntry["complaints"] {
  return { total, crashCount: 0, fireCount: 0, injuryCount: 0, byComponent: [] };
}

describe("pickFewestIssuesPerDollar", () => {
  it("picks the lowest issues-per-dollar year", () => {
    const winners = pickFewestIssuesPerDollar([
      { year: 2020, issuesPer10k: 5 },
      { year: 2021, issuesPer10k: 2 },
      { year: 2022, issuesPer10k: 9 },
    ]);
    expect([...winners]).toEqual([2021]);
  });

  it("skips incomplete rows and does not highlight when all tie or <2 comparable", () => {
    expect(
      pickFewestIssuesPerDollar([
        { year: 2020, issuesPer10k: null },
        { year: 2021, issuesPer10k: 3 },
      ]).size,
    ).toBe(0);
    expect(
      pickFewestIssuesPerDollar([
        { year: 2020, issuesPer10k: 0 },
        { year: 2021, issuesPer10k: 0 },
      ]).size,
    ).toBe(0);
  });
});

describe("yearMetrics", () => {
  it("keeps missing data as null instead of inventing it", () => {
    const row = yearMetrics("nope", "nope", {
      ...year(2020),
      recalls: undefined,
      complaints: undefined,
      safetyStatus: { recalls: "error", complaints: "error" },
    });
    expect(row.recalls).toBeNull();
    expect(row.complaints).toBeNull();
    expect(row.usedPrice).toBeNull();
    expect(row.mpgCombined).toBeNull();
    expect(row.issuesPer10k).toBeNull();
  });

  it("reads counts and MPG from the year entry", () => {
    const row = yearMetrics("nope", "nope", {
      ...year(2020, { recalls: recalls(2), complaints: complaints(7) }),
      specs: { mpgCombined: 30 },
    });
    expect(row).toMatchObject({ recalls: 2, complaints: 7, mpgCombined: 30 });
  });
});

describe("summarizeChangesVsPrevious", () => {
  it("is empty for the earliest year and lists real spec changes otherwise", () => {
    const prev = year(2020, { specs: { mpgCombined: 28 } });
    const cur = year(2021, { specs: { mpgCombined: 31 } });
    expect(summarizeChangesVsPrevious(undefined, prev)).toEqual([]);
    expect(summarizeChangesVsPrevious(prev, cur)).toEqual([
      "Combined MPG: 28 mpg → 31 mpg",
    ]);
  });
});

describe("buildModelYearTable / buildYearSiblingComparison", () => {
  const years = [
    year(2022, { recalls: recalls(0), complaints: complaints(1) }),
    year(2021, { recalls: recalls(1), complaints: complaints(5) }),
    year(2020, { recalls: recalls(3), complaints: complaints(40) }),
  ];

  it("returns rows newest-first with one row per year", () => {
    const rows = buildModelYearTable("nope", "nope", years);
    expect(rows.map((r) => r.year)).toEqual([2022, 2021, 2020]);
    // No pricing for unknown model → nothing is highlighted.
    expect(rows.some((r) => r.highlight)).toBe(false);
  });

  it("compares a year to siblings with sibling-minus-current deltas", () => {
    const cmp = buildYearSiblingComparison("nope", "nope", years, 2021);
    expect(cmp?.current.year).toBe(2021);
    expect(cmp?.siblings.map((s) => s.year)).toEqual([2022, 2020]);
    expect(cmp?.siblings[0]).toMatchObject({
      recallsDelta: -1,
      complaintsDelta: -4,
      priceDelta: null,
    });
    expect(cmp?.ranges.recalls).toEqual([0, 3]);
    expect(buildYearSiblingComparison("nope", "nope", [years[0]!], 2022)).toBeNull();
  });

  it("highlights a year on real catalog data without throwing", () => {
    for (const make of getCatalog()) {
      for (const model of make.models) {
        const rows = buildModelYearTable(make.slug, model.slug, model.years);
        expect(rows).toHaveLength(model.years.length);
        expect(rows.filter((r) => r.highlight).length).toBeLessThan(
          Math.max(2, rows.length),
        );
      }
    }
  });
});

describe("makeSeoDescription", () => {
  it("leads with the used-buyer purpose, not founding history", () => {
    const d = makeSeoDescription({
      makeName: "Toyota",
      modelNames: ["Camry", "RAV4"],
      yearMin: 2015,
      yearMax: 2026,
    });
    expect(d.startsWith("Used Toyota buyer guide")).toBe(true);
    expect(d).not.toMatch(/founded|headquarter/i);
  });

  it("never exceeds 160 chars for any catalog make", () => {
    for (const make of getCatalog()) {
      const years = make.models.flatMap((m) => m.years.map((y) => y.year));
      const d = makeSeoDescription({
        makeName: make.name,
        modelNames: make.models.map((m) => m.name),
        yearMin: Math.min(...years),
        yearMax: Math.max(...years),
      });
      expect(d.length, `${make.slug}: ${d}`).toBeLessThanOrEqual(160);
      expect(d.length, `${make.slug}: ${d}`).toBeLessThanOrEqual(
        META_DESCRIPTION_MAX,
      );
      expect(d.length, `${make.slug}: ${d}`).toBeGreaterThanOrEqual(110);
    }
  });
});

describe("organizationJsonLd logo", () => {
  it("includes an absolute logo URL", () => {
    expect(organizationJsonLd().logo).toBe(`${SITE.url}/mmx-logo.png`);
  });
});
