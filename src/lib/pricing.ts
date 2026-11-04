/**
 * Year-page pricing: original MSRP vs typical used asking.
 *
 * MSRP comes from curated published starting prices (msrp-seed.json).
 * Used averages prefer Auto.dev listing samples when enriched into
 * pricing-overrides.json; otherwise we show a transparent retention
 * estimate derived from MSRP + vehicle age — never presented as an
 * appraisal.
 */
import msrpSeed from "@/data/msrp-seed.json";
import pricingOverrides from "@/data/pricing-overrides.json";
import { formatIsoDate } from "@/lib/text";

export type PricingMethod = "listing-average" | "retention-estimate";

export type YearPricing = {
  year: number;
  makeSlug: string;
  modelSlug: string;
  /** Published starting (base-trim) MSRP in USD when new. */
  msrpBase: number;
  /** Typical used market asking in USD. */
  usedAverage: number;
  /** usedAverage / msrpBase */
  retainedPct: number;
  /** msrpBase - usedAverage (how much value typically shed). */
  depreciationUsd: number;
  method: PricingMethod;
  /** Listing sample size when method is listing-average. */
  sampleSize?: number;
  /**
   * Real date of the listing sample ("YYYY-MM" or "YYYY-MM-DD"). Only set for
   * `listing-average`; retention estimates have no market-data date.
   */
  asOf?: string;
  /** Calendar year whose vehicle age drove a retention estimate. */
  estimateYear: number;
  msrpNote: string;
  usedNote: string;
};

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "2026-07" → "Jul 2026"; "2026-07-10" → "Jul 10, 2026". */
function formatPricingDate(asOf: string): string {
  const month = asOf.match(/^(\d{4})-(\d{2})$/);
  if (month) {
    const name = MONTH_NAMES[Number(month[2]) - 1];
    return name ? `${name} ${month[1]}` : asOf;
  }
  return formatIsoDate(asOf);
}

/**
 * Dataset label for the pricing numbers, dated on its own terms (never the
 * NHTSA fetch date): the listing sample date, or the retention-curve basis.
 */
export function pricingDatasetLabel(pricing: YearPricing): string {
  if (pricing.method === "listing-average") {
    return pricing.asOf
      ? `Listing sample as of ${formatPricingDate(pricing.asOf)}`
      : "Based on a recent dealer listing sample";
  }
  return `Estimate based on ${pricing.estimateYear} vehicle age, not a dated market quote`;
}

type MsrpSeedEntry = {
  /** USD starting MSRP by model year (string keys). */
  byYear: Record<string, number>;
};

type OverrideEntry = {
  usedAverage: number;
  sampleSize?: number;
  asOf?: string;
  source?: string;
};

const SEED = msrpSeed as Record<string, MsrpSeedEntry>;
const OVERRIDES = pricingOverrides as Record<string, OverrideEntry>;

/** Calendar year used for age / retention estimates. */
export function pricingAsOfYear(now = new Date()): number {
  return now.getUTCFullYear();
}

/**
 * Typical retail asking as a fraction of original MSRP by vehicle age.
 * Rough U.S. mass-market pattern — not brand-specific and not an appraisal.
 */
export function retentionRate(ageYears: number): number {
  const age = Math.max(0, Math.floor(ageYears));
  const table = [
    0.94, // current MY / nearly new
    0.8, // 1
    0.7, // 2
    0.6, // 3
    0.52, // 4
    0.45, // 5
    0.39, // 6
    0.34, // 7
    0.3, // 8
    0.26, // 9
    0.23, // 10
  ];
  if (age < table.length) return table[age]!;
  // Slow fade after 10 years; floor at 12% of MSRP.
  return Math.max(0.12, 0.23 * Math.pow(0.92, age - 10));
}

function key(makeSlug: string, modelSlug: string, year: number): string {
  return `${makeSlug.toLowerCase()}/${modelSlug.toLowerCase()}/${year}`;
}

function modelKey(makeSlug: string, modelSlug: string): string {
  return `${makeSlug.toLowerCase()}/${modelSlug.toLowerCase()}`;
}

export function getMsrpBase(
  makeSlug: string,
  modelSlug: string,
  year: number,
): number | undefined {
  const entry = SEED[modelKey(makeSlug, modelSlug)];
  if (!entry?.byYear) return undefined;
  const exact = entry.byYear[String(year)];
  if (typeof exact === "number" && exact > 0) return Math.round(exact);

  // Nearest published year (prefer older, then newer).
  const years = Object.keys(entry.byYear)
    .map(Number)
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => a - b);
  if (!years.length) return undefined;
  let best = years[0]!;
  let bestDist = Math.abs(best - year);
  for (const y of years) {
    const d = Math.abs(y - year);
    if (d < bestDist || (d === bestDist && y < best)) {
      best = y;
      bestDist = d;
    }
  }
  const base = entry.byYear[String(best)];
  if (typeof base !== "number" || base <= 0) return undefined;
  // ~2.5% MSRP drift per year when interpolating from a nearby published year.
  const adjusted = base * Math.pow(1.025, year - best);
  return Math.round(adjusted / 100) * 100;
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatRetainedPct(retainedPct: number): string {
  return `${Math.round(retainedPct * 100)}%`;
}

export function getYearPricing(
  makeSlug: string,
  modelSlug: string,
  year: number,
  now = new Date(),
): YearPricing | undefined {
  const msrpBase = getMsrpBase(makeSlug, modelSlug, year);
  if (msrpBase == null) return undefined;

  const asOfYear = pricingAsOfYear(now);
  const override = OVERRIDES[key(makeSlug, modelSlug, year)];

  if (override?.usedAverage && override.usedAverage > 0) {
    const usedAverage = Math.round(override.usedAverage);
    return {
      year,
      makeSlug,
      modelSlug,
      msrpBase,
      usedAverage,
      retainedPct: usedAverage / msrpBase,
      depreciationUsd: Math.max(0, msrpBase - usedAverage),
      method: "listing-average",
      sampleSize: override.sampleSize,
      asOf: override.asOf,
      estimateYear: asOfYear,
      msrpNote: "Published starting (base-trim) MSRP when new.",
      usedNote: override.source
        ? `Average dealer asking from ${override.source} listings.`
        : "Average dealer asking from recent used listings.",
    };
  }

  const age = asOfYear - year;
  const rate = retentionRate(age);
  const usedAverage = Math.round((msrpBase * rate) / 100) * 100;

  return {
    year,
    makeSlug,
    modelSlug,
    msrpBase,
    usedAverage,
    retainedPct: usedAverage / msrpBase,
    depreciationUsd: Math.max(0, msrpBase - usedAverage),
    method: "retention-estimate",
    estimateYear: asOfYear,
    msrpNote: "Published starting (base-trim) MSRP when new.",
    usedNote:
      "Estimated typical used asking from a mass-market retention curve — not a live appraisal or guaranteed sale price.",
  };
}
