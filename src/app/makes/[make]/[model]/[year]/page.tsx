import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DiscontinuedBanner } from "@/components/DiscontinuedBanner";
import { YearChips } from "@/components/ModelCard";
import { YearChanges } from "@/components/YearChanges";
import { YearExperience } from "@/components/YearExperience";
import { YearSafetyPanel } from "@/components/YearSafetyPanel";
import { YearPricingPanel } from "@/components/YearPricingPanel";
import { YearValuationCta } from "@/components/YearValuationCta";
import { YearSnapshot } from "@/components/YearSnapshot";
import { RelatedComparisons } from "@/components/RelatedComparisons";
import type { GalleryImage } from "@/data/catalog";
import {
  getAllYearParams,
  getYear,
  pickBestCardImage,
  yearHref,
} from "@/lib/catalog";
import {
  getDiscontinuedInfo,
  ghostYearRedirectTarget,
  shouldShowDiscontinuedBanner,
} from "@/lib/discontinued";
import { getYearPricing } from "@/lib/pricing";
import { buildYearSnapshot } from "@/lib/yearSnapshot";
import {
  JsonLd,
  absoluteUrl,
  breadcrumbJsonLd,
  yearPageJsonLd,
} from "@/lib/seo";
import { enrichYearSummary, yearSeoDescription } from "@/lib/text";
import { diffYears, findPreviousYear } from "@/lib/yearDiff";

type Props = {
  params: Promise<{ make: string; model: string; year: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllYearParams();
}

function absolutizeImage(src: string) {
  return src.startsWith("http") ? src : absoluteUrl(src);
}

function orderedYearImages(
  makeName: string,
  modelName: string,
  images: GalleryImage[],
): GalleryImage[] {
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
  const description = yearSeoDescription({
    year: year.year,
    makeName: make.name,
    modelName: model.name,
    summary: year.summary,
    description: year.description,
    recallCount: year.recalls?.length,
  });
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

  const ghostTarget = ghostYearRedirectTarget(makeSlug, modelSlug, yearSlug);
  // Non-existent “ghost” years must 404 — a 301 implies the year moved, which
  // Google Search Console reports as “Page with redirect” and blocks indexing.
  if (ghostTarget != null) {
    notFound();
  }

  const found = getYear(makeSlug, modelSlug, yearSlug);
  if (!found) notFound();

  const { make, model, year } = found;
  const path = yearHref(make.slug, model.slug, year.slug);
  const modelPath = `/makes/${make.slug}/${model.slug}`;
  const images = orderedYearImages(make.name, model.name, year.images);
  const hero = images[0];
  const yearsSorted = [...model.years].sort((a, b) => b.year - a.year);
  const title = `${year.year} ${make.name} ${model.name}`;
  const summary = enrichYearSummary({
    year: year.year,
    makeName: make.name,
    modelName: model.name,
    summary: year.summary,
    description: year.description,
  });
  const previousYear = findPreviousYear(model.years, year.year);
  const yearDiff = previousYear ? diffYears(previousYear, year) : null;
  const discontinued = getDiscontinuedInfo(make.slug, model.slug);
  const showBanner =
    shouldShowDiscontinuedBanner(discontinued) &&
    year.year === discontinued?.lastYear;
  const pricing = getYearPricing(make.slug, model.slug, year.year);
  const snapshot = buildYearSnapshot({
    year,
    makeName: make.name,
    makeSlug: make.slug,
    modelName: model.name,
    modelSlug: model.slug,
    yearDiff,
  });

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Makes", path: "/makes" },
          { name: make.name, path: `/makes/${make.slug}` },
          { name: model.name, path: modelPath },
          { name: String(year.year), path },
        ])}
      />
      <JsonLd
        data={yearPageJsonLd({
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
        summary={summary}
        yearLabel={`${year.year}`}
        performance={year.performance}
        specs={year.specs}
        baseImages={images}
        video={year.video}
        nhtsaUrl={year.sources?.nhtsa}
        epaUrl={year.sources?.epa}
        breadcrumbs={
          <Breadcrumbs
            tone="onDark"
            items={[
              { label: "Home", href: "/" },
              { label: "Makes", href: "/makes" },
              { label: make.name, href: `/makes/${make.slug}` },
              { label: model.name, href: modelPath },
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
        snapshot={
          <YearSnapshot
            snapshot={snapshot}
            yearLabel={String(year.year)}
            makeName={make.name}
            modelName={model.name}
          />
        }
        overview={
          <section className="mb-12 max-w-3xl">
            <h2 className="font-display text-2xl tracking-tight">
              What should a used buyer know about the {year.year} {model.name}?
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted md:text-lg">
              {year.year === yearsSorted[0]?.year
                ? `The ${year.year} ${make.name} ${model.name} is the newest year in our catalog — start here for current specs, then check older years if you want to save money.`
                : `The ${year.year} ${make.name} ${model.name} sits ${yearsSorted[0] ? `${yearsSorted[0].year - year.year} model year${yearsSorted[0].year - year.year === 1 ? "" : "s"} behind the newest ${yearsSorted[0].year}` : "in our catalog"} — use the snapshot above for price and recall context before reading the full overview.`}
            </p>
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
        discontinuedBanner={
          showBanner && discontinued ? (
            <DiscontinuedBanner
              message={discontinued.message}
              lastYear={discontinued.lastYear}
              modelName={model.name}
            />
          ) : null
        }
        safetyPanel={
          <YearSafetyPanel
            yearLabel={String(year.year)}
            makeName={make.name}
            modelName={model.name}
            recalls={year.recalls}
            complaints={year.complaints}
            recallsStatus={year.safetyStatus?.recalls}
            complaintsStatus={year.safetyStatus?.complaints}
            recallsError={year.safetyStatus?.recallsError}
            complaintsError={year.safetyStatus?.complaintsError}
          />
        }
        yearChanges={
          yearDiff && previousYear ? (
            <YearChanges
              diff={yearDiff}
              previousHref={yearHref(
                make.slug,
                model.slug,
                previousYear.slug,
              )}
              modelName={model.name}
            />
          ) : null
        }
        valuationCta={
          pricing ? (
            <YearPricingPanel
              pricing={pricing}
              year={year.year}
              makeName={make.name}
              modelName={model.name}
            />
          ) : (
            <YearValuationCta
              year={year.year}
              makeName={make.name}
              modelName={model.name}
            />
          )
        }
        relatedComparisons={
          <RelatedComparisons
            makeSlug={make.slug}
            modelSlug={model.slug}
            modelName={model.name}
          />
        }
      />
    </>
  );
}
