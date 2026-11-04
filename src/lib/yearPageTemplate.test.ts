import { describe, expect, it } from "vitest";
import type { TrimSpec } from "@/data/catalog";
import { getYearPricing, pricingDatasetLabel } from "@/lib/pricing";
import { getCuratedPerformance } from "@/lib/trims";
import {
  NOT_PUBLISHED,
  buildTrimCompareRows,
  buildTrimIndexColumns,
  canCompareTrims,
  formatSpec,
  isMissingSpec,
} from "@/lib/trimCompare";
import { pickCompareTrimId, trimDisplayLabels } from "@/lib/trimLabels";
import { videoThumbnailAlt } from "@/lib/videos";
import { snapshotMethodology } from "@/lib/yearSnapshot";

function trim(partial: Partial<TrimSpec> & Pick<TrimSpec, "id" | "name">): TrimSpec {
  return partial as TrimSpec;
}

describe("Toyota Tacoma 2024 trims", () => {
  const perf = getCuratedPerformance("toyota", "tacoma", 2024);
  const trims = perf?.trims ?? [];

  it("has multiple trims with distinct labels and a different Trim B", () => {
    expect(trims.length).toBeGreaterThan(1);
    const labels = trimDisplayLabels(trims);
    expect(new Set(Object.values(labels)).size).toBe(trims.length);

    const a = perf?.defaultTrimId ?? trims[0]!.id;
    const b = pickCompareTrimId(trims, a, labels);
    expect(b).toBeTruthy();
    expect(b).not.toBe(a);
    expect(labels[b!]).not.toBe(labels[a]);
  });

  it("never shows em dashes, TBD or TODO in compare rows or index", () => {
    const [a, b] = trims;
    const rows = buildTrimCompareRows(a!, b!);
    for (const row of rows) {
      for (const cell of [row.a, row.b]) {
        if (cell !== null) expect(cell).not.toMatch(/^(—|–|-+|tbd|todo)$/i);
      }
    }
    for (const col of buildTrimIndexColumns(trims)) {
      for (const t of trims) {
        const cell = col.cell(t);
        if (cell !== null) expect(isMissingSpec(cell)).toBe(false);
      }
    }
  });
});

describe("trim compare helpers", () => {
  it("drops a row when every compared trim is missing the value", () => {
    const rows = buildTrimCompareRows(
      trim({ id: "a", name: "A", horsepower: 200 }),
      trim({ id: "b", name: "B", horsepower: 250 }),
    );
    expect(rows.map((r) => r.label)).toEqual(["Horsepower"]);
  });

  it("keeps a row with a null side (rendered as Not published) when only some trims have it", () => {
    const rows = buildTrimCompareRows(
      trim({ id: "a", name: "A", horsepower: 200, zeroToSixtySec: 6.1 }),
      trim({ id: "b", name: "B", horsepower: 250 }),
    );
    const zero = rows.find((r) => r.label === "0–60");
    expect(zero).toEqual({ label: "0–60", a: "6.1 s", b: null });
    expect(NOT_PUBLISHED).toBe("Not published");
  });

  it("treats placeholder strings as missing", () => {
    for (const v of ["—", "–", "-", "N/A", "tbd", "TODO", "", "  ", undefined, null]) {
      expect(isMissingSpec(v)).toBe(true);
      expect(formatSpec(v as string | undefined)).toBeNull();
    }
    expect(formatSpec(278, " hp")).toBe("278 hp");
    expect(formatSpec(0, " s")).toBe("0 s");
  });

  it("drops trim-index columns no trim has", () => {
    const cols = buildTrimIndexColumns([
      trim({ id: "a", name: "A", horsepower: 200 }),
      trim({ id: "b", name: "B", horsepower: 250 }),
    ]).map((c) => c.label);
    expect(cols).toEqual(["HP"]);
  });

  it("hides compare UI unless there are at least two trims", () => {
    expect(canCompareTrims([])).toBe(false);
    expect(canCompareTrims([1])).toBe(false);
    expect(canCompareTrims([1, 2])).toBe(true);
  });

  it("defaults Trim B to a different trim when labels collide", () => {
    const trims = [
      { id: "sr5", name: "SR5" },
      { id: "sr5-dup", name: "SR5" },
      { id: "trd", name: "TRD Sport" },
    ];
    const labels = trimDisplayLabels(trims);
    expect(new Set(Object.values(labels)).size).toBe(3);
    const b = pickCompareTrimId(trims, "sr5", labels);
    expect(b).toBeTruthy();
    expect(b).not.toBe("sr5");
    expect(labels[b!]).not.toBe(labels.sr5);
  });
});

describe("video thumbnail alt", () => {
  it("uses the video title, else '<vehicle> video review'", () => {
    expect(videoThumbnailAlt({ title: "2024 Tacoma review" }, "2024 Toyota Tacoma")).toBe(
      "2024 Tacoma review",
    );
    expect(videoThumbnailAlt({ title: "  " }, "2024 Toyota Tacoma")).toBe(
      "2024 Toyota Tacoma video review",
    );
    expect(videoThumbnailAlt({ title: "" })).not.toBe("");
  });
});

describe("dataset dates", () => {
  it("labels a retention estimate without inventing a market-data date", () => {
    const pricing = getYearPricing("toyota", "tacoma", 2024, new Date("2026-11-04"));
    expect(pricing?.method).toBe("retention-estimate");
    expect(pricing?.asOf).toBeUndefined();
    expect(pricingDatasetLabel(pricing!)).toMatch(/Estimate based on 2026 vehicle age/);
    expect(pricingDatasetLabel(pricing!)).not.toMatch(/2026-07|Jul/);
  });

  it("dates pricing and NHTSA data separately in the methodology", () => {
    const pricing = getYearPricing("toyota", "tacoma", 2024, new Date("2026-11-04"));
    const text = snapshotMethodology({
      pricing,
      safetyFetchedAt: "2026-09-22T20:38:07.173Z",
    });
    expect(text).toContain("NHTSA data fetched Sep 22, 2026");
    expect(text).toContain("Estimate based on 2026 vehicle age");
  });

  it("formats a listing sample date from its own asOf", () => {
    const label = pricingDatasetLabel({
      method: "listing-average",
      asOf: "2026-07",
      estimateYear: 2026,
    } as Parameters<typeof pricingDatasetLabel>[0]);
    expect(label).toBe("Listing sample as of Jul 2026");
  });
});
