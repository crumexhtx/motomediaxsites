import type { Metadata } from "next";
import type { GalleryImage } from "@/data/catalog";
import { absoluteUrl, buildMetadata } from "@/lib/seo";

export const TURO_PARTNER_LABEL = "Turo";

/** Path of the Hobby Airport landing page. */
export const HOBBY_AIRPORT_PATH = "/rentals/houston/hobby-airport";

/** Coarse location only — never publish a street address. */
export const RENTAL_AREA_LABEL = "Hobby Airport area, southeast Houston";

export type RentalPhoto = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /**
   * True when the photo is a stand-in (not the actual listing vehicle).
   * Placeholder photos are labelled in the UI and left out of JSON-LD.
   */
  placeholder?: boolean;
};

export type TuroListing = {
  /** Turo vehicle id (last path segment of the listing URL). */
  id: string;
  slug: string;
  url: string;
  /** TODO per listing: null until the real model year is confirmed. */
  year: number | null;
  make: string;
  model: string;
  /** TODO per listing: null until the real trim is confirmed. */
  trim: string | null;
  seats: number;
  mpgCombined: number | null;
  /** USD per day, only when confirmed. Drives `offers` in JSON-LD. */
  fromPricePerDay: number | null;
  /** TODO per listing: leave empty until confirmed from the live listing. */
  features: readonly string[];
  photos: readonly RentalPhoto[];
  /** Catalog model page, or null when the model is not in the catalog. */
  catalogPath: string | null;
};

/**
 * The site owner's own Turo listings (Houston, TX).
 * Do not invent year / trim / price / features — fill them from the live listing.
 */
export const turoListings: readonly TuroListing[] = [
  {
    id: "3970774",
    slug: "hyundai-venue",
    url: "https://turo.com/us/en/suv-rental/united-states/houston-tx/hyundai/venue/3970774",
    year: null, // TODO: fill actual year
    make: "Hyundai",
    model: "Venue",
    trim: null, // TODO
    seats: 5,
    mpgCombined: null, // TODO — Venue is not in the catalog
    fromPricePerDay: null,
    features: [], // TODO
    photos: [
      {
        // TODO: replace with real Venue photos, e.g. /rentals/hyundai-venue-1.jpg
        src: "/catalog/hyundai--elantra.jpg",
        alt: "Placeholder photo (Hyundai Elantra) — Hyundai Venue listing photo coming soon",
        width: 1280,
        height: 720,
        placeholder: true,
      },
    ],
    catalogPath: null, // TODO when Venue is added to the catalog
  },
  {
    id: "3905905",
    slug: "chevrolet-trax",
    url: "https://turo.com/us/en/suv-rental/united-states/houston-tx/chevrolet/trax/3905905",
    year: null, // TODO: which model year is the listing
    make: "Chevrolet",
    model: "Trax",
    trim: null, // TODO: LT / ACTIV / 2RS
    seats: 5,
    mpgCombined: 30, // from catalog Trax years (2024–2026)
    fromPricePerDay: null,
    features: [], // TODO
    photos: [
      {
        src: "/catalog/chevrolet--trax.jpg",
        alt: "Chevrolet Trax — Houston Turo listing",
        width: 1600,
        height: 900,
      },
    ],
    catalogPath: "/makes/chevrolet/trax", // model page exists; listing year TBD
  },
];

export function getTuroListing(slug: string): TuroListing | undefined {
  return turoListings.find((l) => l.slug === slug);
}

/** The site owner's rental listing for a catalog model, if one exists. */
export function getRentalListingForModel(
  makeSlug: string,
  modelSlug: string,
): TuroListing | undefined {
  return turoListings.find(
    (l) => l.catalogPath === `/makes/${makeSlug}/${modelSlug}`,
  );
}

/** "Hyundai Venue", or "2024 Chevrolet Trax LT" once year / trim are filled. */
export function rentalListingName(listing: TuroListing): string {
  return [listing.year, listing.make, listing.model, listing.trim]
    .filter((part) => part !== null && part !== "")
    .join(" ");
}

/**
 * @deprecated Use `turoListings`. Kept for backward compatibility —
 * points at the Chevrolet Trax listing.
 */
export const TURO_LISTING_URL = getTuroListing("chevrolet-trax")!.url;

/** Outbound Turo links: sponsored per the site's disclosure policy. */
export const TURO_LINK_REL = "noopener sponsored";

export const RENTAL_OWNER_DISCLOSURE = {
  heading: "Disclosure",
  body: `These are the site owner’s own cars, listed on ${TURO_PARTNER_LABEL}. Price, availability, and trip rules are set on ${TURO_PARTNER_LABEL}, not on this site. The cars are based in the ${RENTAL_AREA_LABEL}; exact pickup details come from the live listing. Links to ${TURO_PARTNER_LABEL} are marked as sponsored.`,
} as const;

/**
 * Photos for the listing CTA on /rentals pages.
 * Prefer real listing shots under `/public/rentals/` when available;
 * catalog Trax images are used until those are added.
 */
export const RENTAL_LISTING_IMAGES: GalleryImage[] = [
  {
    src: "/catalog/chevrolet--trax.jpg",
    alt: "Chevrolet Trax — rental fleet listing vehicle",
    width: 1600,
    height: 900,
  },
  {
    src: "/catalog/chevrolet--trax--lt.jpg",
    alt: "Chevrolet Trax LT",
    width: 1280,
    height: 720,
  },
  {
    src: "/catalog/chevrolet--trax--activ.jpg",
    alt: "Chevrolet Trax ACTIV",
    width: 1280,
    height: 720,
  },
  {
    src: "/catalog/chevrolet--trax--2rs.jpg",
    alt: "Chevrolet Trax 2RS",
    width: 1280,
    height: 720,
  },
];

/** Listing vehicle shown in rental CTAs (not an LLC / host brand name). */
export const RENTAL_LISTING = {
  makeName: "Chevrolet",
  modelName: "Trax",
  bodyStyle: "compact SUV",
  market: "Houston, TX",
  /** Catalog paths used when the model exists. */
  catalogMakeSlug: "chevrolet",
  catalogModelSlug: "trax",
  images: RENTAL_LISTING_IMAGES,
} as const;

export type RentalGuide = {
  href: string;
  title: string;
  shortTitle: string;
  description: string;
};

export const RENTAL_GUIDES: RentalGuide[] = [
  {
    href: "/rentals/how-to-choose",
    title: "How to pick a rental car on Turo",
    shortTitle: "How to choose",
    description:
      "Reviews, total price, delivery vs pickup, mileage limits, and vehicle age — what to check before you book.",
  },
  {
    href: "/rentals/what-to-expect",
    title: "What to expect when renting on Turo",
    shortTitle: "What to expect",
    description:
      "Lockbox pickup, photo check-in, protection plans, guest requirements, and what to do if something goes wrong.",
  },
  {
    href: "/rentals/houston",
    title: "Rent a car in Houston on Turo",
    shortTitle: "Houston",
    description:
      "Hobby (HOU) vs Bush (IAH), delivery options, and when peer-to-peer rental beats a counter or a short-term purchase.",
  },
];

/**
 * ItemList of Car entities for the fleet. No aggregateRating / review.
 * `offers` is only emitted when `fromPricePerDay` is set; `vehicleModelDate`
 * only when `year` is set; placeholder photos are omitted.
 */
export function turoListingsItemListJsonLd(
  listings: readonly TuroListing[] = turoListings,
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: listings.map((listing, index) => {
      const photo = listing.photos.find((p) => !p.placeholder);
      return {
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Car",
          name: rentalListingName(listing),
          brand: { "@type": "Brand", name: listing.make },
          model: listing.model,
          ...(listing.year !== null
            ? { vehicleModelDate: String(listing.year) }
            : {}),
          vehicleSeatingCapacity: listing.seats,
          ...(photo ? { image: absoluteUrl(photo.src) } : {}),
          url: listing.url,
          ...(listing.fromPricePerDay !== null
            ? {
                offers: {
                  "@type": "Offer",
                  price: listing.fromPricePerDay,
                  priceCurrency: "USD",
                  url: listing.url,
                },
              }
            : {}),
        },
      };
    }),
  };
}

export function rentalPageMetadata(input: {
  title: string;
  description: string;
  path: string;
  /** Page-specific OG/Twitter image. Defaults to the first fleet image. */
  image?: { src: string; alt: string };
}): Metadata {
  const hero = input.image ?? RENTAL_LISTING_IMAGES[0];
  return buildMetadata({
    title: input.title,
    description: input.description,
    path: input.path,
    type: "article",
    ...(hero ? { image: hero.src, imageAlt: hero.alt } : {}),
  });
}
