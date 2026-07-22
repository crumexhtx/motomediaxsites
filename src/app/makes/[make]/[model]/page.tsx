import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ModelCard, YearChips } from "@/components/ModelCard";
import { getModel, yearHref } from "@/lib/catalog";
import { JsonLd, absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";

type Props = {
  params: Promise<{ make: string; model: string }>;
};

export const dynamicParams = true;
/** Always resolve from live catalog — avoids stale Turbopack static-param 404s. */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection();
  const { make: makeSlug, model: modelSlug } = await params;
  const found = getModel(String(makeSlug), String(modelSlug));
  if (!found) return {};

  const { make, model } = found;
  const title = `${make.name} ${model.name} photos & years`;
  const description = `${model.tagline} Browse ${make.name} ${model.name} model years and galleries on motomediax.`;
  const newest = [...model.years].sort((a, b) => b.year - a.year)[0];
  const image = newest?.images[0];
  const ogImage = image
    ? {
        url: image.src.startsWith("http")
          ? image.src
          : absoluteUrl(image.src),
        alt: image.alt,
      }
    : undefined;

  return {
    title,
    description,
    alternates: { canonical: `/makes/${make.slug}/${model.slug}` },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/makes/${make.slug}/${model.slug}`),
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function ModelPage({ params }: Props) {
  await connection();
  const raw = await params;
  const makeSlug = String(raw.make ?? "");
  const modelSlug = String(raw.model ?? "");
  const found = getModel(makeSlug, modelSlug);
  if (!found) notFound();

  const { make, model } = found;
  const yearsSorted = [...model.years].sort((a, b) => b.year - a.year);

  return (
    <div className="container-wide py-10 md:py-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Makes", path: "/makes" },
          { name: make.name, path: `/makes/${make.slug}` },
          { name: model.name, path: `/makes/${make.slug}/${model.slug}` },
        ])}
      />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Makes", href: "/makes" },
          { label: make.name, href: `/makes/${make.slug}` },
          { label: model.name },
        ]}
      />
      <header className="mt-6 max-w-3xl">
        <p className="text-xs uppercase tracking-[0.16em] text-muted">
          {make.name}
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">
          {model.name}
        </h1>
        <p className="mt-3 text-lg text-muted">{model.tagline}</p>
      </header>

      <section className="mt-8">
        <h2 className="mb-3 text-xs uppercase tracking-[0.16em] text-muted">
          Model years
        </h2>
        <YearChips
          years={yearsSorted}
          makeSlug={make.slug}
          modelSlug={model.slug}
        />
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-2xl tracking-tight">Year galleries</h2>
        <ul className="space-y-3">
          {yearsSorted.map((year) => (
            <li key={year.slug}>
              <ModelCard
                href={yearHref(make.slug, model.slug, year.slug)}
                title={`${year.year} ${make.name} ${model.name}`}
                subtitle={`${year.summary}${
                  year.specs?.overallRating
                    ? ` · NHTSA ${year.specs.overallRating}/5`
                    : year.highlights?.[0]
                      ? ` · ${year.highlights[0]}`
                      : ""
                }`}
                image={year.images[0]}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
