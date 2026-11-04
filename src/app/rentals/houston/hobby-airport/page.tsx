import Link from "next/link";
import { RentalListingGrid } from "@/components/RentalListingCard";
import { RentalsPageShell } from "@/components/RentalsPageShell";
import {
  HOBBY_AIRPORT_PATH,
  TURO_LINK_REL,
  getTuroListing,
  rentalListingName,
  rentalPageMetadata,
  turoListings,
  turoListingsItemListJsonLd,
} from "@/lib/rentals";
import { articleJsonLd, faqPageJsonLd } from "@/lib/seo";

const PATH = HOBBY_AIRPORT_PATH;
const H1 = "Car rentals near Hobby Airport (HOU) on Turo";
const TITLE = "Hobby Airport (HOU) Car Rental on Turo";
const DESCRIPTION =
  "Renting near Hobby Airport (HOU)? See our Hyundai Venue and Chevrolet Trax on Turo, plus pickup tips. Check dates and price on Turo.";

export const metadata = rentalPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  // TODO: swap for a real Venue/Trax listing photo once /public/rentals exists.
  image: {
    src: "/catalog/chevrolet--trax.jpg",
    alt: "Chevrolet Trax — Houston Turo listing near Hobby Airport",
  },
});

const faqs = [
  {
    question: "Is the car parked at Hobby Airport?",
    answer:
      "Our cars are based in the Hobby Airport area of southeast Houston, but that does not necessarily mean a spot inside airport parking. Pickup instructions, the exact handoff, and any delivery options are shown on the Turo listing and in the trip chat after you book.",
  },
  {
    question: "How much does it cost per day?",
    answer:
      "Price changes with your dates, trip length, and the protection plan you choose, so we do not quote a fixed rate here. Open the Turo listing, enter your dates, and compare the all-in trip total.",
  },
  {
    question: "Can I get the car delivered to HOU or my hotel?",
    answer:
      "Delivery depends on what each listing offers, and it usually carries an extra fee and a service radius. Check the delivery options on the listing for your dates, and message the host if you need something specific.",
  },
  {
    question: "Which is better for a short Houston trip, the Venue or the Trax?",
    answer:
      "Both seat five. The Trax is generally the larger of the two, which can help with luggage, while the Venue may suit a lighter trip. Confirm cargo space, year, and trim on the live listing before you decide.",
  },
  {
    question: "Are there mileage limits or extra fees?",
    answer:
      "Many Turo listings include a mileage allowance and charge per mile beyond it, plus possible fees for delivery, late return, or young drivers. These are set per listing, so read the trip total and the listing rules before you book.",
  },
  {
    question: "Who is the host?",
    answer:
      "Both cars are the site owner’s own vehicles, listed on Turo. Reviews, trip history, and host details appear on the Turo listing, not on this site.",
  },
];

const trax = getTuroListing("chevrolet-trax");
const venue = getTuroListing("hyundai-venue");

function Todo() {
  return (
    <span className="rounded border border-dashed border-line px-1.5 py-0.5 text-xs uppercase tracking-wide text-muted">
      TODO
    </span>
  );
}

const linkClass = "text-accent underline-offset-2 hover:underline";

export default function HobbyAirportRentalsPage() {
  return (
    <RentalsPageShell
      path={PATH}
      title={H1}
      description="Landing at William P. Hobby Airport and need a car? Here are the two cars we list on Turo in southeast Houston, how pickup usually works, and what to check before you book."
      crumbs={[
        { label: "Rentals", href: "/rentals" },
        { label: "Houston", href: "/rentals/houston" },
        { label: "Hobby Airport" },
      ]}
      jsonLd={[
        articleJsonLd({
          title: TITLE,
          description: DESCRIPTION,
          path: PATH,
        }),
        turoListingsItemListJsonLd(),
        faqPageJsonLd(faqs),
      ]}
      showCta={false}
    >
      <section className="space-y-4">
        <p className="leading-relaxed text-muted">
          William P. Hobby Airport (HOU) is the smaller of Houston’s two
          commercial airports and sits southeast of downtown, which makes it a
          practical starting point for inner-loop, Medical Center, and
          Gulf-side trips. This page is for travelers who want a rental that
          is not a counter line: two cars we list on Turo, based in the Hobby
          Airport area of southeast Houston.
        </p>
        <p className="leading-relaxed text-muted">
          Everything below is meant to help you decide, not to push a
          booking. We cover how pickup typically works on Turo, where people
          tend to drive from HOU, how our two cars compare, and what to check
          before you pay. For the bigger picture, see our{" "}
          <Link href="/rentals/houston" className={linkClass}>
            Houston rental guide
          </Link>
          , which also covers Bush Intercontinental (IAH).
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl tracking-tight">
          Our cars near Hobby
        </h2>
        <p className="mt-2 leading-relaxed text-muted">
          Both listings are ours. Price and availability are set on Turo and
          change with your dates, so use the button on each card to check your
          trip. Fields marked TODO are still being confirmed from the live
          listing.
        </p>
        <RentalListingGrid listings={turoListings} className="mt-6" />
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-2xl tracking-tight">
          Getting your car at Hobby
        </h2>
        <p className="leading-relaxed text-muted">
          Turo handoffs vary by listing. Common setups are a pickup at a
          listed spot with keyless or lockbox access, or delivery to an
          address you choose, often for an added fee. The listing shows which
          options are available for your dates, and the trip chat carries the
          exact instructions once your booking is approved.
        </p>
        <p className="leading-relaxed text-muted">
          After you book, message the host your flight number and expected
          arrival time. Flights run late, and a realistic handoff window saves
          a stressful hour at the curb. Take your check-in photos before you
          drive away, as described in{" "}
          <Link href="/rentals/what-to-expect" className={linkClass}>
            what to expect on a Turo trip
          </Link>
          .
        </p>
        <p className="leading-relaxed text-muted">
          <Todo /> Owner to add the specific HOU handoff: where the car is
          left or met, the typical window, and whether delivery to the
          terminal is offered. Until then, treat the live listing as the
          source of truth.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-2xl tracking-tight">
          Where people drive from Hobby
        </h2>
        <p className="leading-relaxed text-muted">
          Hobby’s location on the south side of the city keeps several common
          destinations close. Traffic on I-45 and the Gulf Freeway changes
          everything, so these are rough notes rather than promises.
        </p>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed text-muted">
          <li>
            <strong className="font-medium text-foreground">Downtown.</strong>{" "}
            One of the shorter drives from HOU, useful for conventions,
            sports, and hotel stays.
          </li>
          <li>
            <strong className="font-medium text-foreground">
              Medical Center and NRG Park.
            </strong>{" "}
            Also close, which is why hospital visits and events at NRG are
            popular reasons to rent here.
          </li>
          <li>
            <strong className="font-medium text-foreground">Galleria.</strong>{" "}
            Farther west across town; plan extra time at rush hour.
          </li>
          <li>
            <strong className="font-medium text-foreground">
              Clear Lake and NASA.
            </strong>{" "}
            Straight down the Gulf Freeway corridor from Hobby, often a short
            drive outside peak traffic.
          </li>
          <li>
            <strong className="font-medium text-foreground">Galveston.</strong>{" "}
            A day-trip distance that is often under an hour without heavy
            beach-weekend traffic.
          </li>
        </ul>
        <p className="leading-relaxed text-muted">
          A car is most useful when you are splitting your time across
          several of these. For one hotel and one meeting, rideshares may be
          cheaper.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-2xl tracking-tight">
          Venue or Trax?
        </h2>
        <p className="leading-relaxed text-muted">
          Both are small SUVs that seat five and are easy to park in the
          city. The table shows what we can state today; gaps are marked TODO
          rather than guessed.
        </p>
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="bg-elevated/60 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  &nbsp;
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  {venue ? `${venue.make} ${venue.model}` : "Venue"}
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  {trax ? `${trax.make} ${trax.model}` : "Trax"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              <tr>
                <th scope="row" className="px-4 py-3 font-normal text-muted">
                  Seats
                </th>
                <td className="px-4 py-3">{venue?.seats}</td>
                <td className="px-4 py-3">{trax?.seats}</td>
              </tr>
              <tr>
                <th scope="row" className="px-4 py-3 font-normal text-muted">
                  Combined MPG
                </th>
                <td className="px-4 py-3">
                  {venue?.mpgCombined ?? <Todo />}
                </td>
                <td className="px-4 py-3">
                  {trax?.mpgCombined ?? <Todo />}
                  {trax?.mpgCombined ? (
                    <span className="text-muted"> (catalog)</span>
                  ) : null}
                </td>
              </tr>
              <tr>
                <th scope="row" className="px-4 py-3 font-normal text-muted">
                  Cargo space
                </th>
                <td className="px-4 py-3">
                  <Todo />
                </td>
                <td className="px-4 py-3">
                  <Todo />
                </td>
              </tr>
              <tr>
                <th scope="row" className="px-4 py-3 font-normal text-muted">
                  Listing year &amp; trim
                </th>
                <td className="px-4 py-3">
                  {venue ? (
                    venue.year || venue.trim ? (
                      rentalListingName(venue)
                    ) : (
                      <Todo />
                    )
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  {trax ? (
                    trax.year || trax.trim ? (
                      rentalListingName(trax)
                    ) : (
                      <Todo />
                    )
                  ) : null}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="leading-relaxed text-muted">
          The Trax is generally the larger of the two, which can matter for
          luggage and rear-seat room; the Venue is the smaller option for
          tighter parking. The Trax’s mileage figure comes from our{" "}
          {trax?.catalogPath ? (
            <Link href={trax.catalogPath} className={linkClass}>
              Chevrolet Trax catalog page
            </Link>
          ) : (
            "catalog"
          )}{" "}
          and varies by year and trim, so confirm against the listing.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-2xl tracking-tight">
          Before you book
        </h2>
        <p className="leading-relaxed text-muted">
          Compare the trip total, not the daily rate. Fees, taxes, and the
          protection plan you pick can move the final price, and delivery or
          young-driver charges may apply. Check the mileage allowance and the
          per-mile overage if you plan a Galveston or Austin run. Confirm
          driver requirements, such as minimum age and a valid license, and
          read the listing rules on smoking, pets, and fuel or charge level at
          return.
        </p>
        <p className="leading-relaxed text-muted">
          Protection plans set your maximum out-of-pocket for eligible
          damage, and your own auto policy or card benefits may not extend to
          peer-to-peer trips. Verify that with your insurer before you rely on
          it. Our guides go deeper:{" "}
          <Link href="/rentals/how-to-choose" className={linkClass}>
            how to pick a rental car on Turo
          </Link>{" "}
          and{" "}
          <Link href="/rentals/what-to-expect" className={linkClass}>
            what to expect on a trip
          </Link>
          .
        </p>
        <p className="leading-relaxed text-muted">
          Ready to check your dates?{" "}
          {turoListings.map((listing, i) => (
            <span key={listing.id}>
              {i > 0 ? " or " : null}
              <a
                href={listing.url}
                className={linkClass}
                rel={TURO_LINK_REL}
                target="_blank"
              >
                {rentalListingName(listing)} on Turo
              </a>
            </span>
          ))}
          .
        </p>
      </section>

      <section className="mt-10 space-y-5">
        <h2 className="font-display text-2xl tracking-tight">
          Hobby Airport rental FAQ
        </h2>
        <dl className="space-y-5">
          {faqs.map((faq) => (
            <div key={faq.question}>
              <dt className="font-medium text-foreground">{faq.question}</dt>
              <dd className="mt-1 leading-relaxed text-muted">
                {faq.answer}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </RentalsPageShell>
  );
}
