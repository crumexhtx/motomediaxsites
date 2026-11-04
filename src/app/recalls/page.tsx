import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ExpandableList, ExpandableText } from "@/components/ExpandableText";
import { SITE } from "@/data/catalog";
import { getRecallTotals, getRecentRecalls } from "@/lib/catalog";
import { JsonLd, breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { formatIsoDate, formatYearRanges } from "@/lib/text";

export const metadata: Metadata = buildMetadata({
  title: "Recent recalls",
  description: `Browse the latest NHTSA recall campaigns across ${SITE.name} model years — affected models and years, components, and links to the year pages.`,
  path: "/recalls",
});

const SHOWN = 40;

export default function RecentRecallsPage() {
  const recalls = getRecentRecalls(SHOWN);
  const totals = getRecallTotals();

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
          Latest NHTSA recall campaigns in our catalog, newest first. Each
          campaign is listed once with every model and year it affects. Open a
          year page for the full used-buyer checklist — complaints,
          year-over-year changes, and specs.
        </p>
        {totals.uniqueCampaigns > 0 ? (
          <p className="mt-3 text-sm text-muted">
            Showing{" "}
            <span className="font-medium text-foreground">
              {Math.min(SHOWN, totals.uniqueCampaigns)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-foreground">
              {totals.uniqueCampaigns}
            </span>{" "}
            unique recall campaigns in the catalog. Dates are the NHTSA report
            date.
          </p>
        ) : null}
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
            <li key={r.campaignNumber} className="py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="font-medium text-foreground">{r.component}</p>
                <p className="text-xs tabular-nums text-muted">
                  NHTSA report date{" "}
                  <time dateTime={r.date}>{formatIsoDate(r.date)}</time>
                </p>
              </div>
              <ExpandableList
                className="mt-2 space-y-1 text-sm"
                noun="models"
                initial={4}
                items={r.affected.map((a) => (
                  <p key={a.href}>
                    <Link
                      href={a.href}
                      className="text-foreground underline-offset-2 hover:underline"
                    >
                      {a.makeName} {a.modelName}
                    </Link>{" "}
                    <span className="text-muted">
                      · {formatYearRanges(a.years)}
                    </span>
                  </p>
                ))}
              />
              <ExpandableText
                text={r.summary}
                className="mt-2 text-sm leading-relaxed text-muted"
              />
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
