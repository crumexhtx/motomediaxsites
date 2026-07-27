import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { MakeHeaderBadge } from "@/components/MakeGrid";
import { ModelCard } from "@/components/ModelCard";
import {
  getAllMakeParams,
  getMake,
  makeCoverImage,
  modelCardImage,
  modelHref,
} from "@/lib/catalog";
import { getBrandProfile } from "@/lib/brandProfile";
import { SITE } from "@/data/catalog";
import { JsonLd, absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { truncateAtSentence } from "@/lib/text";

type Props = {
  params: Promise<{ make: string }>;
};

export const dynamicParams = true;

export function generateStaticParams() {
  return getAllMakeParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { make: makeSlug } = await params;
  const make = getMake(String(makeSlug));
  if (!make) return {};

  const profile = getBrandProfile(make.slug);
  const title = `${make.name} — brand history & used models`;
  const blurb = truncateAtSentence(make.blurb, 280);
  const description = profile
    ? `${make.name} (${profile.headquarters}). ${truncateAtSentence(profile.history, 200)} Compare used model years, recalls, and specs on ${SITE.name}.`
    : `Compare ${make.name} model years for NHTSA recalls, owner complaints, and year-over-year changes. ${blurb}`;

  const cover = makeCoverImage(make);
  const ogImage = cover.src.endsWith(".svg")
    ? undefined
    : {
        url: cover.src.startsWith("http")
          ? cover.src
          : absoluteUrl(cover.src),
        alt: cover.alt || `${make.name} cars`,
      };

  return {
    title,
    description,
    alternates: { canonical: `/makes/${make.slug}` },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/makes/${make.slug}`),
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

export default async function MakePage({ params }: Props) {
  const { make: makeSlug } = await params;
  const make = getMake(String(makeSlug));
  if (!make) notFound();
  const blurb = truncateAtSentence(make.blurb, 400);
  const profile = getBrandProfile(make.slug);

  return (
    <div className="container-wide py-10 md:py-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Makes", path: "/makes" },
          { name: make.name, path: `/makes/${make.slug}` },
        ])}
      />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Makes", href: "/makes" },
          { label: make.name },
        ]}
      />
      <header className="mt-6 max-w-3xl">
        <MakeHeaderBadge make={make} />
        <p className="text-xs uppercase tracking-[0.16em] text-muted">
          {make.country}
          {profile?.founded ? ` · Founded ${profile.founded}` : ""}
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">
          {make.name}
        </h1>
        <p className="mt-3 text-lg text-muted">{blurb}</p>
      </header>

      {profile ? (
        <section className="mt-10 max-w-3xl">
          <h2 className="font-display text-2xl tracking-tight">
            About {make.name}
          </h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="border-b border-line/60 pb-2">
              <dt className="text-xs uppercase tracking-[0.14em] text-muted">
                Headquarters
              </dt>
              <dd className="mt-1 text-foreground">{profile.headquarters}</dd>
            </div>
            <div className="border-b border-line/60 pb-2">
              <dt className="text-xs uppercase tracking-[0.14em] text-muted">
                Founded
              </dt>
              <dd className="mt-1 text-foreground">{profile.founded}</dd>
            </div>
            {profile.parent ? (
              <div className="border-b border-line/60 pb-2">
                <dt className="text-xs uppercase tracking-[0.14em] text-muted">
                  Parent / group
                </dt>
                <dd className="mt-1 text-foreground">{profile.parent}</dd>
              </div>
            ) : null}
            <div className="border-b border-line/60 pb-2 sm:col-span-2">
              <dt className="text-xs uppercase tracking-[0.14em] text-muted">
                What they build
              </dt>
              <dd className="mt-1 text-foreground">{profile.focus}</dd>
            </div>
          </dl>
          <p className="mt-5 text-base leading-relaxed text-muted md:text-lg">
            {profile.history}
          </p>
          <p className="mt-4 text-sm text-muted">
            Browse {make.name} model years below to compare recalls, complaints,
            and year-over-year changes before you buy used.{" "}
            <Link
              href="/recalls"
              className="text-foreground underline-offset-2 hover:underline"
            >
              See recent recalls across all makes
            </Link>
            .
          </p>
        </section>
      ) : null}

      <section className="mt-12 space-y-4">
        <h2 className="font-display text-2xl tracking-tight">Models</h2>
        <ul className="space-y-3">
          {make.models.map((model) => (
            <li key={model.slug}>
              <ModelCard
                href={modelHref(make.slug, model.slug)}
                title={model.name}
                subtitle={`${model.tagline} · ${model.years.length} year${model.years.length === 1 ? "" : "s"}`}
                image={modelCardImage(make, model)}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
