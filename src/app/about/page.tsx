import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SITE } from "@/data/catalog";
import { getCatalogFetchedAt } from "@/lib/catalog";
import { JsonLd, breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { formatIsoDate } from "@/lib/text";

export const metadata: Metadata = buildMetadata({
  title: "About",
  description: `${SITE.name} is a used-car model-year research site using NHTSA recalls and complaints data. Includes the owner's own Houston Turo rentals.`,
  path: "/about",
});

/**
 * Set to a real inbox before launch (then render a mailto: link).
 * Intentionally NOT pulled from git config or any other source.
 * Leave null to hide the address until you supply one.
 */
const CORRECTIONS_EMAIL: string | null = "curimexhtx@gmail.com";

const h2 = "font-display text-2xl tracking-tight";
const p = "mt-3 leading-relaxed text-muted";

export default function AboutPage() {
  const fetchedAt = getCatalogFetchedAt();

  return (
    <div className="container-wide py-10 md:py-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ])}
      />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "About" },
        ]}
      />
      <article className="prose-like mt-6 max-w-2xl">
        <h1 className="font-display text-4xl tracking-tight md:text-5xl">
          About {SITE.name}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          {SITE.name} is a used-car research site built around the model year.
          Pick a make, model, and year to see recalls, owner complaints, what
          changed from the year before, and the specs we have — so you can
          decide which year is actually worth buying.
        </p>

        <section className="mt-10">
          <h2 className={h2}>Where the data comes from</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-muted">
            <li>
              <span className="text-foreground">Recalls:</span> the{" "}
              <a
                href="https://www.nhtsa.gov/nhtsa-datasets-and-apis"
                className="underline-offset-2 hover:underline"
                rel="noreferrer"
                target="_blank"
              >
                NHTSA recalls API
              </a>
              . Each campaign is shown with the NHTSA report date.
            </li>
            <li>
              <span className="text-foreground">Owner complaints:</span> the
              NHTSA complaints API. We show counts by component, not verified
              defect rates — a complaint is an owner report, not a finding.
            </li>
            <li>
              <span className="text-foreground">Specs and ratings:</span> NHTSA
              vPIC and crash ratings, EPA fuel economy, and curated trim data
              where available. We leave a spec out rather than guess it.
            </li>
            <li>
              <span className="text-foreground">Overviews and photos:</span>{" "}
              Wikipedia and Wikimedia Commons, credited on vehicle pages. Some
              year pages embed a YouTube overview that stays owned by its
              uploader.
            </li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className={h2}>How often it updates</h2>
          <p className={p}>
            Recall data is re-pulled from NHTSA by a scheduled job that runs
            daily (around 8:30 a.m. Central) and publishes only when a campaign
            is added, removed, or changed.
            {fetchedAt ? (
              <>
                {" "}
                The most recent data pull in the catalog is{" "}
                <time dateTime={fetchedAt.slice(0, 10)}>
                  {formatIsoDate(fetchedAt)}
                </time>
                .
              </>
            ) : null}{" "}
            {/* TODO(owner): complaints, EPA and pricing refreshes are run
                manually today; schedule them and update this sentence. */}
            Owner-complaint counts, EPA figures, and price estimates are
            refreshed separately and less often; each year page shows the date
            of its data pull.
          </p>
          <p className={p}>
            Price figures are labeled estimates based on MSRP and vehicle age,
            not an appraisal.
          </p>
        </section>

        <section className="mt-10">
          <h2 className={h2}>Photos may not match your exact trim</h2>
          <p className={p}>
            Photos are best-effort. A picture may show a different trim,
            package, or a nearby model year, and we mark how much we trust each
            photo where we can. Always confirm trim and options against the
            listing and the VIN before you buy.
          </p>
        </section>

        <section className="mt-10">
          <h2 className={h2}>Houston rentals</h2>
          <p className={p}>
            The{" "}
            <Link
              href="/rentals/houston"
              className="underline-offset-2 hover:underline"
            >
              Houston rentals section
            </Link>{" "}
            features the site owner&rsquo;s own cars, listed on Turo. Prices,
            availability, and trip rules are set on Turo, and links to Turo are
            marked as sponsored. Those guides are educational and separate from
            the model-year research above.
          </p>
        </section>

        <section className="mt-10">
          <h2 className={h2}>Corrections</h2>
          {CORRECTIONS_EMAIL ? (
            <p className={p}>
              Spot a wrong spec, recall, or photo? Email{" "}
              <a
                href={`mailto:${CORRECTIONS_EMAIL}`}
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                {CORRECTIONS_EMAIL}
              </a>{" "}
              with the page URL and what looks off.
            </p>
          ) : (
            <p className={p}>
              Spot a wrong spec, recall, or photo? Use the contact method on
              our Turo host profile (linked from the{" "}
              <Link
                href="/rentals"
                className="underline-offset-2 hover:underline"
              >
                rentals
              </Link>{" "}
              pages) and include the page URL plus what looks off. A dedicated
              corrections inbox will be listed here once it is set up.
            </p>
          )}
        </section>

        <p className="mt-10 text-sm leading-relaxed text-muted">
          Not affiliated with Wikipedia, NHTSA, EPA, Turo, or any vehicle
          manufacturer. Recall and complaint data is informational — verify
          recalls for a specific VIN on NHTSA.gov before you buy.
        </p>
      </article>
    </div>
  );
}
