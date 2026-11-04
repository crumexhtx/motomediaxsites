/**
 * Data-only year-vs-year helpers for the model hub "Best used year" table and
 * the year-page "Compared with other years" block.
 *
 * Nothing here is invented: every number comes from the catalog (NHTSA recall /
 * complaint counts, EPA combined MPG) or from `getYearPricing` (labeled
 * retention estimate or listing average). Missing data stays `null`.
 */
import type { YearEntry } from "@/data/catalog";
import { getYearPricing } from "@/lib/pricing";
import { diffYears } from "@/lib/yearDiff";

export type YearMetricsRow = {
  year: number;
  slug: string;
  /** NHTSA recall campaigns on record; null when the fetch failed / unknown. */
  recalls: number | null;
  /** NHTSA owner complaints on record; null when unknown. */
  complaints: number | null;
  /** Estimated (or listing-average) used asking price in USD. */
  usedPrice: number | null;
  /** Combined MPG from EPA enrichment, if present. */
  mpgCombined: number | null;
  /** (recalls + complaints) per $10,000 of est. used price; null if incomplete. */
  issuesPer10k: number | null;
};

export type YearHubRow = YearMetricsRow & {
  /** Short, data-derived list of changes vs the previous model year. */
  changes: string[];
  /** True when this year has the fewest recalls + complaints per dollar. */
  highlight: boolean;
};

export function recallCount(year: YearEntry): number | null {
  if (year.safetyStatus?.recalls === "error") return null;
  if (year.recalls) return year.recalls.length;
  if (year.safetyStatus?.recalls === "empty") return 0;
  return null;
}

export function complaintCount(year: YearEntry): number | null {
  if (year.safetyStatus?.complaints === "error") return null;
  if (year.complaints) return year.complaints.total;
  if (year.safetyStatus?.complaints === "empty") return 0;
  return null;
}

export function yearMetrics(
  makeSlug: string,
  modelSlug: string,
  year: YearEntry,
  now?: Date,
): YearMetricsRow {
  const recalls = recallCount(year);
  const complaints = complaintCount(year);
  const pricing = getYearPricing(makeSlug, modelSlug, year.year, now);
  const usedPrice = pricing?.usedAverage ?? null;
  const mpg = year.specs?.mpgCombined;
  const issuesPer10k =
    recalls != null && complaints != null && usedPrice != null && usedPrice > 0
      ? ((recalls + complaints) / usedPrice) * 10_000
      : null;
  return {
    year: year.year,
    slug: year.slug,
    recalls,
    complaints,
    usedPrice,
    mpgCombined: typeof mpg === "number" && mpg > 0 ? mpg : null,
    issuesPer10k,
  };
}

/**
 * Years with the lowest (recalls + complaints) per dollar of est. used price.
 * Returns no highlight when fewer than two years are comparable or when every
 * comparable year ties (nothing to single out).
 */
export function pickFewestIssuesPerDollar(
  rows: Pick<YearMetricsRow, "year" | "issuesPer10k">[],
): Set<number> {
  const eligible = rows.filter(
    (r): r is { year: number; issuesPer10k: number } => r.issuesPer10k != null,
  );
  if (eligible.length < 2) return new Set();
  const min = Math.min(...eligible.map((r) => r.issuesPer10k));
  const winners = eligible.filter((r) => Math.abs(r.issuesPer10k - min) < 1e-9);
  if (winners.length === eligible.length) return new Set();
  return new Set(winners.map((r) => r.year));
}

/** Compact, data-only change labels between consecutive model years. */
export function summarizeChangesVsPrevious(
  previous: YearEntry | undefined,
  current: YearEntry,
  max = 3,
): string[] {
  if (!previous) return [];
  const diff = diffYears(previous, current);
  const items = diff.changes.map(
    (c) => `${c.label}: ${c.previous} → ${c.current}`,
  );
  if (diff.trimsAdded.length > 0) {
    items.push(`Trims added: ${diff.trimsAdded.join(", ")}`);
  }
  if (diff.trimsRemoved.length > 0) {
    items.push(`Trims dropped: ${diff.trimsRemoved.join(", ")}`);
  }
  if (items.length <= max) return items;
  return [...items.slice(0, max), `+${items.length - max} more`];
}

/** Rows (newest first) for the model hub "Best used year" table. */
export function buildModelYearTable(
  makeSlug: string,
  modelSlug: string,
  years: YearEntry[],
  now?: Date,
): YearHubRow[] {
  const sorted = [...years].sort((a, b) => b.year - a.year);
  const metrics = sorted.map((y) => yearMetrics(makeSlug, modelSlug, y, now));
  const winners = pickFewestIssuesPerDollar(metrics);
  return sorted.map((y, i) => {
    // Nearest earlier year in the catalog (list is newest-first).
    const previous = sorted[i + 1];
    return {
      ...metrics[i]!,
      changes: summarizeChangesVsPrevious(previous, y),
      highlight: winners.has(y.year),
    };
  });
}

export type SiblingYearRow = YearMetricsRow & {
  recallsDelta: number | null;
  complaintsDelta: number | null;
  priceDelta: number | null;
};

export type YearSiblingComparison = {
  current: YearMetricsRow;
  siblings: SiblingYearRow[];
  /** Min/max across the other years, for the data-only lead sentence. */
  ranges: {
    recalls: [number, number] | null;
    complaints: [number, number] | null;
    price: [number, number] | null;
  };
};

function range(values: Array<number | null>): [number, number] | null {
  const nums = values.filter((v): v is number => v != null);
  if (!nums.length) return null;
  return [Math.min(...nums), Math.max(...nums)];
}

/**
 * Compare one year against its siblings (nearest model years first, capped).
 * Deltas are sibling minus this year.
 */
export function buildYearSiblingComparison(
  makeSlug: string,
  modelSlug: string,
  years: YearEntry[],
  currentYear: number,
  opts: { limit?: number; now?: Date } = {},
): YearSiblingComparison | null {
  const { limit = 12, now } = opts;
  const currentEntry = years.find((y) => y.year === currentYear);
  if (!currentEntry) return null;
  const others = years.filter((y) => y.year !== currentYear);
  if (!others.length) return null;

  const current = yearMetrics(makeSlug, modelSlug, currentEntry, now);
  const delta = (a: number | null, b: number | null) =>
    a != null && b != null ? a - b : null;

  const all = others.map((y) => yearMetrics(makeSlug, modelSlug, y, now));
  const siblings = [...all]
    .sort(
      (a, b) =>
        Math.abs(a.year - currentYear) - Math.abs(b.year - currentYear) ||
        b.year - a.year,
    )
    .slice(0, limit)
    .sort((a, b) => b.year - a.year)
    .map((s) => ({
      ...s,
      recallsDelta: delta(s.recalls, current.recalls),
      complaintsDelta: delta(s.complaints, current.complaints),
      priceDelta: delta(s.usedPrice, current.usedPrice),
    }));

  return {
    current,
    siblings,
    ranges: {
      recalls: range(all.map((s) => s.recalls)),
      complaints: range(all.map((s) => s.complaints)),
      price: range(all.map((s) => s.usedPrice)),
    },
  };
}
