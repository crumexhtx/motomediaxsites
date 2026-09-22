import { CatalogImage } from "@/components/CatalogImage";
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
  /** Show listing photos above the CTA copy (default true). */
  showImages?: boolean;
};

/**
 * Single outbound CTA to the live Turo listing.
 * Mirrors YearValuationCta styling: one bordered card, one button, short disclosure.
 * Listing photos come from RENTAL_LISTING.images (swap paths in lib/rentals.ts).
 */
export function TuroListingCta({
  title = `See this ${RENTAL_LISTING.makeName} ${RENTAL_LISTING.modelName} on ${TURO_PARTNER_LABEL}`,
  lead = `Our rental fleet currently includes a ${RENTAL_LISTING.bodyStyle} listed in ${RENTAL_LISTING.market}. Open the live listing for dates, total price, and pickup details — then book on ${TURO_PARTNER_LABEL} if it fits your trip.`,
  className = "",
  showImages = true,
}: Props) {
  const images = RENTAL_LISTING.images;
  const hero = images[0];
  const thumbs = images.slice(1, 4);

  return (
    <section
      className={`max-w-3xl overflow-hidden rounded-lg border border-line bg-elevated/40 ${className}`}
    >
      {showImages && hero ? (
        <div className="border-b border-line/70">
          <a
            href={TURO_LISTING_URL}
            className="focus-ring group relative block aspect-[16/10] bg-soft"
            rel="noopener noreferrer"
            target="_blank"
            aria-label={`View ${RENTAL_LISTING.makeName} ${RENTAL_LISTING.modelName} listing on ${TURO_PARTNER_LABEL}`}
          >
            <CatalogImage
              src={hero.src}
              alt={hero.alt}
              fill
              quality={55}
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover transition duration-500 group-hover:scale-[1.02]"
            />
          </a>
          {thumbs.length > 0 ? (
            <ul className="grid grid-cols-3 gap-px bg-line/40">
              {thumbs.map((img) => (
                <li key={img.src} className="relative aspect-[16/10] bg-soft">
                  <CatalogImage
                    src={img.src}
                    alt={img.alt}
                    fill
                    quality={45}
                    sizes="(max-width: 768px) 33vw, 250px"
                    className="object-cover"
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="px-5 py-5 md:px-6">
        <h2 className="font-display text-xl tracking-tight md:text-2xl">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted md:text-base">
          {lead}
        </p>
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
          pickup instructions are controlled by the listing — not by {SITE.name}
          . Photos here show the {RENTAL_LISTING.makeName}{" "}
          {RENTAL_LISTING.modelName}; check the live listing for the latest
          vehicle shots.
        </p>
      </div>
    </section>
  );
}
