import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { YearChips } from "@/components/ModelCard";
import { YearExperience } from "@/components/YearExperience";
import {
  getAllYearParams,
  getYear,
  pickBestCardImage,
  yearHref,
} from "@/lib/catalog";
import {
  JsonLd,
  absoluteUrl,
  breadcrumbJsonLd,
  vehicleJsonLd,
} from "@/lib/seo";

type Props = {
  params: Promise<{ make: string; model: string; year: string }>;
};

export const dynamicParams = true;

export function generateStaticParams() {
  return getAllYearParams();
}

function absolutizeImage(src: string) {
  return src.startsWith("http") ? src : absoluteUrl(src);
}

function orderedYearImages(
  makeName: string,
  modelName: string,
  images: { src: string; alt: string; width?: number; height?: number }[],
) {
  const best = pickBestCardImage(images, {
    makeName,
    modelName,
  });
  if (!best) return images;
  return [best, ...images.filter((img) => img.src !== best.src)];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { make: makeSlug, model: modelSlug, year: yearSlug } = await params;
  const found = getYear(String(makeSlug), String(modelSlug), String(yearSlug));
  if (!found) return { title: "Not found" };

  const { make, model, year } = found;
  const title = `${year.year} ${make.name} ${model.name} photos`;
  const description = year.summary;
  const image =
    pickBestCardImage(year.images, {
      makeName: make.name,
      modelName: model.name,
    }) ?? year.images[0];
  const path = yearHref(make.slug, model.slug, year.slug);
  const ogImage = image
    ? { url: absolutizeImage(image.src), alt: image.alt }
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

export default async function YearPage({ params }: Props) {
  const raw = await params;
  const makeSlug = String(raw.make ?? "");
  const modelSlug = String(raw.model ?? "");
  const yearSlug = String(raw.year ?? "");

  const found = getYear(makeSlug, modelSlug, yearSlug);
  if (!found) notFound();

  const { make, model, year } = found;
  const path = yearHref(make.slug, model.slug, year.slug);
  const images = orderedYearImages(make.name, model.name, year.images);
  const hero = images[0];
  const yearsSorted = [...model.years].sort((a, b) => b.year - a.year);
  const title = `${year.year} ${make.name} ${model.name}`;

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Makes", path: "/makes" },
          { name: make.name, path: `/makes/${make.slug}` },
          { name: model.name, path: `/makes/${make.slug}/${model.slug}` },
          { name: String(year.year), path },
        ])}
      />
      <JsonLd
        data={vehicleJsonLd({
          make: make.name,
          model: model.name,
          year: year.year,
          description: year.description,
          image: hero?.src
            ? absolutizeImage(hero.src)
            : absoluteUrl(`/brands/${make.slug}.svg`),
          path,
        })}
      />

      <YearExperience
        title={title}
        summary={year.summary}
        yearLabel={`${year.year}`}
        performance={year.performance}
        specs={year.specs}
        baseImages={images}
        video={year.video}
        nhtsaUrl={year.sources?.nhtsa}
        epaUrl={year.sources?.epa}
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Makes", href: "/makes" },
              { label: make.name, href: `/makes/${make.slug}` },
              { label: model.name, href: `/makes/${make.slug}/${model.slug}` },
              { label: String(year.year) },
            ]}
          />
        }
        yearChips={
          <YearChips
            years={yearsSorted}
            makeSlug={make.slug}
            modelSlug={model.slug}
            activeYear={year.slug}
          />
        }
        overview={
          <section className="mb-12 max-w-3xl">
            <h2 className="font-display text-2xl tracking-tight">Overview</h2>
            <p className="mt-3 text-base leading-relaxed text-muted md:text-lg">
              {year.description}
            </p>
            {year.highlights && year.highlights.length > 0 ? (
              <ul className="mt-5 space-y-2 text-sm text-muted md:text-base">
                {year.highlights.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {year.sources?.wikipedia ? (
              <p className="mt-3 text-sm text-muted">
                Overview adapted from{" "}
                <a
                  href={year.sources.wikipedia}
                  className="underline-offset-2 hover:underline"
                  rel="noreferrer"
                  target="_blank"
                >
                  Wikipedia
                </a>
                .
              </p>
            ) : null}
          </section>
        }
      />
    </>
  );
}
