/**
 * Server-side “AI Overview” snapshot for year pages — proprietary planning
 * numbers (pricing, recalls, NHTSA rating) with a dated methodology note.
 */
import type {
  YearComplaintSummary,
  YearEntry,
  YearRecall,
} from "@/data/catalog";
import {
  formatRetainedPct,
  formatUsd,
  getYearPricing,
  pricingDatasetLabel,
  type YearPricing,
} from "@/lib/pricing";
import { getCatalogFetchedAt } from "@/lib/catalog";
import { formatIsoDate, normalizeModelNames } from "@/lib/text";
import type { YearDiffResult } from "@/lib/yearDiff";

export type SnapshotMetric = {
  label: string;
  value: string;
  hint?: string;
};

export type YearSnapshotData = {
  /** Human-readable data-pull date, e.g. "Sep 22, 2026". */
  asOf: string;
  /** Machine-readable date for <time dateTime>. */
  asOfIso?: string;
  /** What the stamp refers to, e.g. "Safety data as of". */
  asOfLabel: string;
  methodology: string;
  /** 40–80 word direct answer to the page’s core used-buyer query. */
  directAnswer: string;
  metrics: SnapshotMetric[];
  pricing?: YearPricing;
};

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function clampAnswer(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 80) return words.join(" ");
  return `${words.slice(0, 78).join(" ")}.`;
}

function recallLead(
  year: number,
  makeName: string,
  modelName: string,
  recalls: YearRecall[] | undefined,
  complaints: YearComplaintSummary | undefined,
): string {
  const n = recalls?.length ?? 0;
  const c = complaints?.total ?? 0;
  if (n === 0 && c === 0) {
    return `Our last NHTSA refresh shows no open recalls and no owner-complaint filings for the ${year} ${makeName} ${modelName}.`;
  }
  if (n === 0) {
    return `No NHTSA recalls are listed for the ${year} ${makeName} ${modelName} in our refresh, though owners have filed ${c} complaint${c === 1 ? "" : "s"} — check the component breakdown below.`;
  }
  const topRaw = recalls![0]?.component;
  const top = topRaw ? normalizeModelNames(topRaw) : undefined;
  return `The ${year} ${makeName} ${modelName} has ${n} NHTSA recall campaign${n === 1 ? "" : "s"} in our catalog${top ? ` (including ${top})` : ""}${c ? ` and ${c} owner complaint${c === 1 ? "" : "s"}` : ""}.`;
}

function yoyLead(diff: YearDiffResult | null | undefined, modelName: string): string {
  if (!diff) return "";
  if (diff.changes.length === 0 && diff.trimsAdded.length === 0 && diff.trimsRemoved.length === 0) {
    return ` Versus ${diff.previousYear}, our catalog shows no material spec or trim changes — the older ${modelName} is often the better used buy unless you need a ${diff.currentYear}-only fix.`;
  }
  const highlight = diff.changes[0];
  if (highlight) {
    return ` Versus ${diff.previousYear}, watch ${highlight.label.toLowerCase()} (${highlight.previous} → ${highlight.current}) when deciding if the newer year is worth the price jump.`;
  }
  return ` Versus ${diff.previousYear}, the trim lineup shifted — compare added and dropped trims before you pay up.`;
}

/**
 * “Data updated” stamp from the real NHTSA data pull — never `new Date()` and
 * never a hard-coded pricing month.
 * Order: this year's NHTSA fetch time → newest catalog-wide fetch time →
 * newest recall report date on the year. When none exist, `asOf` is "" and the
 * UI omits the stamp rather than inventing a date.
 */
export function resolveSnapshotAsOf(input: {
  year: Pick<YearEntry, "safetyStatus" | "recalls">;
  catalogFetchedAt?: string;
}): { asOf: string; asOfIso?: string; asOfLabel: string } {
  const label = "Data updated";
  const fetched = input.year.safetyStatus?.fetchedAt;
  if (fetched) {
    return {
      asOf: formatIsoDate(fetched),
      asOfIso: fetched.slice(0, 10),
      asOfLabel: label,
    };
  }
  if (input.catalogFetchedAt) {
    return {
      asOf: formatIsoDate(input.catalogFetchedAt),
      asOfIso: input.catalogFetchedAt.slice(0, 10),
      asOfLabel: label,
    };
  }
  const newestRecall = (input.year.recalls ?? [])
    .map((r) => r.date)
    .filter((d) => /^\d{4}-\d{2}-\d{2}/.test(d))
    .sort()
    .pop();
  if (newestRecall) {
    return {
      asOf: formatIsoDate(newestRecall),
      asOfIso: newestRecall.slice(0, 10),
      asOfLabel: "Newest recall report",
    };
  }
  return { asOf: "", asOfLabel: label };
}

/**
 * One methodology sentence that dates each dataset on its own terms:
 * NHTSA recalls/complaints by their fetch time, pricing by its own basis.
 */
export function snapshotMethodology(input: {
  pricing?: YearPricing;
  safetyFetchedAt?: string;
}): string {
  const safety = input.safetyFetchedAt
    ? `Recalls and complaints: NHTSA data fetched ${formatIsoDate(input.safetyFetchedAt)}.`
    : "Recalls and complaints: NHTSA data from our latest catalog refresh.";
  if (!input.pricing) return safety;
  const price =
    input.pricing.method === "listing-average"
      ? "Used asking from dealer listing samples; MSRP is curated base-trim starting price."
      : "Used asking is a labeled retention estimate from curated MSRP + vehicle age (not an appraisal).";
  return `${price} ${pricingDatasetLabel(input.pricing)}. ${safety}`;
}

export function buildYearSnapshot(input: {
  year: YearEntry;
  makeName: string;
  makeSlug: string;
  modelName: string;
  modelSlug: string;
  yearDiff?: YearDiffResult | null;
  now?: Date;
}): YearSnapshotData {
  const { year, makeName, makeSlug, modelName, modelSlug, yearDiff } = input;
  const pricing = getYearPricing(makeSlug, modelSlug, year.year, input.now);
  const asOfStamp = resolveSnapshotAsOf({
    year,
    catalogFetchedAt: getCatalogFetchedAt(),
  });
  const rating = year.specs?.overallRating;

  const metrics: SnapshotMetric[] = [];
  if (pricing) {
    metrics.push({
      label: "Est. used asking",
      value: formatUsd(pricing.usedAverage),
      hint: `${formatRetainedPct(pricing.retainedPct)} of MSRP`,
    });
    metrics.push({
      label: "Original MSRP",
      value: formatUsd(pricing.msrpBase),
      hint: "Base-trim starting price",
    });
  }
  metrics.push({
    label: "NHTSA recalls",
    value: String(year.recalls?.length ?? 0),
    hint:
      year.safetyStatus?.recalls === "error"
        ? "Fetch error — verify on NHTSA"
        : "Campaigns in last refresh",
  });
  if (year.complaints) {
    metrics.push({
      label: "Owner complaints",
      value: String(year.complaints.total),
      hint: year.complaints.byComponent[0]
        ? `Top: ${year.complaints.byComponent[0].component}`
        : "NHTSA filings",
    });
  }
  if (rating) {
    metrics.push({
      label: "NHTSA overall",
      value: `${rating}/5`,
      hint: "Crash-test overall",
    });
  }

  const priceLead = pricing
    ? `A used ${year.year} ${makeName} ${modelName} typically asks about ${formatUsd(pricing.usedAverage)} versus a ${formatUsd(pricing.msrpBase)} starting MSRP when new — roughly ${formatRetainedPct(pricing.retainedPct)} retained.`
    : `Use the valuation tools on this page to check live market pricing for a ${year.year} ${makeName} ${modelName}.`;

  let directAnswer = `${priceLead} ${recallLead(year.year, makeName, modelName, year.recalls, year.complaints)}${yoyLead(yearDiff, modelName)}`;
  directAnswer = clampAnswer(directAnswer);

  // Ensure we stay in the 40–80 word target when possible.
  if (wordCount(directAnswer) < 40 && pricing) {
    directAnswer = clampAnswer(
      `${directAnswer} Compare years below for recalls, year-over-year changes, and running-cost estimates before you buy.`,
    );
  }

  return {
    ...asOfStamp,
    methodology: snapshotMethodology({
      pricing,
      safetyFetchedAt: year.safetyStatus?.fetchedAt,
    }),
    directAnswer,
    metrics,
    pricing,
  };
}
