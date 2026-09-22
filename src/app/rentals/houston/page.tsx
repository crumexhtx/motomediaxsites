import Link from "next/link";
import { RentalsPageShell } from "@/components/RentalsPageShell";
import { SITE } from "@/data/catalog";
import { RENTAL_LISTING, rentalPageMetadata } from "@/lib/rentals";
import { articleJsonLd, faqPageJsonLd } from "@/lib/seo";

const PATH = "/rentals/houston";
const TITLE = "Rent a car in Houston on Turo";
const DESCRIPTION = `Houston Turo tips for Hobby (HOU) and Bush (IAH): delivery vs pickup, when renting beats buying for a short stay, and how to open our rental fleet listing — on ${SITE.name}.`;

export const metadata = rentalPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
});

const faqs = [
  {
    question: "Should I book near Hobby (HOU) or Bush Intercontinental (IAH)?",
    answer:
      "Match the listing to the airport you actually fly into. HOU is closer to downtown and the Medical Center; IAH sits farther north. Delivery radius, parking instructions, and drive time differ — read the listing map before you book.",
  },
  {
    question: "When does renting in Houston beat buying or relying on rideshares?",
    answer:
      "Short trips with multiple destinations, luggage, or suburban agendas often favor a rental. Rideshares add up across a week; buying only makes sense if you will keep the car. Peer-to-peer can fill the middle: a full vehicle without a dealership visit.",
  },
];

export default function HoustonRentalsPage() {
  return (
    <RentalsPageShell
      path={PATH}
      title={TITLE}
      description={`Practical notes for travelers landing at Hobby or Bush — and a clear path to our ${RENTAL_LISTING.makeName} ${RENTAL_LISTING.modelName} listing in ${RENTAL_LISTING.market}.`}
      crumbs={[
        { label: "Rentals", href: "/rentals" },
        { label: "Houston" },
      ]}
      jsonLd={[
        articleJsonLd({
          title: TITLE,
          description: DESCRIPTION,
          path: PATH,
        }),
        faqPageJsonLd(faqs),
      ]}
      ctaTitle={`Houston ${RENTAL_LISTING.bodyStyle} on Turo`}
      ctaLead={`Our rental fleet listing is based in ${RENTAL_LISTING.market}. Check dates, the all-in trip price, and pickup or delivery options on the live Turo page before you fly.`}
    >
      <section className="space-y-4">
        <h2 className="font-display text-2xl tracking-tight">
          Hobby (HOU) vs. Bush Intercontinental (IAH)
        </h2>
        <p className="leading-relaxed text-muted">
          Houston has two major commercial airports.{" "}
          <strong className="font-medium text-foreground">
            William P. Hobby (HOU)
          </strong>{" "}
          sits south of downtown — often convenient for Midtown, the Medical
          Center, and inner-loop trips.{" "}
          <strong className="font-medium text-foreground">
            George Bush Intercontinental (IAH)
          </strong>{" "}
          is north of the city; expect longer ground time to downtown and many
          suburbs unless your lodging is already on the north side.
        </p>
        <p className="leading-relaxed text-muted">
          When you compare Turo listings, filter by the airport you use and
          read whether the car is{" "}
          <Link
            href="/rentals/how-to-choose"
            className="text-accent underline-offset-2 hover:underline"
          >
            on-site, nearby pickup, or delivery
          </Link>
          . “Airport” in a title does not guarantee a walkable terminal
          pickup — the map and host instructions matter more than the label.
        </p>
        <p className="leading-relaxed text-muted">
          Delivery can solve late arrivals or hotel check-ins, but it usually
          costs more and may have hour limits. Message the host with your
          flight ETA after booking so handoff timing is realistic.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-2xl tracking-tight">
          Why rent instead of buy — or fly without a car
        </h2>
        <p className="leading-relaxed text-muted">
          Houston is spread out. For a multi-day visit with luggage, grocery
          stops, or family logistics, a compact SUV often beats stacking
          rideshare fares. Buying a car only pencils out if you will keep it;
          peer-to-peer rental covers the short window without a dealership or
          long-term insurance setup.
        </p>
        <p className="leading-relaxed text-muted">
          If you are also researching a used purchase later, {SITE.name}’s{" "}
          <Link
            href="/makes"
            className="text-accent underline-offset-2 hover:underline"
          >
            make and model year pages
          </Link>{" "}
          cover NHTSA recalls and year-over-year changes — separate from a
          short Turo trip, but useful when you compare ownership vs. renting.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-2xl tracking-tight">
          Before you book this listing
        </h2>
        <p className="leading-relaxed text-muted">
          Skim{" "}
          <Link
            href="/rentals/what-to-expect"
            className="text-accent underline-offset-2 hover:underline"
          >
            what to expect on a Turo trip
          </Link>{" "}
          if this is your first peer-to-peer rental, then open the live listing
          for current availability and the all-in price for your dates.
        </p>
      </section>
    </RentalsPageShell>
  );
}
