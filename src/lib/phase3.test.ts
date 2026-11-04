import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getAllMakes, getRecallTotals, getRecentRecalls, makeCoverImage, makeHref } from "@/lib/catalog";
import { complaintRowsWithOther } from "@/lib/complaints";
import { pickCompareTrimId, trimDisplayLabels } from "@/lib/trimLabels";
import { resolveSnapshotAsOf } from "@/lib/yearSnapshot";
import {
  formatIsoDate,
  formatYearRanges,
  normalizeModelNames,
} from "@/lib/text";

describe("phase 3 · makes", () => {
  it("gives every make a logo file and a link", () => {
    for (const make of getAllMakes()) {
      const cover = makeCoverImage(make);
      expect(cover.src, make.slug).toBe(`/brands/${make.slug}.svg`);
      const file = path.join(process.cwd(), "public", "brands", `${make.slug}.svg`);
      expect(fs.existsSync(file), file).toBe(true);
      expect(makeHref(make.slug)).toBe(`/makes/${make.slug}`);
    }
  });
});

describe("phase 3 · recalls grouped by campaign", () => {
  it("lists each campaign once with affected models and years", () => {
    const all = getRecentRecalls(10_000);
    const ids = all.map((r) => r.campaignNumber);
    expect(new Set(ids).size).toBe(ids.length);
    expect(getRecallTotals().uniqueCampaigns).toBe(all.length);
    for (const r of all.slice(0, 50)) {
      expect(r.affected.length).toBeGreaterThan(0);
      expect(r.years.length).toBeGreaterThan(0);
      expect(r.affectedLabel.length).toBeGreaterThan(0);
      expect(r.href).toMatch(/^\/makes\//);
      expect(r.years).toEqual([...r.years].sort((a, b) => b - a));
    }
    const sorted = [...all].sort((a, b) => b.date.localeCompare(a.date));
    expect(all[0].date).toBe(sorted[0].date);
  });

  it("normalizes split nameplates in recall copy", () => {
    expect(normalizeModelNames("2019 Toyota RAV 4 and 4 Runner")).toBe(
      "2019 Toyota RAV4 and 4Runner",
    );
    expect(normalizeModelNames("RAV4 4Runner")).toBe("RAV4 4Runner");
    expect(normalizeModelNames("2024 Tacoma")).toBe("2024 Tacoma");
    for (const r of getRecentRecalls(10_000)) {
      expect(`${r.component} ${r.summary}`).not.toMatch(/RAV 4|4 Runner/);
    }
  });

  it("formats dates and year ranges", () => {
    expect(formatIsoDate("2026-09-22T20:37:55.931Z")).toBe("Sep 22, 2026");
    expect(formatIsoDate("2026-02-05")).toBe("Feb 5, 2026");
    expect(formatYearRanges([2023, 2021, 2022, 2025])).toBe("2021–2023, 2025");
    expect(formatYearRanges([2024])).toBe("2024");
  });
});

describe("phase 3 · year page helpers", () => {
  it("adds an Other row when top components do not sum to the total", () => {
    const rows = complaintRowsWithOther({
      total: 20,
      byComponent: [
        { component: "ENGINE", count: 8 },
        { component: "AIR BAGS", count: 5 },
      ],
    });
    expect(rows.at(-1)).toEqual({ component: "Other", count: 7 });
    expect(rows.reduce((s, r) => s + r.count, 0)).toBe(20);

    const exact = complaintRowsWithOther({
      total: 5,
      byComponent: [{ component: "ENGINE", count: 5 }],
    });
    expect(exact.some((r) => r.component === "Other")).toBe(false);
  });

  it("uses the real data pull date for the As-of stamp", () => {
    const fromYear = resolveSnapshotAsOf({
      year: { safetyStatus: { recalls: "ok", complaints: "ok", fetchedAt: "2026-09-22T20:37:55.931Z" } },
      catalogFetchedAt: "2026-10-01T00:00:00.000Z",
    });
    expect(fromYear.asOf).toBe("Sep 22, 2026");

    const fromCatalog = resolveSnapshotAsOf({
      year: {},
      catalogFetchedAt: "2026-10-01T00:00:00.000Z",
    });
    expect(fromCatalog.asOf).toBe("Oct 1, 2026");

    const fromRecall = resolveSnapshotAsOf({
      year: {
        recalls: [
          { campaignNumber: "A", date: "2024-02-21", component: "x", summary: "y" },
          { campaignNumber: "B", date: "2025-09-11", component: "x", summary: "y" },
        ],
      },
    });
    expect(fromRecall.asOf).toBe("Sep 11, 2025");

    expect(resolveSnapshotAsOf({ year: {}, pricingAsOf: "2026-07" }).asOf).toBe(
      "Jul 2026",
    );
  });

  it("disambiguates trim labels and picks a different Trim B", () => {
    const trims = [
      { id: "sr5", name: "SR5", engine: "2.4L Turbo I4" },
      { id: "hybrid", name: "SR5 i-FORCE MAX", engine: "2.4L Turbo Hybrid" },
    ];
    const labels = trimDisplayLabels(trims);
    expect(labels.sr5).not.toBe(labels.hybrid);
    expect(labels.sr5).toBe("SR5 (2.4L Turbo I4)");
    expect(pickCompareTrimId(trims, "sr5", labels)).toBe("hybrid");
    expect(pickCompareTrimId(trims, "hybrid", labels)).toBe("sr5");

    const dupes = trimDisplayLabels([
      { id: "a", name: "LE" },
      { id: "b", name: "LE" },
    ]);
    expect(dupes.a).not.toBe(dupes.b);

    expect(
      trimDisplayLabels([
        { id: "sr5", name: "SR5 (hybrid available)" },
        { id: "hybrid", name: "i-FORCE MAX Hybrid" },
      ]).sr5,
    ).toBe("SR5");
  });
});

describe("phase 3 · rental guide pages", () => {
  const shell = fs.readFileSync(
    path.join(process.cwd(), "src/components/RentalsPageShell.tsx"),
    "utf8",
  );

  it("shell renders BreadcrumbList JSON-LD and the owner disclosure once", () => {
    expect(shell).toContain("breadcrumbJsonLd");
    expect(shell.match(/<RentalOwnerDisclosure/g)?.length).toBe(1);
  });

  it.each(["houston", "how-to-choose", "what-to-expect"])(
    "/rentals/%s uses the shell without a duplicate disclosure",
    (slug) => {
      const src = fs.readFileSync(
        path.join(process.cwd(), "src/app/rentals", slug, "page.tsx"),
        "utf8",
      );
      expect(src).toContain("<RentalsPageShell");
      expect(src).not.toContain("RentalOwnerDisclosure");
    },
  );
});
