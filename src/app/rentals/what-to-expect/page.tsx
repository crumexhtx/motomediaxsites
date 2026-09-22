import { RentalsPageShell } from "@/components/RentalsPageShell";
import { SITE } from "@/data/catalog";
import { rentalPageMetadata } from "@/lib/rentals";
import { articleJsonLd, faqPageJsonLd } from "@/lib/seo";

const PATH = "/rentals/what-to-expect";
const TITLE = "What to expect when renting on Turo";
const DESCRIPTION = `First-time Turo renter guide: lockbox pickup, check-in photos, protection plans, guest requirements, and roadside help — on ${SITE.name}.`;

export const metadata = rentalPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
});

const faqs = [
  {
    question: "How does lockbox or keyless pickup work on Turo?",
    answer:
      "Many hosts leave keys in a lockbox or enable app-based unlock. After your trip is approved, the listing or trip chat shows the location, code, or unlock steps. Arrive during the listed pickup window and follow those instructions exactly.",
  },
  {
    question: "Why do I need photos at check-in and check-out?",
    answer:
      "Trip photos document the car’s condition before and after your rental. Take clear exterior and interior shots (and any existing damage) in good light so both you and the host have a shared record.",
  },
  {
    question: "What if something goes wrong during the trip?",
    answer:
      "Contact the host through the trip chat for non-emergencies. For breakdowns or accidents, follow the platform’s roadside and claims steps in the app, and involve local emergency services when safety is at risk.",
  },
];

export default function WhatToExpectPage() {
  return (
    <RentalsPageShell
      path={PATH}
      title={TITLE}
      description="A walkthrough of a typical guest trip — from unlocking the car to returning it — so first-time renters know what “normal” looks like."
      crumbs={[
        { label: "Rentals", href: "/rentals" },
        { label: "What to expect" },
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
          Lockbox and keyless pickup
        </h2>
        <p className="leading-relaxed text-muted">
          Many trips are contactless. After booking, the host shares pickup
          instructions in the app: a pin drop, parking spot details, and either
          a lockbox code or an unlockable key / phone unlock flow. Arrive in
          the allowed window; if you are late, message the host early.
        </p>
        <p className="leading-relaxed text-muted">
          Keep the instructions handy offline if cell service is weak in a
          garage. Do not force entry — if the code fails, use trip chat before
          calling roadside.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-2xl tracking-tight">
          Check-in and check-out photos
        </h2>
        <p className="leading-relaxed text-muted">
          Platforms ask guests to photograph the car at the start and end of
          the trip. Walk around the vehicle, capture each side, corners,
          wheels, windshield, and the cabin. Photograph any existing scratches
          or dents so they are documented before you drive away.
        </p>
        <p className="leading-relaxed text-muted">
          At return, repeat the set in similar lighting when you can. Fuel to
          the level the listing requires (often the same as pickup) and leave
          the interior reasonably clean unless the listing says otherwise.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-2xl tracking-tight">
          Protection plans (renter view)
        </h2>
        <p className="leading-relaxed text-muted">
          During checkout you typically choose a protection plan that sets
          your maximum out-of-pocket exposure for eligible damage. Higher daily
          plan cost usually means a lower deductible-style maximum — read the
          plan summary in the booking flow, not only marketing blurbs.
        </p>
        <p className="leading-relaxed text-muted">
          Your personal auto policy or credit-card rental benefits may or may
          not apply to peer-to-peer trips. That is policy-specific; treat the
          platform plan as the default unless you have confirmed coverage in
          writing with your insurer or card issuer.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-2xl tracking-tight">
          Typical guest requirements
        </h2>
        <p className="leading-relaxed text-muted">
          Expect a minimum age (often mid-20s for many hosts, sometimes lower
          with fees), a valid driver’s license, and identity verification
          through the platform before the first trip. Hosts can set additional
          rules (no smoking, no pets, geographic limits) — those appear on the
          listing.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-2xl tracking-tight">
          If there is an issue during the trip
        </h2>
        <p className="leading-relaxed text-muted">
          For flat tires, jump starts, lockouts, or towing, use the roadside
          assistance path in the Turo app when your plan includes it. For
          accidents involving injuries or major damage, prioritize safety and
          local emergency services, then document and report through the
          platform’s claims process.
        </p>
        <p className="leading-relaxed text-muted">
          Message the host promptly for non-urgent issues (warning lights,
          missing adapter, parking questions). Clear, time-stamped photos in
          trip chat help everyone resolve problems faster.
        </p>
      </section>
    </RentalsPageShell>
  );
}
