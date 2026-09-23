import type { Metadata } from "next";
import Link from "next/link";
import { BrandReliabilityRanking } from "@/components/BrandReliabilityRanking";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SITE } from "@/data/catalog";
import { getPublishedReliabilityGuides } from "@/lib/reliability";
import { JsonLd, absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";

const TITLE = "Most reliable car brands & model guides";
const DESCRIPTION = `Most to least reliable brands from Consumer Reports, J.D. Power, and CarGurus — plus model-year reliability guides on ${SITE.name}.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/reliability" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/reliability"),
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function ReliabilityHubPage() {
  const guides = getPublishedReliabilityGuides();

  return (
    <div className="container-wide py-10 md:py-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Reliability", path: "/reliability" },
        ])}
      />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Reliability" },
        ]}
      />
      <header className="mt-6 max-w-3xl">
        <h1 className="font-display text-4xl tracking-tight md:text-5xl">
          Reliability guides
        </h1>
        <p className="mt-3 text-muted md:text-lg">
          Brand rankings from published surveys, plus best years / years to
          avoid guides for models we have researched and sourced. Pair these
          with NHTSA recalls on each year page before you buy used.
        </p>
      </header>

      <BrandReliabilityRanking />

      <section className="mt-14 max-w-3xl">
        <h2 className="font-display text-2xl tracking-tight md:text-3xl">
          Model reliability guides
        </h2>
        {guides.length === 0 ? (
          <p className="mt-4 text-muted">
            No model guides are published yet. Guides appear here after claims
            are verified against Consumer Reports, RepairPal, NHTSA, and
            manufacturer TSBs — we do not publish placeholder ratings.
          </p>
        ) : (
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {guides.map((g) => (
              <li key={g.href}>
                <Link
                  href={g.href}
                  className="focus-ring block rounded-lg border border-line bg-elevated/40 px-5 py-5 transition hover:border-accent/40"
                >
                  <p className="font-display text-xl tracking-tight">
                    {g.makeName} {g.modelName}
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    Years to avoid, best years, and common problems
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
