import type { SnapshotMetric, YearSnapshotData } from "@/lib/yearSnapshot";

type Props = {
  snapshot: YearSnapshotData;
  yearLabel: string;
  makeName: string;
  modelName: string;
};

function Metric({ metric }: { metric: SnapshotMetric }) {
  return (
    <div className="min-w-0 border-b border-line/60 pb-3 last:border-0 sm:border-b-0 sm:pb-0">
      <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted">
        {metric.label}
      </p>
      <p className="mt-1 font-display text-xl tracking-tight tabular-nums md:text-2xl">
        {metric.value}
      </p>
      {metric.hint ? (
        <p className="mt-1 text-xs text-muted">{metric.hint}</p>
      ) : null}
    </div>
  );
}

/**
 * Crawlable, server-rendered planning snapshot for AI Overviews and scanners.
 * No client JS required — plain HTML in the prerendered year page.
 */
export function YearSnapshot({
  snapshot,
  yearLabel,
  makeName,
  modelName,
}: Props) {
  return (
    <section
      className="mb-12 rounded-lg border border-accent/35 bg-elevated/50 px-5 py-5 md:px-6 md:py-6"
      aria-labelledby="year-snapshot-heading"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="year-snapshot-heading"
          className="font-display text-xl tracking-tight md:text-2xl"
        >
          {yearLabel} {makeName} {modelName} snapshot
        </h2>
        <p className="text-xs uppercase tracking-[0.14em] text-muted">
          As of {snapshot.asOf}
        </p>
      </div>

      <p className="mt-3 max-w-3xl text-base leading-relaxed text-foreground md:text-lg">
        {snapshot.directAnswer}
      </p>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {snapshot.metrics.map((metric) => (
          <div key={metric.label}>
            <dt className="sr-only">{metric.label}</dt>
            <dd>
              <Metric metric={metric} />
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-xs leading-relaxed text-muted">
        Methodology: {snapshot.methodology}
      </p>
    </section>
  );
}
