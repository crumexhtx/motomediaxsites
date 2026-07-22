import Link from "next/link";
import { SITE } from "@/data/catalog";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-elevated/60">
      <div className="container-wide grid gap-8 py-12 md:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="font-display text-2xl tracking-tight">{SITE.name}</p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
            {SITE.description}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">
              Explore
            </p>
            <Link href="/makes" className="focus-ring hover:text-accent">
              All makes
            </Link>
            <Link href="/search" className="focus-ring hover:text-accent">
              Search
            </Link>
            <Link href="/about" className="focus-ring hover:text-accent">
              About
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">
              Sources
            </p>
            <p className="leading-relaxed text-muted">
              Photos and overviews from{" "}
              <a
                href="https://www.wikipedia.org/"
                className="text-foreground underline-offset-2 hover:underline"
                rel="noreferrer"
                target="_blank"
              >
                Wikipedia
              </a>
              /Wikimedia; vehicle specs from{" "}
              <a
                href="https://www.nhtsa.gov/"
                className="text-foreground underline-offset-2 hover:underline"
                rel="noreferrer"
                target="_blank"
              >
                NHTSA
              </a>
              . Year videos are embedded from YouTube and credited to their
              owners on each page. Not affiliated with manufacturers.
            </p>
          </div>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-wide flex flex-wrap items-center justify-between gap-3 py-4 text-xs text-muted">
          <p>© {new Date().getFullYear()} {SITE.name}</p>
          <p>Built for clearer car browsing and SEO-friendly discovery.</p>
        </div>
      </div>
    </footer>
  );
}
