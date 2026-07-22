import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { MakeHeaderBadge } from "@/components/MakeGrid";
import { ModelCard } from "@/components/ModelCard";
import {
  getMake,
  makeCoverImage,
  modelCardImage,
  modelHref,
} from "@/lib/catalog";
import { JsonLd, absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";

type Props = {
  params: Promise<{ make: string }>;
};

export const dynamicParams = true;
/** Always resolve from live catalog — avoids stale Turbopack static-param 404s. */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection();
  const { make: makeSlug } = await params;
  const make = getMake(String(makeSlug));
  if (!make) return {};

  const title = `${make.name} cars & photos`;
  const description = `${make.blurb} Browse ${make.name} models and model-year galleries on motomediax.`;

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
  };
}

export default async function MakePage({ params }: Props) {
  await connection();
  const { make: makeSlug } = await params;
  const make = getMake(String(makeSlug));
  if (!make) notFound();

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
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">
          {make.name}
        </h1>
        <p className="mt-3 text-lg text-muted">{make.blurb}</p>
      </header>
      <section className="mt-10 space-y-4">
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
