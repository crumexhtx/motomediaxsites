import type { Metadata } from "next";
import type { GalleryImage } from "@/data/catalog";
import { SITE } from "@/data/catalog";
import { absoluteUrl } from "@/lib/seo";

/**
 * Outbound Turo listing for the rental guides.
 * Swap this when the host profile or vehicle listing URL changes.
 */
export const TURO_LISTING_URL =
  "https://turo.com/us/en/suv-rental/united-states/houston-tx/chevrolet/trax/3905905";

export const TURO_PARTNER_LABEL = "Turo";

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

export function rentalPageMetadata(input: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const url = absoluteUrl(input.path);
  const hero = RENTAL_LISTING_IMAGES[0];
  const ogImage = hero
    ? {
        url: absoluteUrl(hero.src),
        alt: hero.alt,
      }
    : undefined;

  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: input.path },
    openGraph: {
      type: "article",
      siteName: SITE.name,
      title: input.title,
      description: input.description,
      url,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      ...(ogImage ? { images: [ogImage.url] } : {}),
    },
  };
}
