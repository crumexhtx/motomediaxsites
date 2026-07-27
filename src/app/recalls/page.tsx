import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SITE } from "@/data/catalog";
import { getRecentRecalls } from "@/lib/catalog";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Recent recalls",
  description: `Browse the latest NHTSA recalls across ${SITE.name} model years — campaign numbers, affected components, and links to the year pages.`,
  alternates: { canonical: "/recalls" },
};

export default function RecentRecallsPage() {
  const recalls = getRecentRecalls(40);

  return (
    <div className="container-wide py-10 md:py-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Recent recalls", path: "/recalls" },
        ])}
      />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Recent recalls" },
        ]}
      />
      <header className="mt-6 max-w-3xl">
        <h1 className="font-display text-4xl tracking-tight md:text-5xl">
          Recent recalls
        </h1>
        <p className="mt-3 text-muted md:text-lg">
          Latest NHTSA campaigns in our catalog, newest first. Open a year page
          for the full used-buyer checklist — complaints, year-over-year
          changes, and specs.
        </p>
      </header>

      {recalls.length === 0 ? (
        <p className="mt-10 text-muted">
          No recall rows are loaded yet. Run{" "}
          <code className="text-foreground">pnpm enrich:nhtsa-recalls</code> to
          refresh catalog safety data.
        </p>
      ) : (
        <ul className="mt-10 max-w-3xl divide-y divide-line/70">
          {recalls.map((r) => (
            <li key={`${r.campaignNumber}-${r.href}`} className="py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="font-medium text-foreground">
                  <Link
                    href={r.href}
                    className="underline-offset-2 hover:underline"
                  >
                    {r.year} {r.makeName} {r.modelName}
                  </Link>
                </p>
                <p className="text-xs tabular-nums text-muted">{r.date}</p>
              </div>
              <p className="mt-1 text-sm text-muted">{r.component}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {r.summary}
              </p>
              <p className="mt-2 text-xs text-muted">
                Campaign{" "}
                <a
                  href={`https://www.nhtsa.gov/recalls?nhtsaId=${encodeURIComponent(r.campaignNumber)}`}
                  className="underline-offset-2 hover:underline"
                  rel="noreferrer"
                  target="_blank"
                >
                  {r.campaignNumber}
                </a>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
