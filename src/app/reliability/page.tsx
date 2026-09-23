import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SITE } from "@/data/catalog";
import { getPublishedReliabilityGuides } from "@/lib/reliability";
import { JsonLd, absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";

const TITLE = "Used car reliability guides";
const DESCRIPTION = `Best years to buy, years to avoid, and common problems by model — sourced reliability guides on ${SITE.name}.`;

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
          Best years to buy, years to avoid, and common issues by generation —
          for models we have researched and sourced. Pair these with NHTSA
          recalls on each year page before you buy used.
        </p>
      </header>

      {guides.length === 0 ? (
        <p className="mt-10 max-w-2xl text-muted">
          No reliability guides are published yet. Guides appear here after
          claims are verified against Consumer Reports, RepairPal, NHTSA, and
          manufacturer TSBs — we do not publish placeholder ratings.
        </p>
      ) : (
        <ul className="mt-10 grid gap-4 md:grid-cols-2">
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
    </div>
  );
}
