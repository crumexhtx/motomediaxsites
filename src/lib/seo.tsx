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
    url: SITE.url,
    description: SITE.description,
  };
}

export function vehicleJsonLd(input: {
  make: string;
  model: string;
  year: number;
  description: string;
  image: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Vehicle",
    name: `${input.year} ${input.make} ${input.model}`,
    brand: {
      "@type": "Brand",
      name: input.make,
    },
    model: input.model,
    vehicleModelDate: String(input.year),
    description: input.description,
    image: input.image,
    url: absoluteUrl(input.path),
  };
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
