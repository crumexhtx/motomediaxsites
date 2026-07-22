import Link from "next/link";
import { CatalogImage } from "@/components/CatalogImage";
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
  const cover = image ?? makeCoverImage(make);
  const isPhoto = Boolean(cover.src) && !cover.src.endsWith(".svg");

  return (
    <Link
      href={makeHref(make.slug)}
      className="make-tile focus-ring group block overflow-hidden rounded-xl border border-line bg-elevated"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-soft">
        {isPhoto ? (
          <CatalogImage
            src={cover.src}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 30% 20%, rgba(61,156,240,0.18), transparent 55%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.06), transparent 45%)",
            }}
          />
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

        <div className="absolute left-4 top-4 z-10">
          <BrandBadge
            slug={make.slug}
            name={make.name}
            className="h-10 w-10 opacity-90 drop-shadow transition duration-300 group-hover:scale-105 sm:h-11 sm:w-11"
          />
        </div>

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
