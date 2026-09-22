import Link from "next/link";
import { RentalsPageShell } from "@/components/RentalsPageShell";
import { SITE } from "@/data/catalog";
import { RENTAL_GUIDES, rentalPageMetadata } from "@/lib/rentals";
import { articleJsonLd } from "@/lib/seo";

const PATH = "/rentals";
const TITLE = "Peer-to-peer car rentals";
const DESCRIPTION = `How Turo-style rentals work, what to check before you book, and Houston pickup tips — plus a link to our rental fleet listing. Guides on ${SITE.name}.`;

export const metadata = rentalPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
});

export default function RentalsHubPage() {
  return (
    <RentalsPageShell
      path={PATH}
      title={TITLE}
      description="Peer-to-peer platforms let you book a privately owned car for a trip — often with more variety and clearer total pricing than a traditional counter. Use these guides to set expectations, then open a live listing if you need a car in Houston."
      crumbs={[{ label: "Rentals" }]}
      jsonLd={[
        articleJsonLd({
          title: TITLE,
          description: DESCRIPTION,
          path: PATH,
        }),
      ]}
      showGuideNav={false}
      ctaTitle="Ready to check availability?"
      ctaLead="If you already know peer-to-peer rental fits your trip, open our live Houston listing for dates, total price, and pickup details."
    >
      <section className="space-y-4">
        <h2 className="font-display text-2xl tracking-tight">
          What is peer-to-peer car rental?
        </h2>
        <p className="leading-relaxed text-muted">
          On platforms like Turo, hosts list personal vehicles and guests book
          them for a set trip window. You usually pick up at a listed location
          (or arrange delivery), unlock with instructions in the app, and return
          the car at the agreed time. The platform handles identity checks,
          payments, and trip messaging — the host owns the car.
        </p>
        <p className="leading-relaxed text-muted">
          Compared with a traditional rental counter, peer-to-peer can mean
          lower daily rates on some cars, pickup away from airport queues, and
          a wider mix of models (compact SUVs, trucks, EVs). Tradeoffs include
          host response times, mileage caps, and protection-plan choices you
          should read before you confirm.
        </p>
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
