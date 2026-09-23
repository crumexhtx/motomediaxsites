import Link from "next/link";
import {
  RELIABILITY_RATING_LABELS,
  type ReliabilityRatingTier,
} from "@/lib/reliability";

type Props = {
  yearLabel: string;
  makeName: string;
  modelName: string;
  ratingTier: ReliabilityRatingTier;
  summary: string;
  guideHref: string;
};

/**
 * Compact year-page module. Only mount when `getYearReliabilityGlance` returns
 * sourced data — never invent a tier or summary in the UI.
 */
export function ReliabilityAtAGlance({
  yearLabel,
  makeName,
  modelName,
  ratingTier,
  summary,
  guideHref,
}: Props) {
  const label = RELIABILITY_RATING_LABELS[ratingTier];

  return (
    <section className="mb-12 max-w-3xl rounded-lg border border-line bg-elevated/40 px-5 py-5 md:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl tracking-tight md:text-2xl">
          Reliability at a glance
        </h2>
        <p className="text-sm font-medium text-accent">{label}</p>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted md:text-base">
        {yearLabel} {makeName} {modelName}: {summary}
      </p>
      <Link
        href={guideHref}
        className="focus-ring mt-4 inline-flex text-sm font-medium text-accent underline-offset-2 hover:underline"
      >
        Full {modelName} reliability guide
      </Link>
      <p className="mt-3 text-xs text-muted">
        Sourced used-buyer notes — not a repair quote or inspection. Cross-check
        NHTSA recalls on this page and the full guide before you buy.
      </p>
    </section>
  );
}
