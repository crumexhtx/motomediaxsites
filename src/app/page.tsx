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
  const backdropImages = getHeroBackdropImages(1);

  return (
    <>
      <section className="relative isolate min-h-[72svh] overflow-hidden md:min-h-[78svh]">
        <HeroBackdrop images={backdropImages} />
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(8,10,14,0.92)] via-[rgba(8,10,14,0.72)] to-[rgba(8,10,14,0.35)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(61,156,240,0.18),transparent_50%)]" />
        {/* Soft fade into the page so the hero doesn't end on a hard seam */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[var(--bg)] to-transparent md:h-40" />

        <div className="container-wide relative flex min-h-[72svh] flex-col justify-end pb-16 pt-24 md:min-h-[78svh] md:justify-center md:pb-24">
          <p className="fade-up font-display text-4xl tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            {SITE.name}
          </p>
          <h1 className="fade-up-delay mt-4 max-w-2xl text-xl font-medium leading-tight text-white sm:text-2xl md:text-3xl">
            Car photos organized the way you actually browse.
          </h1>
          <p className="fade-up-delay-2 mt-3 max-w-xl text-base leading-relaxed text-white/75">
            Make → model → year, with clearer navigation and pages built for
            search.
          </p>
          <div className="fade-up-delay-2 mt-7 flex flex-wrap gap-3">
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

      <section className="relative overflow-hidden pb-20 pt-6 md:pt-10">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 0% 0%, rgba(61,156,240,0.08), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 30%, rgba(255,255,255,0.03), transparent 50%)",
          }}
        />
        <div className="container-wide">
          <div className="mb-8 max-w-2xl">
            <h2 className="font-display text-3xl tracking-tight md:text-4xl">
              Start with a make
            </h2>
            <p className="mt-2 text-muted">
              Jump into popular marques, then drill into models and model years.
            </p>
            <Link
              href="/makes"
              className="focus-ring mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent transition hover:gap-2.5"
            >
              View all makes
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <MakeGrid makes={makes} />
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-line/60">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          aria-hidden="true"
          style={{
            background:
              "linear-gradient(180deg, rgba(18,22,28,0.55) 0%, rgba(10,12,15,0) 100%)",
          }}
        />
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
                  className="focus-ring group block overflow-hidden rounded-xl border border-line bg-elevated/60 transition hover:border-accent/40"
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
