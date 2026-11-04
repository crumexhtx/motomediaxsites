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
 * “As of” stamp from the real data pull — never `new Date()`.
 * Order: this year's NHTSA fetch time → newest catalog-wide fetch time →
 * newest recall report date on the year → pricing-estimate month.
 */
export function resolveSnapshotAsOf(input: {
  year: Pick<YearEntry, "safetyStatus" | "recalls">;
  catalogFetchedAt?: string;
  pricingAsOf?: string;
}): { asOf: string; asOfIso?: string; asOfLabel: string } {
  const label = "Safety data as of";
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
  const month = input.pricingAsOf?.match(/^(\d{4})-(\d{2})$/);
  if (month) {
    return {
      asOf: formatIsoDate(`${month[1]}-${month[2]}-01`).replace(" 1,", ""),
      asOfIso: input.pricingAsOf,
      asOfLabel: "Pricing estimate as of",
    };
  }
  return { asOf: "last catalog refresh", asOfLabel: "Data from" };
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
    pricingAsOf: pricing?.asOf,
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
    methodology:
      pricing?.method === "listing-average"
        ? "Used asking from dealer listing samples; MSRP is curated base-trim starting price. Recalls/complaints from NHTSA offline enrich."
        : "Used asking is a labeled retention estimate from curated MSRP + vehicle age (not an appraisal). Recalls/complaints from NHTSA offline enrich.",
    directAnswer,
    metrics,
    pricing,
  };
}
