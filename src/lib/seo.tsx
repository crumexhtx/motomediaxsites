import type { Metadata } from "next";
import { SITE, SITE_URL } from "@/data/catalog";

export function absoluteUrl(path: string) {
  const base = SITE_URL.replace(/\/$/, "");
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Neutral, non-vehicle-specific Open Graph card (see src/app/og/default/route.tsx). */
export const DEFAULT_OG_IMAGE_PATH = "/og/default";
export const DEFAULT_OG_IMAGE_ALT = `${SITE.name} — ${SITE.tagline}`;

export type BuildMetadataInput = {
  title: string;
  description: string;
  /** Site-relative path used for the canonical URL and og:url. */
  path: string;
  /** Site path (`/catalog/…`) or absolute URL. Defaults to the neutral brand card. */
  image?: string;
  imageAlt?: string;
  /** Open Graph type; guides/articles can pass "article". */
  type?: "website" | "article";
};

/**
 * One place to emit title, description, canonical, Open Graph, and Twitter
 * tags together so pages never ship og/twitter out of sync.
 */
export function buildMetadata({
  title,
  description,
  path,
  image,
  imageAlt,
  type = "website",
}: BuildMetadataInput): Metadata {
  const imageUrl = image
    ? image.startsWith("http")
      ? image
      : absoluteUrl(image)
    : absoluteUrl(DEFAULT_OG_IMAGE_PATH);
  const alt = image ? (imageAlt?.trim() || title) : DEFAULT_OG_IMAGE_ALT;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type,
      siteName: SITE.name,
      title,
      description,
      url: absoluteUrl(path),
      images: [{ url: imageUrl, alt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: imageUrl, alt }],
    },
  };
}

type BreadcrumbItem = { name: string; path: string };

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** Square 512×512 PNG of the MMX mark (see scripts/generate-mmx-logo.mjs). */
export const ORGANIZATION_LOGO_PATH = "/mmx-logo.png";

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    alternateName: SITE.shortName,
    url: SITE.url,
    logo: absoluteUrl(ORGANIZATION_LOGO_PATH),
    description: SITE.description,
  };
}

export function articleJsonLd(input: {
  title: string;
  description: string;
  path: string;
  dateModified?: string;
}) {
  const url = absoluteUrl(input.path);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    url,
    mainEntityOfPage: url,
    isPartOf: {
      "@type": "WebSite",
      name: SITE.name,
      alternateName: SITE.shortName,
      url: SITE.url,
    },
    author: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
    },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
    },
    ...(input.dateModified
      ? { dateModified: input.dateModified }
      : {}),
  };
}

export function faqPageJsonLd(
  faqs: Array<{ question: string; answer: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/**
 * Year overview pages are informational catalogs, not product listings.
 * Avoid schema.org Vehicle/Car (Product subtypes) — Google then expects
 * offers / review / aggregateRating for Product rich results.
 */
export function yearPageJsonLd(input: {
  make: string;
  model: string;
  year: number;
  description: string;
  image: string;
  path: string;
}) {
  const name = `${input.year} ${input.make} ${input.model}`;
  const url = absoluteUrl(input.path);
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description: input.description,
    url,
    image: input.image,
    isPartOf: {
      "@type": "WebSite",
      name: SITE.name,
      alternateName: SITE.shortName,
      url: SITE.url,
    },
    about: {
      "@type": "Thing",
      name,
      description: input.description,
      image: input.image,
    },
    primaryImageOfPage: {
      "@type": "ImageObject",
      contentUrl: input.image,
      url: input.image,
    },
  };
}

/** @deprecated Use yearPageJsonLd — Vehicle markup triggers Product rich-result checks. */
export function vehicleJsonLd(
  input: Parameters<typeof yearPageJsonLd>[0],
) {
  return yearPageJsonLd(input);
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // Escape `<` so third-party copy cannot break out of the script element.
  const json = JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
