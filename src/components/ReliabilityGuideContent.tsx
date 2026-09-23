import Link from "next/link";
import type { ModelReliabilityGuide } from "@/lib/reliability";
import { RELIABILITY_RATING_LABELS } from "@/lib/reliability";

type Props = {
  makeSlug: string;
  modelSlug: string;
  makeName: string;
  modelName: string;
  guide: ModelReliabilityGuide;
  modelHref: string;
};

/**
 * Body of /makes/[make]/[model]/reliability.
 * Renders empty-state copy when arrays are still unfilled after publish.
 */
export function ReliabilityGuideContent({
  makeSlug,
  modelSlug,
  makeName,
  modelName,
  guide,
  modelHref,
}: Props) {
  const hasBest = guide.bestYears.length > 0;
  const hasAvoid = guide.yearsToAvoid.length > 0;
  const hasGens = guide.generations.length > 0;
  const hasTimeline = guide.timeline.length > 0;
  const hasSources = guide.sources.length > 0;
  const yearEntries = Object.entries(guide.byYear).sort(
    ([a], [b]) => Number(b) - Number(a),
  );

  return (
    <div className="mt-10 max-w-3xl space-y-12">
      <section>
        <h2 className="font-display text-2xl tracking-tight">
          Best years to buy
        </h2>
        {hasBest ? (
          <ul className="mt-4 space-y-3">
            {guide.bestYears.map((row) => (
              <li
                key={row.year}
                className="rounded-lg border border-line bg-elevated/40 px-4 py-3"
              >
                <p className="font-medium text-foreground">
                  <Link
                    href={`/makes/${makeSlug}/${modelSlug}/${row.year}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {row.year}
                  </Link>
                </p>
                <p className="mt-1 text-sm text-muted">{row.reason}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Best-year picks will appear here once verified against Consumer
            Reports, RepairPal, and NHTSA records.
          </p>
        )}
      </section>

      <section>
        <h2 className="font-display text-2xl tracking-tight">Years to avoid</h2>
        {hasAvoid ? (
          <ul className="mt-4 space-y-3">
            {guide.yearsToAvoid.map((row) => (
              <li
                key={`${row.yearsLabel}-${row.issue}`}
                className="rounded-lg border border-line bg-elevated/40 px-4 py-3"
              >
                <p className="font-medium text-foreground">
                  {row.yearsLabel}
                  {row.severity ? (
                    <span className="ml-2 text-xs font-normal uppercase tracking-[0.12em] text-muted">
                      {row.severity}
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-sm text-muted">{row.issue}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Problem years and named defects will be listed here after sourcing —
            we do not publish unsourced “years to avoid.”
          </p>
        )}
      </section>

      <section>
        <h2 className="font-display text-2xl tracking-tight">
          Common issues by generation
        </h2>
        {hasGens ? (
          <ul className="mt-4 space-y-6">
            {guide.generations.map((gen) => (
              <li key={gen.label}>
                <h3 className="font-display text-xl tracking-tight">
                  {gen.label}
                </h3>
                {gen.platformNotes ? (
                  <p className="mt-2 text-sm text-muted">{gen.platformNotes}</p>
                ) : null}
                {gen.commonIssues.length > 0 ? (
                  <ul className="mt-3 space-y-2 text-sm text-muted">
                    {gen.commonIssues.map((issue) => (
                      <li key={issue} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Generation-grouped issues will appear after platform years and
            defects are confirmed.
          </p>
        )}
      </section>

      <section>
        <h2 className="font-display text-2xl tracking-tight">
          What changed and when
        </h2>
        {hasTimeline ? (
          <ol className="mt-4 space-y-4 border-l border-line pl-4">
            {guide.timeline.map((event) => (
              <li key={`${event.when}-${event.detail}`}>
                <p className="text-xs uppercase tracking-[0.14em] text-muted">
                  {event.when}
                </p>
                <p className="mt-1 text-sm text-muted">{event.detail}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Redesigns, powertrain swaps, and notable TSBs will be listed here
            when verified.
          </p>
        )}
      </section>

      {yearEntries.length > 0 ? (
        <section>
          <h2 className="font-display text-2xl tracking-tight">
            Year-by-year ratings
          </h2>
          <ul className="mt-4 divide-y divide-line/70">
            {yearEntries.map(([year, glance]) => (
              <li
                key={year}
                className="flex flex-wrap items-baseline justify-between gap-2 py-3"
              >
                <p className="font-medium">{year}</p>
                <p className="text-sm text-accent">
                  {RELIABILITY_RATING_LABELS[glance.ratingTier]}
                </p>
                <p className="w-full text-sm text-muted">{glance.summary}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="font-display text-2xl tracking-tight">Sources</h2>
        {hasSources ? (
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {guide.sources.map((src) => (
              <li key={`${src.label}-${src.url ?? ""}`}>
                {src.url ? (
                  <a
                    href={src.url}
                    className="text-accent underline-offset-2 hover:underline"
                    rel="noreferrer"
                    target="_blank"
                  >
                    {src.label}
                  </a>
                ) : (
                  <span>{src.label}</span>
                )}
                {src.note ? ` — ${src.note}` : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Citations (Consumer Reports, RepairPal, NHTSA complaints/recalls,
            manufacturer TSBs) will be listed here per model once research is
            complete.
          </p>
        )}
        <p className="mt-4 text-xs text-muted">
          Browse {makeName} {modelName}{" "}
          <Link
            href={modelHref}
            className="underline-offset-2 hover:underline"
          >
            model years
          </Link>{" "}
          for NHTSA recalls and specs on each year page.
        </p>
      </section>
    </div>
  );
}
