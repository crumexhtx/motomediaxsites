import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ModelCard, YearChips } from "@/components/ModelCard";
import {
  getAllModelParams,
  getModel,
  modelCardImage,
  pickBestCardImage,
  yearHref,
} from "@/lib/catalog";
import { getDiscontinuedInfo } from "@/lib/discontinued";
import { SITE } from "@/data/catalog";
import { JsonLd, absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { RelatedComparisons } from "@/components/RelatedComparisons";

type Props = {
  params: Promise<{ make: string; model: string }>;
};

export const dynamicParams = true;

export function generateStaticParams() {
  return getAllModelParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { make: makeSlug, model: modelSlug } = await params;
  const found = getModel(String(makeSlug), String(modelSlug));
  if (!found) return {};

  const { make, model } = found;
  const path = `/makes/${make.slug}/${model.slug}`;
  const yearsSorted = [...model.years].sort((a, b) => b.year - a.year);
  const yearRange =
    yearsSorted.length > 1
      ? `${yearsSorted[yearsSorted.length - 1].year}–${yearsSorted[0].year}`
      : yearsSorted[0]
        ? String(yearsSorted[0].year)
        : "";
  const title = `${make.name} ${model.name} used years & recalls`;
  const description = `${model.tagline} Compare ${make.name} ${model.name} model years${yearRange ? ` (${yearRange})` : ""} for NHTSA recalls, complaints, and year-over-year changes on ${SITE.name}.`;
  const cover =
    pickBestCardImage(yearsSorted[0]?.images, {
      makeName: make.name,
      modelName: model.name,
    }) ?? modelCardImage(make, model);
  const ogImage =
    cover && !cover.src.endsWith(".svg")
      ? {
          url: cover.src.startsWith("http")
            ? cover.src
            : absoluteUrl(cover.src),
          alt: cover.alt || `${make.name} ${model.name}`,
        }
      : undefined;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: absoluteUrl(path),
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(ogImage ? { images: [ogImage.url] } : {}),
    },
  };
}

/** Indexable model landing — lists years instead of redirecting (GSC “Page with redirect”). */
export default async function ModelPage({ params }: Props) {
  const raw = await params;
  const makeSlug = String(raw.make ?? "");
  const modelSlug = String(raw.model ?? "");
  const found = getModel(makeSlug, modelSlug);
  if (!found) notFound();

  const { make, model } = found;
  const yearsSorted = [...model.years].sort((a, b) => b.year - a.year);
  const path = `/makes/${make.slug}/${model.slug}`;
  const discontinued = getDiscontinuedInfo(make.slug, model.slug);
  const newest = yearsSorted[0];

  return (
    <div className="container-wide py-10 md:py-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Makes", path: "/makes" },
          { name: make.name, path: `/makes/${make.slug}` },
          { name: model.name, path },
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
        {discontinued ? (
          <p className="mt-3 text-sm text-muted">{discontinued.message}</p>
        ) : null}
      </header>

      <section className="mt-8">
        <h2 className="mb-3 text-xs uppercase tracking-[0.16em] text-muted">
          Model years
        </h2>
        <YearChips
          years={yearsSorted}
          makeSlug={make.slug}
          modelSlug={model.slug}
          activeYear={newest?.slug}
        />
        {newest ? (
          <p className="mt-4 text-sm text-muted">
            Start with the newest year:{" "}
            <Link
              href={yearHref(make.slug, model.slug, newest.slug)}
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              {newest.year} {make.name} {model.name}
            </Link>
          </p>
        ) : null}
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
                  year.recalls?.length
                    ? ` · ${year.recalls.length} recall${year.recalls.length === 1 ? "" : "s"}`
                    : year.specs?.overallRating
                      ? ` · NHTSA ${year.specs.overallRating}/5`
                      : year.highlights?.[0]
                        ? ` · ${year.highlights[0]}`
                        : ""
                }`}
                image={
                  pickBestCardImage(year.images, {
                    makeName: make.name,
                    modelName: model.name,
                  }) ?? year.images[0]
                }
              />
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-12">
        <RelatedComparisons
          makeSlug={make.slug}
          modelSlug={model.slug}
          modelName={model.name}
        />
      </div>
    </div>
  );
}
