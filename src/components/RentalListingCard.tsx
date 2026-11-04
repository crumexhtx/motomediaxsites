import Link from "next/link";
import { CatalogImage } from "@/components/CatalogImage";
import {
  TURO_LINK_REL,
  TURO_PARTNER_LABEL,
  rentalListingName,
  type TuroListing,
} from "@/lib/rentals";

type Props = {
  listing: TuroListing;
  className?: string;
};

/**
 * One fleet vehicle: photo, name, quick specs, features, and Turo CTA.
 * Missing data is hidden — never a placeholder or guessed value. No host
 * identity or rating is shown (no AggregateRating JSON-LD either).
 */
export function RentalListingCard({ listing, className = "" }: Props) {
  const photo = listing.photos[0];
  const name = rentalListingName(listing);

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
          <a
            href={listing.url}
            className="focus-ring inline-flex items-center rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-[#071018] transition hover:brightness-110"
            rel={TURO_LINK_REL}
            target="_blank"
          >
            Check dates &amp; price on {TURO_PARTNER_LABEL}
          </a>
          {listing.catalogPath ? (
            <p className="mt-3 text-sm">
              <Link
                href={listing.catalogPath}
                className="text-accent underline-offset-2 hover:underline"
              >
                {listing.make} {listing.model} specs, years &amp; recalls
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
}: {
  listings: readonly TuroListing[];
  className?: string;
}) {
  return (
    <div className={`grid gap-5 md:grid-cols-2 ${className}`}>
      {listings.map((listing) => (
        <RentalListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
