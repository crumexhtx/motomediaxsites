import type { Metadata } from "next";
import { MakeGrid } from "@/components/MakeGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SITE } from "@/data/catalog";
import { getAllMakes } from "@/lib/catalog";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "All makes",
  description:
    `Compare used model years across every make in the ${SITE.name} catalog — recalls, complaints, and year-over-year changes.`,
  alternates: { canonical: "/makes" },
};

export default function MakesIndexPage() {
  const makes = getAllMakes();

  return (
    <div className="container-wide py-10 md:py-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Makes", path: "/makes" },
        ])}
      />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Makes" },
        ]}
      />
      <header className="mt-6 max-w-2xl">
        <h1 className="font-display text-4xl tracking-tight md:text-5xl">
          All makes
        </h1>
        <p className="mt-3 text-muted">
          {makes.length} marques. Pick one to compare model years, check
          recalls, and find the right used year.
        </p>
      </header>
      <div className="mt-10">
        <MakeGrid makes={makes} />
      </div>
    </div>
  );
}
