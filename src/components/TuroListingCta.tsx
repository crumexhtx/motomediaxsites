import Link from "next/link";
import { CatalogImage } from "@/components/CatalogImage";
import { SITE } from "@/data/catalog";
import {
  HOBBY_AIRPORT_PATH,
  RENTAL_AREA_LABEL,
  TURO_LINK_REL,
  TURO_PARTNER_LABEL,
  rentalListingName,
  turoListings,
} from "@/lib/rentals";

type Props = {
  /** Optional override for the card headline. */
  title?: string;
  /** Optional override for the supporting sentence. */
  lead?: string;
  className?: string;
  /** Show a photo above each listing button (default false — buttons only). */
  showImages?: boolean;
};

/**
 * Fleet CTA: one bordered card with an outbound Turo button per listing and a
 * link to the Hobby Airport page. Listing data lives in `turoListings`.
 */
export function TuroListingCta({
  title = `See our Houston cars on ${TURO_PARTNER_LABEL}`,
  lead = `Our rental fleet — a Hyundai Venue and a Chevrolet Trax — is based in the ${RENTAL_AREA_LABEL}. Open a live listing for dates, total price, and pickup details, then book on ${TURO_PARTNER_LABEL} if it fits your trip.`,
  className = "",
  showImages = false,
}: Props) {
  return (
    <section
      className={`max-w-3xl overflow-hidden rounded-lg border border-line bg-elevated/40 ${className}`}
    >
      <div className="px-5 py-5 md:px-6">
        <h2 className="font-display text-xl tracking-tight md:text-2xl">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted md:text-base">
          {lead}
        </p>

        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {turoListings.map((listing) => {
            const photo = listing.photos[0];
            const name = rentalListingName(listing);
            return (
              <li key={listing.id} className="flex flex-col gap-3">
                {showImages && photo ? (
                  <a
                    href={listing.url}
                    className="focus-ring group relative block aspect-[16/10] overflow-hidden rounded-md bg-soft"
                    rel={TURO_LINK_REL}
                    target="_blank"
                    aria-label={`View ${name} listing on ${TURO_PARTNER_LABEL}`}
                  >
                    <CatalogImage
                      src={photo.src}
                      alt={photo.alt}
                      fill
                      quality={55}
                      sizes="(max-width: 768px) 100vw, 360px"
                      className="object-cover transition duration-500 group-hover:scale-[1.02]"
                    />
                  </a>
                ) : null}
                <a
                  href={listing.url}
                  className="focus-ring inline-flex items-center justify-center rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-[#071018] transition hover:brightness-110"
                  rel={TURO_LINK_REL}
                  target="_blank"
                >
                  {name} on {TURO_PARTNER_LABEL}
                </a>
              </li>
            );
          })}
        </ul>

        <p className="mt-4 text-sm">
          <Link
            href={HOBBY_AIRPORT_PATH}
            className="text-accent underline-offset-2 hover:underline"
          >
            Car rentals near Hobby Airport (HOU)
          </Link>
        </p>

        <p className="mt-3 text-xs text-muted">
          Opens {TURO_PARTNER_LABEL} in a new tab. These are the site owner’s
          own listings; availability, pricing, and pickup instructions are set
          on {TURO_PARTNER_LABEL}, not by {SITE.name}.
        </p>
      </div>
    </section>
  );
}
