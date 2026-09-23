/**
 * Model reliability guides (best years, years to avoid, generation issues).
 *
 * Data: src/data/reliability-guides.json keyed as `makeSlug/modelSlug`.
 * Set `published: true` only after verifying claims against CR / RepairPal /
 * NHTSA / TSBs — never invent reliability ratings in code or empty scaffolds.
 */
import guides from "@/data/reliability-guides.json";
import { getModel } from "@/lib/catalog";

export type ReliabilityRatingTier =
  | "excellent"
  | "good"
  | "average"
  | "below-average";

export type ReliabilityBestYear = {
  /** Model year, e.g. 2024 */
  year: number;
  /** One-line reason — leave empty until sourced. */
  reason: string;
};

export type ReliabilityYearToAvoid = {
  /**
   * Display label for the problem window, e.g. "2018–2020" or "2019".
   * Keep human-readable; do not invent year ranges.
   */
  yearsLabel: string;
  /** Named defect / failure mode — must be sourced before publish. */
  issue: string;
  severity?: "high" | "moderate" | "low";
};

export type ReliabilityGeneration = {
  /** e.g. "2nd gen (2024–)" */
  label: string;
  /** Inclusive year span for grouping, when known. */
  yearsFrom?: number;
  yearsTo?: number | null;
  commonIssues: string[];
  platformNotes?: string;
};

export type ReliabilityTimelineEvent = {
  /** Year or year-span label, e.g. "2024" or "2017–2022" */
  when: string;
  /** Redesign, powertrain change, or notable TSB — sourced only. */
  detail: string;
};

export type ReliabilitySource = {
  label: string;
  url?: string;
  note?: string;
};

export type ReliabilityYearGlance = {
  ratingTier: ReliabilityRatingTier;
  /** 1–2 sentences for the year page card. */
  summary: string;
};

export type ReliabilityFaq = {
  question: string;
  answer: string;
};

export type ModelReliabilityGuide = {
  /** Hub + guide routes only when true. */
  published: boolean;
  updatedAt?: string | null;
  bestYears: ReliabilityBestYear[];
  yearsToAvoid: ReliabilityYearToAvoid[];
  generations: ReliabilityGeneration[];
  timeline: ReliabilityTimelineEvent[];
  sources: ReliabilitySource[];
  /** Per-year “at a glance” cards on year pages. */
  byYear: Record<string, ReliabilityYearGlance>;
  faqs?: ReliabilityFaq[];
};

const BY_KEY = guides as Record<string, ModelReliabilityGuide>;

export const RELIABILITY_RATING_LABELS: Record<ReliabilityRatingTier, string> =
  {
    excellent: "Excellent",
    good: "Good",
    average: "Average",
    "below-average": "Below average",
  };

function key(makeSlug: string, modelSlug: string) {
  return `${makeSlug.toLowerCase()}/${modelSlug.toLowerCase()}`;
}

export function reliabilityGuideHref(makeSlug: string, modelSlug: string) {
  return `/makes/${makeSlug}/${modelSlug}/reliability`;
}

export function getReliabilityGuide(
  makeSlug: string,
  modelSlug: string,
): ModelReliabilityGuide | undefined {
  return BY_KEY[key(makeSlug, modelSlug)];
}

/** Published guides only — used by hub + static params. */
export function getPublishedReliabilityGuides(): Array<{
  makeSlug: string;
  modelSlug: string;
  guide: ModelReliabilityGuide;
  makeName: string;
  modelName: string;
  href: string;
}> {
  const out: Array<{
    makeSlug: string;
    modelSlug: string;
    guide: ModelReliabilityGuide;
    makeName: string;
    modelName: string;
    href: string;
  }> = [];

  for (const [k, guide] of Object.entries(BY_KEY)) {
    if (!guide?.published) continue;
    const [makeSlug, modelSlug] = k.split("/");
    if (!makeSlug || !modelSlug) continue;
    const found = getModel(makeSlug, modelSlug);
    if (!found) continue;
    out.push({
      makeSlug,
      modelSlug,
      guide,
      makeName: found.make.name,
      modelName: found.model.name,
      href: reliabilityGuideHref(makeSlug, modelSlug),
    });
  }

  return out.sort(
    (a, b) =>
      a.makeName.localeCompare(b.makeName) ||
      a.modelName.localeCompare(b.modelName),
  );
}

export function getAllReliabilityGuideParams(): Array<{
  make: string;
  model: string;
}> {
  return getPublishedReliabilityGuides().map((g) => ({
    make: g.makeSlug,
    model: g.modelSlug,
  }));
}

/**
 * Year-page glance data. Returns null when unpublished or this year has no
 * filled `byYear` entry — so empty scaffolds never invent a rating.
 */
export function getYearReliabilityGlance(
  makeSlug: string,
  modelSlug: string,
  year: number,
): (ReliabilityYearGlance & { guideHref: string }) | null {
  const guide = getReliabilityGuide(makeSlug, modelSlug);
  if (!guide?.published) return null;
  const entry = guide.byYear[String(year)];
  if (!entry?.ratingTier || !entry.summary?.trim()) return null;
  return {
    ...entry,
    guideHref: reliabilityGuideHref(makeSlug, modelSlug),
  };
}
