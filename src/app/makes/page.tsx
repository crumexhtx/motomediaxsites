import type { Metadata } from "next";
import { MakeGrid } from "@/components/MakeGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getAllMakes } from "@/lib/catalog";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "All makes",
  description:
    "Browse every car make in the motomediax catalog, A–Z. Open a marque to explore models and years.",
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
          {makes.length} marques. Pick one to browse models and photo galleries.
        </p>
      </header>
      <div className="mt-10">
        <MakeGrid makes={makes} />
      </div>
    </div>
  );
}
