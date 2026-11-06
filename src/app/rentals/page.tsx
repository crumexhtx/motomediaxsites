import Link from "next/link";
import { RentalListingGrid } from "@/components/RentalListingCard";
import { RentalsPageShell } from "@/components/RentalsPageShell";
import {
  HOBBY_AIRPORT_PATH,
  RENTAL_GUIDES,
  rentalPageMetadata,
  turoListings,
  turoListingsItemListJsonLd,
} from "@/lib/rentals";
import { faqPageJsonLd } from "@/lib/seo";

const PATH = "/rentals";
const H1 = "Car rentals at Houston Hobby Airport (HOU)";
const SOCIAL_TITLE = "Hobby Airport Car Rentals in Houston (HOU)";
const ABSOLUTE_TITLE = `${SOCIAL_TITLE} | MotoMediaX`;
const DESCRIPTION =
  "Skip the rental counter at Hobby Airport (HOU). Book a Hyundai Venue or Chevy Trax with self-service pickup and no parking fee for guests.";
const INTRO =
  "Two compact SUVs, picked up near Hobby Airport and booked through Turo. No rental counter, no lines: unlock with a code, drive, and return it the same way.";

/** Visible FAQ. The last item is UI-only (left out of FAQPage JSON-LD). */
const RENTALS_FAQS: Array<{
  question: string;
  answer: string;
  jsonLd?: boolean;
}> = [
  {
    question: "Where do I pick up the car?",
    answer:
      "Pickup and return are at Houston Hobby Airport (HOU). After you book, Turo shows you the exact spot, plus step-by-step directions.",
  },
  {
    question: "How do I get the key?",
    answer:
      "The key is in a lockbox. The code is sent through the Turo app on the morning your trip starts. When you return the car, lock the key back in the lockbox.",
  },
  {
    question: "Do I pay for parking?",
    answer:
      "No. Parking at the airport lot is covered, so you don't pay at the gate.",
  },
  {
    question: "Is there a mileage limit?",
    answer:
      "Yes, 200 miles per day. If you go over, extra miles are charged at the rate shown on the Turo listing.",
  },
  {
    question: "What about fuel?",
    answer:
      "Return the car with the same fuel level you started with, and take a photo of the gauge.",
  },
  {
    question: "Who pays for tolls?",
    answer:
      "If you use a toll road, you're charged for it. Tolls are billed through Turo after the trip, and they can take a few weeks to show up.",
  },
  {
    question: "Is it safe to rent from a private owner?",
    answer:
      "Every trip is booked and protected through Turo, with 24/7 roadside assistance included. Read the protection details on the Turo listing before you book.",
    jsonLd: false,
  },
];

const faqsForJsonLd = RENTALS_FAQS.filter((f) => f.jsonLd !== false).map(
  ({ question, answer }) => ({ question, answer }),
);

export const metadata = rentalPageMetadata({
  title: SOCIAL_TITLE,
  absoluteTitle: ABSOLUTE_TITLE,
  socialTitle: SOCIAL_TITLE,
  description: DESCRIPTION,
  path: PATH,
  type: "website",
});

export default function RentalsHubPage() {
  return (
    <RentalsPageShell
      path={PATH}
      title={H1}
      description={INTRO}
      crumbs={[{ label: "Rentals" }]}
      jsonLd={[
        turoListingsItemListJsonLd(),
        faqPageJsonLd(faqsForJsonLd),
      ]}
      showGuideNav={false}
      showCta={false}
    >
      <section className="mt-0">
        <h2 className="font-display text-2xl tracking-tight">
          Our Houston fleet
        </h2>
        <p className="mt-2 leading-relaxed text-muted">
          Two cars listed on Turo by the site owner, based near Hobby Airport
          (HOU). Open a listing for current availability and the all-in price
          for your dates. More pickup tips:{" "}
          <Link
            href={HOBBY_AIRPORT_PATH}
            className="text-accent underline-offset-2 hover:underline"
          >
            car rentals near Hobby Airport (HOU)
          </Link>
          .
        </p>
        <RentalListingGrid
          listings={turoListings}
          className="mt-6"
          showPitch
          showTraxStats
        />
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-2xl tracking-tight">
          Hobby Airport rental FAQ
        </h2>
        <dl className="space-y-5">
          {RENTALS_FAQS.map((faq) => (
            <div key={faq.question}>
              <dt className="font-medium text-foreground">{faq.question}</dt>
              <dd className="mt-1.5 leading-relaxed text-muted">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl tracking-tight">
          Start with a guide
        </h2>
        <p className="mt-2 leading-relaxed text-muted">
          Three short reads — choose a car carefully, know the trip flow, or
          focus on Houston airports.
        </p>
        <ul className="mt-6 grid gap-4">
          {RENTAL_GUIDES.map((guide) => (
            <li key={guide.href}>
              <Link
                href={guide.href}
                className="focus-ring block rounded-lg border border-line bg-elevated/40 px-5 py-5 transition hover:border-accent/40"
              >
                <p className="font-display text-xl tracking-tight">
                  {guide.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {guide.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </RentalsPageShell>
  );
}
