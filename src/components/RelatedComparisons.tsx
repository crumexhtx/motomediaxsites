import Link from "next/link";
import { comparisonsForModel } from "@/lib/comparisons";

type Props = {
  makeSlug: string;
  modelSlug: string;
  modelName: string;
};

/** Related A vs B links for model/year pages — crawlable server HTML. */
export function RelatedComparisons({
  makeSlug,
  modelSlug,
  modelName,
}: Props) {
  const related = comparisonsForModel(makeSlug, modelSlug);
  if (!related.length) return null;

  return (
    <section className="mb-12 max-w-3xl">
      <h2 className="font-display text-2xl tracking-tight">
        How does the {modelName} compare to rivals?
      </h2>
      <p className="mt-2 text-sm text-muted md:text-base">
        Side-by-side used-buyer numbers — MSRP vs asking, recalls, and running
        costs — for popular matchups.
      </p>
      <ul className="mt-4 space-y-2">
        {related.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/compare/${c.slug}`}
              className="focus-ring text-sm font-medium text-accent underline-offset-2 hover:underline"
            >
              {c.title}
            </Link>
            <span className="text-sm text-muted"> — {c.query}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-muted">
        <Link href="/compare" className="underline-offset-2 hover:underline">
          Browse all comparisons
        </Link>
      </p>
    </section>
  );
}
