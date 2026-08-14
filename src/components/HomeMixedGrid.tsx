import Link from "next/link";
import { CatalogImage } from "@/components/CatalogImage";
import type { HomeMixedEntry } from "@/lib/catalog";

const TYPE_LABEL: Record<HomeMixedEntry["type"], string> = {
  make: "Make",
  model: "Model",
  year: "Model year",
};

function HomeMixedTile({ entry }: { entry: HomeMixedEntry }) {
  return (
    <Link
      href={entry.href}
      className="focus-ring group block overflow-hidden rounded-xl border border-line bg-elevated transition hover:border-accent/40"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-soft">
        {entry.image.src.endsWith(".svg") ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(160deg,#151a22_0%,#0f1319_100%)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={entry.image.src}
              alt={entry.image.alt}
              className="brand-badge h-16 w-16 opacity-95 drop-shadow transition duration-300 group-hover:scale-105"
              width={64}
              height={64}
            />
          </div>
        ) : (
          <CatalogImage
            src={entry.image.src}
            alt={entry.image.alt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        )}
      </div>
      <div className="p-4">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">
          {TYPE_LABEL[entry.type]}
        </p>
        <p className="mt-1 font-display text-xl tracking-tight">
          {entry.title}
        </p>
        <p className="mt-1 line-clamp-1 text-sm text-muted">
          {entry.subtitle}
        </p>
      </div>
    </Link>
  );
}

export function HomeMixedGrid({ entries }: { entries: HomeMixedEntry[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map((entry) => (
        <li key={entry.key}>
          <HomeMixedTile entry={entry} />
        </li>
      ))}
    </ul>
  );
}
