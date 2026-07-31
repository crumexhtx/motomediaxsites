import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SITE } from "@/data/catalog";
import {
  buildComparisonPage,
  getAllComparisonParams,
  getComparison,
} from "@/lib/comparisons";
import { JsonLd, absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllComparisonParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = buildComparisonPage(slug);
  if (!page) return {};
  const title = `${page.def.title} — used buyer's comparison`;
  const description = page.summary.slice(0, 280);
  const path = `/compare/${page.def.slug}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: absoluteUrl(path),
    },
  };
}

export default async function ComparePairPage({ params }: Props) {
  const { slug } = await params;
  if (!getComparison(slug)) notFound();
  const page = buildComparisonPage(slug);
  if (!page) notFound();

  const path = `/compare/${page.def.slug}`;
  const { def, a, b, metrics, summary, asOf } = page;

  return (
    <div className="container-wide py-10 md:py-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Compare", path: "/compare" },
          { name: def.title, path },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: def.title,
          description: summary,
          url: absoluteUrl(path),
          isPartOf: {
            "@type": "WebSite",
            name: SITE.name,
            url: SITE.url,
          },
        }}
      />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Compare", href: "/compare" },
          { label: def.title },
        ]}
      />

      <header className="mt-6 max-w-3xl">
        <p className="text-xs uppercase tracking-[0.16em] text-muted">
          Comparison · As of {asOf}
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">
          {def.title}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-foreground md:text-lg">
          {summary}
        </p>
        <p className="mt-3 text-xs text-muted">
          Metrics use the same MSRP, retention/listing pricing, NHTSA safety
          enrich, and ownership-cost formulas as our year pages — not a VIN
          appraisal.
        </p>
      </header>

      <section className="mt-10">
        <h2 className="font-display text-2xl tracking-tight">
          How do the numbers compare?
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted md:text-base">
          Side-by-side snapshot for the newest year of each model in our
          catalog.
        </p>
        <div className="mt-5 overflow-x-auto rounded-lg border border-line">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-elevated/60 text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Metric</th>
                <th className="px-4 py-3 font-medium">
                  {a.year} {a.makeName} {a.modelName}
                </th>
                <th className="px-4 py-3 font-medium">
                  {b.year} {b.makeName} {b.modelName}
                </th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((row) => (
                <tr key={row.label} className="border-t border-line/70">
                  <th className="px-4 py-3 font-medium text-muted">
                    {row.label}
                  </th>
                  <td className="px-4 py-3 tabular-nums">{row.a}</td>
                  <td className="px-4 py-3 tabular-nums">{row.b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl tracking-tight">
            When should you pick the {a.modelName}?
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted">
            {def.pickA}
          </p>
        </div>
        <div>
          <h2 className="font-display text-2xl tracking-tight">
            When should you pick the {b.modelName}?
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted">
            {def.pickB}
          </p>
        </div>
      </section>

      <section className="mt-12 max-w-3xl">
        <h2 className="font-display text-2xl tracking-tight">
          What&apos;s the short verdict?
        </h2>
        <p className="mt-3 text-base leading-relaxed text-foreground md:text-lg">
          {def.verdict}
        </p>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl tracking-tight">
          Open the detailed year tools
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Jump into each model&apos;s newest year for the full snapshot,
          recalls, year-over-year changes, and live valuation CTA.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={a.href}
            className="focus-ring inline-flex items-center rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-[#071018] transition hover:brightness-110"
          >
            {a.year} {a.makeName} {a.modelName}
          </Link>
          <Link
            href={b.href}
            className="focus-ring inline-flex items-center rounded-md border border-line bg-elevated px-4 py-2.5 text-sm font-medium transition hover:border-accent/40"
          >
            {b.year} {b.makeName} {b.modelName}
          </Link>
          <Link
            href={a.modelHref}
            className="focus-ring inline-flex items-center rounded-md border border-line px-4 py-2.5 text-sm text-muted transition hover:text-foreground"
          >
            All {a.modelName} years
          </Link>
          <Link
            href={b.modelHref}
            className="focus-ring inline-flex items-center rounded-md border border-line px-4 py-2.5 text-sm text-muted transition hover:text-foreground"
          >
            All {b.modelName} years
          </Link>
        </div>
      </section>
    </div>
  );
}
