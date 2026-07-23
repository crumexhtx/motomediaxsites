import Link from "next/link";
import type { YearDiffResult } from "@/lib/yearDiff";

type Props = {
  diff: YearDiffResult;
  previousHref: string;
  modelName: string;
};

function ToneMark({ tone }: { tone: YearDiffResult["changes"][number]["tone"] }) {
  if (tone === "up") return <span className="text-accent">↑</span>;
  if (tone === "down") return <span className="text-muted">↓</span>;
  return <span className="text-muted">→</span>;
}

export function YearChanges({ diff, previousHref, modelName }: Props) {
  const hasChanges =
    diff.changes.length > 0 ||
    diff.trimsAdded.length > 0 ||
    diff.trimsRemoved.length > 0;

  if (!hasChanges) {
    return (
      <section className="mb-12 max-w-3xl">
        <h2 className="font-display text-2xl tracking-tight">
          vs {diff.previousYear}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted md:text-lg">
          No material spec or trim lineup changes vs the {diff.previousYear}{" "}
          {modelName} in our catalog data.
        </p>
        <p className="mt-3 text-sm text-muted">
          <Link
            href={previousHref}
            className="underline-offset-2 hover:underline"
          >
            View {diff.previousYear} {modelName}
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section className="mb-12">
      <h2 className="font-display text-2xl tracking-tight">
        What changed vs {diff.previousYear}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted md:text-base">
        Spec and trim deltas from the prior model year — the fastest way to see
        if this {modelName} actually moved.
      </p>

      {diff.changes.length > 0 ? (
        <dl className="mt-5 max-w-2xl">
          {diff.changes.map((change) => (
            <div
              key={change.key}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line/60 py-2.5 text-sm last:border-0"
            >
              <dt className="text-muted">{change.label}</dt>
              <dd className="flex flex-wrap items-center gap-2 text-right font-medium tabular-nums">
                <span className="text-muted">{change.previous}</span>
                <ToneMark tone={change.tone} />
                <span>{change.current}</span>
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {diff.trimsAdded.length > 0 || diff.trimsRemoved.length > 0 ? (
        <div className="mt-6 max-w-2xl space-y-2 text-sm">
          {diff.trimsAdded.length > 0 ? (
            <p>
              <span className="text-muted">Trims added: </span>
              {diff.trimsAdded.join(", ")}
            </p>
          ) : null}
          {diff.trimsRemoved.length > 0 ? (
            <p>
              <span className="text-muted">Trims dropped: </span>
              {diff.trimsRemoved.join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="mt-4 text-sm text-muted">
        <Link
          href={previousHref}
          className="underline-offset-2 hover:underline"
        >
          Compare against {diff.previousYear} {modelName}
        </Link>
      </p>
    </section>
  );
}
