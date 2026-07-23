import Link from "next/link";
import type { GalleryImage, MakeEntry } from "@/data/catalog";
import { makeCoverImage, makeHref } from "@/lib/catalog";

function BrandBadge({
  slug,
  name,
  className = "h-14 w-14",
}: {
  slug: string;
  name: string;
  className?: string;
}) {
  return (
    // Local SVG badges from /public/brands — next/image is awkward with SVG.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/brands/${slug}.svg`}
      alt={`${name} badge`}
      className={`brand-badge ${className}`}
      width={56}
      height={56}
    />
  );
}

export function MakeTile({
  make,
  image,
}: {
  make: MakeEntry;
  /** Optional precomputed cover (avoids duplicate lookups in grids). */
  image?: GalleryImage;
}) {
  // Make tiles always present the brand logo — never a car photo.
  const cover = image ?? makeCoverImage(make);
  const logoSrc = cover.src.endsWith(".svg")
    ? cover.src
    : `/brands/${make.slug}.svg`;

  return (
    <Link
      href={makeHref(make.slug)}
      className="make-tile focus-ring group block overflow-hidden rounded-xl border border-line bg-elevated"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[linear-gradient(160deg,#151a22_0%,#0f1319_55%,#1a222d_100%)]">
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(circle at 50% 35%, rgba(61,156,240,0.14), transparent 58%)",
          }}
        />

        <div className="absolute inset-0 flex items-center justify-center pb-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt={`${make.name} logo`}
            className="brand-badge h-16 w-16 opacity-95 drop-shadow transition duration-300 group-hover:scale-105 sm:h-20 sm:w-20"
            width={80}
            height={80}
          />
        </div>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />

        <div className="absolute inset-x-0 bottom-0 z-10 p-4">
          <p className="font-display text-2xl tracking-tight text-white">
            {make.name}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-white/70">
            {make.country} · {make.models.length} models
          </p>
        </div>
      </div>
    </Link>
  );
}

export function MakeGrid({ makes }: { makes: MakeEntry[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {makes.map((make) => (
        <li key={make.slug}>
          <MakeTile make={make} image={makeCoverImage(make)} />
        </li>
      ))}
    </ul>
  );
}

export function MakeHeaderBadge({ make }: { make: MakeEntry }) {
  return (
    <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-xl border border-line bg-soft">
      <BrandBadge slug={make.slug} name={make.name} className="h-9 w-9" />
    </div>
  );
}

/** Shared helper for places that still read coverImage paths. */
export function brandBadgeSrc(slug: string) {
  return `/brands/${slug}.svg`;
}
