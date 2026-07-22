import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SearchPanel } from "@/components/SearchPanel";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Search",
  description:
    "Search the motomediax catalog by make, model, or year to find car photo galleries fast.",
  alternates: { canonical: "/search" },
};

type Props = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const raw = params.q;
  const initialQuery = Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");

  return (
    <div className="container-wide py-10 md:py-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Search", path: "/search" },
        ])}
      />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Search" },
        ]}
      />
      <header className="mt-6 max-w-2xl">
        <h1 className="font-display text-4xl tracking-tight md:text-5xl">
          Search
        </h1>
        <p className="mt-3 text-muted">
          Filter makes, models, and years without digging through long directory
          lists.
        </p>
      </header>
      <div className="mt-10 max-w-3xl">
        <SearchPanel initialQuery={initialQuery} />
      </div>
    </div>
  );
}
