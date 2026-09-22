import { SITE } from "@/data/catalog";
import {
  RENTAL_LISTING,
  TURO_LISTING_URL,
  TURO_PARTNER_LABEL,
} from "@/lib/rentals";

type Props = {
  /** Optional override for the card headline. */
  title?: string;
  /** Optional override for the supporting sentence. */
  lead?: string;
  className?: string;
};

/**
 * Single outbound CTA to the live Turo listing.
 * Mirrors YearValuationCta styling: one bordered card, one button, short disclosure.
 */
export function TuroListingCta({
  title = `See this ${RENTAL_LISTING.makeName} ${RENTAL_LISTING.modelName} on ${TURO_PARTNER_LABEL}`,
  lead = `Our rental fleet currently includes a ${RENTAL_LISTING.bodyStyle} listed in ${RENTAL_LISTING.market}. Open the live listing for dates, total price, and pickup details — then book on ${TURO_PARTNER_LABEL} if it fits your trip.`,
  className = "",
}: Props) {
  return (
    <section
      className={`max-w-3xl rounded-lg border border-line bg-elevated/40 px-5 py-5 md:px-6 ${className}`}
    >
      <h2 className="font-display text-xl tracking-tight md:text-2xl">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted md:text-base">{lead}</p>
      <a
        href={TURO_LISTING_URL}
        className="focus-ring mt-4 inline-flex items-center rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-[#071018] transition hover:brightness-110"
        rel="noopener noreferrer"
        target="_blank"
      >
        View listing on {TURO_PARTNER_LABEL}
      </a>
      <p className="mt-3 text-xs text-muted">
        Opens {TURO_PARTNER_LABEL} in a new tab. Availability, pricing, and
        pickup instructions are controlled by the listing — not by {SITE.name}.
      </p>
    </section>
  );
}
