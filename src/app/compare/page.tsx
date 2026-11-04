import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SITE } from "@/data/catalog";
import { getAllComparisons, buildComparisonPage } from "@/lib/comparisons";
import { formatUsd } from "@/lib/pricing";
import { JsonLd, breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Used car comparisons",
  description: `Side-by-side used car comparisons on ${SITE.name}: original MSRP vs typical used asking price, NHTSA recalls, and estimated running costs.`,
  path: "/compare",
});

export default function CompareIndexPage() {
  const pairs = getAllComparisons()
    .map((def) => buildComparisonPage(def.slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <div className="container-wide py-10 md:py-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Compare", path: "/compare" },
        ])}
      />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Compare" },
        ]}
      />
      <header className="mt-6 max-w-3xl">
        <h1 className="font-display text-4xl tracking-tight md:text-5xl">
          Used car comparisons
        </h1>
        <p className="mt-3 text-muted md:text-lg">
          High-intent A vs B matchups using the same proprietary numbers as our
          year pages — estimated used asking vs MSRP, NHTSA recalls, complaints,
          and running-cost estimates.
        </p>
      </header>

      <ul className="mt-10 grid gap-4 md:grid-cols-2">
        {pairs.map((page) => (
          <li key={page.def.slug}>
            <Link
              href={`/compare/${page.def.slug}`}
              className="focus-ring block rounded-lg border border-line bg-elevated/40 px-5 py-5 transition hover:border-accent/40"
            >
              <p className="font-display text-xl tracking-tight">
                {page.def.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {page.def.query}
              </p>
              <p className="mt-3 text-xs tabular-nums text-muted">
                {page.a.year} {page.a.modelName}
                {page.a.pricing
                  ? ` · ${formatUsd(page.a.pricing.usedAverage)}`
                  : ""}{" "}
                vs {page.b.year} {page.b.modelName}
                {page.b.pricing
                  ? ` · ${formatUsd(page.b.pricing.usedAverage)}`
                  : ""}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
