import Link from "next/link";
import { RentalsPageShell } from "@/components/RentalsPageShell";
import { getModel, modelHref } from "@/lib/catalog";
import { SITE } from "@/data/catalog";
import { RENTAL_LISTING, rentalPageMetadata } from "@/lib/rentals";
import { articleJsonLd, faqPageJsonLd } from "@/lib/seo";

const PATH = "/rentals/how-to-choose";
const TITLE = "How to pick a rental car on Turo";
const DESCRIPTION = `Turo rental tips: host reviews, total price vs daily rate, delivery vs airport pickup, mileage limits, and vehicle age — on ${SITE.name}.`;

export const metadata = rentalPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
});

const faqs = [
  {
    question: "Is the daily rate the total I will pay on Turo?",
    answer:
      "Usually not. The quote should show fees, taxes, and any protection plan before you book. Compare the trip total, not only the advertised daily rate.",
  },
  {
    question: "What is the difference between delivery and a pickup location?",
    answer:
      "A pickup-location listing means you go to the car (home, garage, or airport on-site spot). Delivery means the host brings the car to an address you arrange — often for an extra fee and within a service radius.",
  },
];

function CatalogCrossLink() {
  const trax = getModel(
    RENTAL_LISTING.catalogMakeSlug,
    RENTAL_LISTING.catalogModelSlug,
  );
  if (trax) {
    return (
      <Link
        href={modelHref(trax.make.slug, trax.model.slug)}
        className="text-accent underline-offset-2 hover:underline"
      >
        {trax.make.name} {trax.model.name} model years
      </Link>
    );
  }

  // Trax is not in the catalog yet — link related Chevrolet research instead.
  const equinox = getModel("chevrolet", "equinox");
  return (
    <>
      <Link
        href="/makes/chevrolet"
        className="text-accent underline-offset-2 hover:underline"
      >
        Chevrolet catalog
      </Link>
      {equinox ? (
        <>
          {" "}
          or a similar crossover like the{" "}
          <Link
            href={modelHref(equinox.make.slug, equinox.model.slug)}
            className="text-accent underline-offset-2 hover:underline"
          >
            Chevrolet Equinox
          </Link>
        </>
      ) : null}
    </>
  );
}

export default function HowToChoosePage() {
  return (
    <RentalsPageShell
      path={PATH}
      title={TITLE}
      description="A practical checklist before you book — host trust signals, all-in price, how you get the keys, mileage rules, and whether the car’s age and mileage match your trip."
      crumbs={[
        { label: "Rentals", href: "/rentals" },
        { label: "How to choose" },
      ]}
      jsonLd={[
        articleJsonLd({
          title: TITLE,
          description: DESCRIPTION,
          path: PATH,
        }),
        faqPageJsonLd(faqs),
      ]}
    >
      <section className="space-y-4">
        <h2 className="font-display text-2xl tracking-tight">
          Host reviews, trips, and response rate
        </h2>
        <p className="leading-relaxed text-muted">
          Prefer hosts with recent guest reviews, a meaningful trip count, and
          a high response rate. Read a few full reviews — not only the star
          average — for comments on cleanliness, communication, and whether
          the car matched the photos.
        </p>
        <p className="leading-relaxed text-muted">
          A new listing is not automatically a red flag, but you should treat
          sparse history as a reason to read the listing carefully and message
          the host with clear questions before you book.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-2xl tracking-tight">
          Daily rate vs. total price
        </h2>
        <p className="leading-relaxed text-muted">
          The headline daily rate is only a starting point. Before you confirm,
          check the trip total for platform fees, taxes, young-driver fees (if
          any), and the protection plan you select. Two cars with similar daily
          rates can diverge once extras are included.
        </p>
        <p className="leading-relaxed text-muted">
          If you need airport convenience or delivery, price that into the
          comparison against a cheaper listing that requires a longer pickup
          ride.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-2xl tracking-tight">
          Delivery vs. pickup — and “on-site at airport”
        </h2>
        <p className="leading-relaxed text-muted">
          <strong className="font-medium text-foreground">Pickup location</strong>{" "}
          means you travel to the car. That might be a residential address, a
          parking garage, or an airport-area spot the host describes in the
          listing.
        </p>
        <p className="leading-relaxed text-muted">
          <strong className="font-medium text-foreground">
            On-site / airport
          </strong>{" "}
          style listings usually mean the car is parked in or near airport
          parking so you can walk or take a short shuttle — still read the exact
          instructions; “airport” does not always mean a staffed rental counter.
        </p>
        <p className="leading-relaxed text-muted">
          <strong className="font-medium text-foreground">Delivery</strong>{" "}
          means the host brings the vehicle to you (hotel, home, or another
          pin) within their delivery radius, often for an added fee and only at
          certain hours. Confirm timing in the trip chat after booking.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-2xl tracking-tight">
          Mileage limits and extra-mile fees
        </h2>
        <p className="leading-relaxed text-muted">
          Many listings include a daily or trip mileage allowance. If your plans
          include long interstate drives, estimate miles before you book and
          check the per-mile overage rate. Buying extra miles up front can be
          cheaper than paying after return — when the listing offers that
          option.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-2xl tracking-tight">
          Vehicle age and mileage
        </h2>
        <p className="leading-relaxed text-muted">
          Newer cars and lower odometer readings often cost more per day; older
          high-mileage cars can be fine for city trips if maintenance and
          reviews look solid. Match the car to the job: highway comfort,
          cargo, child seats, or fuel economy.
        </p>
        <p className="leading-relaxed text-muted">
          Our rental fleet listing is a {RENTAL_LISTING.makeName}{" "}
          {RENTAL_LISTING.modelName} ({RENTAL_LISTING.bodyStyle}). To research
          used-year recalls and specs for Chevrolet models on {SITE.name}, start
          with the <CatalogCrossLink />.
        </p>
      </section>
    </RentalsPageShell>
  );
}
