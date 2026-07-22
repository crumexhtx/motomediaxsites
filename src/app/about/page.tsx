import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SITE } from "@/data/catalog";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "About",
  description: `Learn about ${SITE.name}—a clearer, SEO-friendly way to browse car photos by make, model, and year.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="container-wide py-10 md:py-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ])}
      />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "About" },
        ]}
      />
      <article className="prose-like mt-6 max-w-2xl">
        <h1 className="font-display text-4xl tracking-tight md:text-5xl">
          About {SITE.name}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          {SITE.name} is a car photo catalog inspired by the browse model of
          sites like NetCarShow—make, then model, then year—with a cleaner UI
          and pages structured for search engines.
        </p>
        <p className="mt-4 leading-relaxed text-muted">
          Catalog entries are built from Wikipedia/Wikimedia (photos and
          overviews) and NHTSA (availability and safety ratings where
          available), covering recent model years for a curated set of popular
          brands. Some year pages embed a YouTube overview video; those clips
          remain owned by their uploaders and are credited on the page. Imagery
          and text are attributed on vehicle pages. Content is best-effort and
          may not match a specific trim or model year photo.
        </p>
        <p className="mt-4 leading-relaxed text-muted">
          Not affiliated with Wikipedia, NHTSA, NetCarShow, or any vehicle
          manufacturer.
        </p>
      </article>
    </div>
  );
}
