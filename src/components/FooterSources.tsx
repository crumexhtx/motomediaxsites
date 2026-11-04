"use client";

import { usePathname } from "next/navigation";
import { RENTAL_OWNER_DISCLOSURE } from "@/lib/rentals";

/** Context-aware footer note: rentals disclosure on /rentals/*, data sources elsewhere. */
export function FooterSources() {
  const pathname = usePathname();
  const isRentals =
    pathname === "/rentals" || pathname?.startsWith("/rentals/") === true;

  if (isRentals) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.16em] text-muted">
          {RENTAL_OWNER_DISCLOSURE.heading}
        </p>
        <p className="leading-relaxed text-muted">
          {RENTAL_OWNER_DISCLOSURE.body}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">Sources</p>
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
        . Year videos are embedded from YouTube and credited to their owners
        on each page. Not affiliated with manufacturers.
      </p>
    </div>
  );
}
