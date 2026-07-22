import Link from "next/link";
import { HeroBackdrop } from "@/components/HeroBackdrop";
import { CatalogImage } from "@/components/CatalogImage";
import { MakeGrid } from "@/components/MakeGrid";
import { SITE } from "@/data/catalog";
import {
  getAllMakes,
  getHeroBackdropImages,
  getLatestEntries,
} from "@/lib/catalog";

export default function HomePage() {
  const makes = getAllMakes().slice(0, 6);
  const latest = getLatestEntries(6);
  const backdropImages = getHeroBackdropImages(6);

  return (
    <>
      <section className="relative min-h-[35svh] overflow-hidden">
        <HeroBackdrop images={backdropImages} />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/35" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(61,156,240,0.22),transparent_45%)]" />

        <div className="container-wide relative flex min-h-[35svh] flex-col justify-end pb-8 pt-20 md:justify-center md:pb-10">
          <p className="fade-up font-display text-3xl tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
            {SITE.name}
          </p>
          <h1 className="fade-up-delay mt-3 max-w-2xl text-lg font-medium leading-tight text-white sm:text-xl md:text-2xl">
            Car photos organized the way you actually browse.
          </h1>
          <p className="fade-up-delay-2 mt-2 max-w-xl text-sm leading-relaxed text-white/75">
            Make → model → year, with clearer navigation and pages built for
            search.
          </p>
          <div className="fade-up-delay-2 mt-5 flex flex-wrap gap-3">
            <Link
              href="/makes"
              className="focus-ring inline-flex items-center rounded-md bg-accent px-5 py-3 text-sm font-semibold text-[#071018] transition hover:brightness-110"
            >
              Browse makes
            </Link>
            <Link
              href="/search"
              className="focus-ring inline-flex items-center rounded-md border border-white/30 bg-white/5 px-5 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10"
            >
              Search catalog
            </Link>
          </div>
        </div>
      </section>

      <section className="container-wide py-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl tracking-tight md:text-4xl">
              Start with a make
            </h2>
            <p className="mt-2 max-w-xl text-muted">
              Jump into popular marques, then drill into models and model years.
            </p>
          </div>
          <Link href="/makes" className="focus-ring text-sm text-accent hover:underline">
            View all
          </Link>
        </div>
        <MakeGrid makes={makes} />
      </section>

      <section className="border-y border-line bg-elevated/40">
        <div className="container-wide py-20">
          <h2 className="font-display text-3xl tracking-tight md:text-4xl">
            Latest model years
          </h2>
          <p className="mt-2 max-w-xl text-muted">
            Recent entries from the catalog—each with its own SEO page. Photos
            and copy come from Wikipedia/Wikimedia; specs from NHTSA when
            available.
          </p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((entry) => (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  className="focus-ring group block overflow-hidden rounded-xl border border-line bg-background transition hover:border-accent/40"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <CatalogImage
                      src={entry.image.src}
                      alt={entry.image.alt}
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted">
                      {entry.year.year}
                    </p>
                    <p className="mt-1 font-display text-xl tracking-tight">
                      {entry.make.name} {entry.model.name}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
