import Link from "next/link";
import { FooterSources } from "@/components/FooterSources";
import { SITE } from "@/data/catalog";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-[var(--bg)]">
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
            <Link href="/compare" className="focus-ring hover:text-accent">
              Comparisons
            </Link>
            <Link href="/reliability" className="focus-ring hover:text-accent">
              Reliability
            </Link>
            <Link href="/rentals" className="focus-ring hover:text-accent">
              Rentals
            </Link>
            <Link href="/efficiency" className="focus-ring hover:text-accent">
              Find cars by MPG
            </Link>
            <Link href="/recalls" className="focus-ring hover:text-accent">
              Recent recalls
            </Link>
            <Link href="/search" className="focus-ring hover:text-accent">
              Search
            </Link>
            <Link href="/about" className="focus-ring hover:text-accent">
              About
            </Link>
          </div>
          <FooterSources />
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-wide py-4 text-xs text-muted">
          <p>
            © {new Date().getFullYear()} {SITE.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
