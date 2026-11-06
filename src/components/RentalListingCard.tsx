import Link from "next/link";
import { CatalogImage } from "@/components/CatalogImage";
import { TuroListingButton } from "@/components/TuroListingButton";
import {
  RENTAL_CARD_PITCH,
  TRAX_LISTING_STATS,
  TURO_LINK_REL,
  TURO_PARTNER_LABEL,
  rentalListingName,
  type TuroListing,
} from "@/lib/rentals";

type Props = {
  listing: TuroListing;
  className?: string;
  /** Show the /rentals buyer pitch under the title. */
  showPitch?: boolean;
  /**
   * Show Trax rating / trip line from TRAX_LISTING_STATS.
   * Venue never shows ratings here — add only once that listing has real reviews.
   */
  showTraxStats?: boolean;
};

function carKey(listing: TuroListing): "venue" | "trax" {
  return listing.slug.includes("trax") ? "trax" : "venue";
}

/**
 * One fleet vehicle: photo, name, quick specs, features, and Turo CTA.
 * Missing data is hidden — never a placeholder or guessed value.
 */
export function RentalListingCard({
  listing,
  className = "",
  showPitch = false,
  showTraxStats = false,
}: Props) {
  const photo = listing.photos[0];
  const name = rentalListingName(listing);
  const pitch = showPitch ? RENTAL_CARD_PITCH[listing.slug] : undefined;
  const isTrax = listing.slug === "chevrolet-trax";

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-lg border border-line bg-elevated/40 ${className}`}
    >
      {photo ? (
        <a
          href={listing.url}
          className="focus-ring group relative block aspect-[16/10] bg-soft"
          rel={TURO_LINK_REL}
          target="_blank"
          data-track="turo-click"
          data-car={carKey(listing)}
          aria-label={`View ${name} listing on ${TURO_PARTNER_LABEL}`}
        >
          <CatalogImage
            src={photo.src}
            alt={photo.alt}
            fill
            quality={55}
            sizes="(max-width: 768px) 100vw, 384px"
            className="object-cover transition duration-500 group-hover:scale-[1.02]"
          />
          {photo.placeholder ? (
            <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
              Placeholder photo
            </span>
          ) : null}
        </a>
      ) : null}

      <div className="flex flex-1 flex-col px-5 py-5">
        <h3 className="font-display text-xl tracking-tight">{name}</h3>
        {pitch ? (
          <p className="mt-2 text-sm leading-relaxed text-muted">{pitch}</p>
        ) : null}
        {showTraxStats && isTrax ? (
          <p className="mt-2 text-sm font-medium text-foreground">
            Rated {TRAX_LISTING_STATS.rating.toFixed(1)} on {TURO_PARTNER_LABEL}{" "}
            · {TRAX_LISTING_STATS.tripsHosted} trips hosted
          </p>
        ) : null}
        {/* Venue: do not show rating or trip count until that listing has real reviews. */}

        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {listing.year !== null ? (
            <>
              <dt className="text-muted">Year</dt>
              <dd>{listing.year}</dd>
            </>
          ) : null}
          {listing.trim ? (
            <>
              <dt className="text-muted">Trim</dt>
              <dd>{listing.trim}</dd>
            </>
          ) : null}
          <dt className="text-muted">Seats</dt>
          <dd>{listing.seats}</dd>
          {listing.mpgCombined !== null ? (
            <>
              <dt className="text-muted">MPG (combined)</dt>
              <dd>{listing.mpgCombined}</dd>
            </>
          ) : null}
          {listing.features.length > 0 ? (
            <>
              <dt className="text-muted">Features</dt>
              <dd>
                <ul className="flex flex-wrap gap-1.5">
                  {listing.features.map((feature) => (
                    <li
                      key={feature}
                      className="rounded border border-line px-1.5 py-0.5 text-xs"
                    >
                      {feature}
                    </li>
                  ))}
                </ul>
              </dd>
            </>
          ) : null}
        </dl>

        <div className="mt-auto pt-5">
          <TuroListingButton href={listing.url} car={carKey(listing)} />
          {listing.catalogPath ? (
            <p className="mt-3 text-sm">
              <Link
                href={listing.catalogPath}
                className="text-accent underline-offset-2 hover:underline"
              >
                {listing.make} {listing.model}
                {" · "}
                Specs, years &amp; recalls
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/** Two-up grid of fleet cards. */
export function RentalListingGrid({
  listings,
  className = "",
  showPitch = false,
  showTraxStats = false,
}: {
  listings: readonly TuroListing[];
  className?: string;
  showPitch?: boolean;
  showTraxStats?: boolean;
}) {
  return (
    <div className={`grid gap-5 md:grid-cols-2 ${className}`}>
      {listings.map((listing) => (
        <RentalListingCard
          key={listing.id}
          listing={listing}
          showPitch={showPitch}
          showTraxStats={showTraxStats}
        />
      ))}
    </div>
  );
}
