import Link from "next/link";
import { RentalListingGrid } from "@/components/RentalListingCard";
import { RentalsPageShell } from "@/components/RentalsPageShell";
import {
  HOBBY_AIRPORT_PATH,
  RENTAL_FLEET_SNIPPET,
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
  "Hobby Airport (HOU) Turo: 2025 Venue SE & Trax LT from the site owner. Check dates, price & the host’s current rating on Turo.";

export const metadata = rentalPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  image: {
    src: "/rentals/chevrolet-trax-1.png",
    alt: "Metallic red Chevrolet Trax — Houston Turo listing near Hobby Airport",
  },
});

const faqs = [
  {
    question: "Is the car parked at Hobby Airport?",
    answer:
      "Pickup is near William P. Hobby Airport (HOU), not at a staffed counter inside the terminal. After you book, the exact pickup location and key or unlock instructions are sent through Turo. Instructions can change, so treat the live Turo listing and your trip chat as the source of truth for your dates.",
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
      "Both are 2025 model-year small SUVs that seat five. Ours are a Hyundai Venue SE and a Chevrolet Trax LT. The Trax is generally the larger of the two for luggage; the Venue may suit a lighter trip. Confirm cargo and the all-in trip price on the live listing before you decide.",
  },
  {
    question: "Are there mileage limits or extra fees?",
    answer:
      "Many Turo listings include a mileage allowance and charge per mile beyond it, plus possible fees for delivery, late return, or young drivers. These are set per listing, so read the trip total and the listing rules before you book.",
  },
  {
    question: "Who is the host?",
    answer:
      "Both cars are the site owner’s own vehicles, listed on Turo by the site owner. Ratings and trip counts change over time, so check the host’s current rating and reviews on the live Turo listing before you book.",
  },
];

const trax = getTuroListing("chevrolet-trax");
const venue = getTuroListing("hyundai-venue");

const linkClass = "text-accent underline-offset-2 hover:underline";

export default function HobbyAirportRentalsPage() {
  return (
    <RentalsPageShell
      path={PATH}
      title={H1}
      description={`Landing at William P. Hobby Airport and need a car? Rent ${RENTAL_FLEET_SNIPPET}: a 2025 Hyundai Venue SE and a 2025 Chevrolet Trax LT, with HOU pickup tips and what to check before you book.`}
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
          is not a counter line: two cars we list on Turo, hosted by
          the site owner and based in the Hobby Airport area of southeast
          Houston.
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
          Both listings are ours — a 2025 Hyundai Venue SE and a 2025
          Chevrolet Trax LT — listed on Turo by the site owner. Check the
          host’s current rating on each live listing. Price and availability
          are set on Turo and change with your dates, so use the button on
          each card to check your trip.
        </p>
        <RentalListingGrid listings={turoListings} className="mt-6" />
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-2xl tracking-tight">
          Getting your car at Hobby
        </h2>
        <p className="leading-relaxed text-muted">
          Our pickup is near William P. Hobby Airport (HOU), not at a staffed
          rental counter inside the terminal. The exact pickup location and
          key instructions are sent through Turo after you book.
        </p>
        <ol className="list-decimal space-y-2 pl-5 leading-relaxed text-muted">
          <li>
            Book on Turo and watch the app and trip chat for pickup and key
            instructions.
          </li>
          <li>
            Share your flight number and expected arrival time so the handoff
            window stays realistic if the plane runs late.
          </li>
          <li>
            If you cannot find the car or the instructions are unclear,
            message the host in the Turo app.
          </li>
          <li>
            Take your check-in photos before you drive away, as described in{" "}
            <Link href="/rentals/what-to-expect" className={linkClass}>
              what to expect on a Turo trip
            </Link>
            .
          </li>
        </ol>
        <p className="leading-relaxed text-muted">
          Listing instructions can change — treat the live Turo page and trip
          chat as the source of truth for your dates.
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
          city. Specs below come from the live Turo listings; confirm cargo
          space and other details there before you book.
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
              {venue?.mpgCombined != null || trax?.mpgCombined != null ? (
                <tr>
                  <th scope="row" className="px-4 py-3 font-normal text-muted">
                    Combined MPG
                  </th>
                  <td className="px-4 py-3">
                    {venue?.mpgCombined != null ? (
                      <>
                        {venue.mpgCombined}
                        <span className="text-muted"> (listing)</span>
                      </>
                    ) : (
                      <span className="text-muted">See listing</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {trax?.mpgCombined != null ? (
                      <>
                        {trax.mpgCombined}
                        <span className="text-muted"> (listing)</span>
                      </>
                    ) : (
                      <span className="text-muted">See listing</span>
                    )}
                  </td>
                </tr>
              ) : null}
              {venue?.year || venue?.trim || trax?.year || trax?.trim ? (
                <tr>
                  <th scope="row" className="px-4 py-3 font-normal text-muted">
                    Listing year &amp; trim
                  </th>
                  <td className="px-4 py-3">
                    {venue && (venue.year || venue.trim) ? (
                      rentalListingName(venue)
                    ) : (
                      <span className="text-muted">See listing</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {trax && (trax.year || trax.trim) ? (
                      rentalListingName(trax)
                    ) : (
                      <span className="text-muted">See listing</span>
                    )}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="leading-relaxed text-muted">
          The Trax is generally the larger of the two, which can matter for
          luggage and rear-seat room; the Venue is the smaller option for
          tighter parking. Combined MPG is what each Turo listing shows today.
          For used-buyer research on the Trax, see our{" "}
          {trax?.catalogPath ? (
            <Link href={trax.catalogPath} className={linkClass}>
              2025 Chevrolet Trax page
            </Link>
          ) : (
            "Chevrolet Trax catalog page"
          )}
          .
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
