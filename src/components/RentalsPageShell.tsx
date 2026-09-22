import type { ReactNode } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { RentalsGuideNav } from "@/components/RentalsGuideNav";
import { TuroListingCta } from "@/components/TuroListingCta";
import { SITE } from "@/data/catalog";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo";

type Crumb = { label: string; href?: string };

type Props = {
  path: string;
  title: string;
  description: string;
  /** Trail after Home, e.g. [{ label: "Rentals", href: "/rentals" }, { label: "Houston" }] */
  crumbs: Crumb[];
  jsonLd?: Array<Record<string, unknown>>;
  children: ReactNode;
  showCta?: boolean;
  ctaTitle?: string;
  ctaLead?: string;
  showGuideNav?: boolean;
};

/**
 * Shared chrome for /rentals pages — breadcrumbs, header, guide nav, optional CTA.
 * Reuses Breadcrumbs + the same container/header patterns as /compare and /about.
 */
export function RentalsPageShell({
  path,
  title,
  description,
  crumbs,
  jsonLd = [],
  children,
  showCta = true,
  ctaTitle,
  ctaLead,
  showGuideNav = true,
}: Props) {
  const breadcrumbLd = [
    { name: "Home", path: "/" },
    ...crumbs.map((c) => ({
      name: c.label,
      path: c.href ?? path,
    })),
  ];

  const breadcrumbUi = [
    { label: "Home", href: "/" },
    ...crumbs.map((c, i) =>
      i < crumbs.length - 1 && c.href
        ? { label: c.label, href: c.href }
        : { label: c.label },
    ),
  ];

  return (
    <div className="container-wide py-10 md:py-14">
      <JsonLd data={breadcrumbJsonLd(breadcrumbLd)} />
      {jsonLd.map((data, i) => (
        <JsonLd key={i} data={data} />
      ))}
      <Breadcrumbs items={breadcrumbUi} />
      <header className="mt-6 max-w-3xl">
        <p className="text-xs uppercase tracking-[0.16em] text-muted">
          <Link href="/rentals" className="hover:text-accent">
            Rentals
          </Link>
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">
          {title}
        </h1>
        <p className="mt-3 text-muted md:text-lg">{description}</p>
      </header>

      <article className="prose-like mt-10 max-w-3xl">{children}</article>

      {showCta ? (
        <div className="mt-12">
          <TuroListingCta title={ctaTitle} lead={ctaLead} />
        </div>
      ) : null}

      {showGuideNav ? <RentalsGuideNav currentPath={path} /> : null}

      <p className="mt-8 max-w-3xl text-xs text-muted">
        Guides on {SITE.name} are educational. Platform policies, fees, and
        insurance rules change — always confirm details on the live listing and
        in the booking flow before you travel.
      </p>
    </div>
  );
}
