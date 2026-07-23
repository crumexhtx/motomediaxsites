import { SITE } from "@/data/catalog";

export function absoluteUrl(path: string) {
  const base = SITE.url.replace(/\/$/, "");
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
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

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    alternateName: SITE.shortName,
    url: SITE.url,
    description: SITE.description,
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
