import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ReliabilityGuideContent } from "@/components/ReliabilityGuideContent";
import { SITE } from "@/data/catalog";
import { getModel } from "@/lib/catalog";
import {
  getAllReliabilityGuideParams,
  getReliabilityGuide,
  reliabilityGuideHref,
} from "@/lib/reliability";
import {
  JsonLd,
  absoluteUrl,
  articleJsonLd,
  breadcrumbJsonLd,
  faqPageJsonLd,
} from "@/lib/seo";

type Props = {
  params: Promise<{ make: string; model: string }>;
};

export const dynamicParams = true;

export function generateStaticParams() {
  return getAllReliabilityGuideParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { make: makeSlug, model: modelSlug } = await params;
  const found = getModel(String(makeSlug), String(modelSlug));
  const guide = getReliabilityGuide(String(makeSlug), String(modelSlug));
  if (!found || !guide?.published) return { title: "Not found" };

  const { make, model } = found;
  const path = reliabilityGuideHref(make.slug, model.slug);
  const title = `${make.name} ${model.name} years to avoid & reliability`;
  const description = `${make.name} ${model.name} reliability guide — best years to buy, years to avoid, common problems by generation, and sourced notes on ${SITE.name}.`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      title,
      description,
      url: absoluteUrl(path),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ModelReliabilityPage({ params }: Props) {
  const { make: makeSlug, model: modelSlug } = await params;
  const found = getModel(String(makeSlug), String(modelSlug));
  const guide = getReliabilityGuide(String(makeSlug), String(modelSlug));
  if (!found || !guide?.published) notFound();

  const { make, model } = found;
  const path = reliabilityGuideHref(make.slug, model.slug);
  const modelPath = `/makes/${make.slug}/${model.slug}`;
  const title = `${make.name} ${model.name} reliability`;
  const description = `Best years, years to avoid, and common issues for the ${make.name} ${model.name}.`;

  const faqs =
    guide.faqs?.filter((f) => f.question.trim() && f.answer.trim()) ?? [];

  return (
    <div className="container-wide py-10 md:py-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Makes", path: "/makes" },
          { name: make.name, path: `/makes/${make.slug}` },
          { name: model.name, path: modelPath },
          { name: "Reliability", path },
        ])}
      />
      <JsonLd
        data={articleJsonLd({
          title,
          description,
          path,
          dateModified: guide.updatedAt ?? undefined,
        })}
      />
      {faqs.length > 0 ? <JsonLd data={faqPageJsonLd(faqs)} /> : null}

      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Makes", href: "/makes" },
          { label: make.name, href: `/makes/${make.slug}` },
          { label: model.name, href: modelPath },
          { label: "Reliability" },
        ]}
      />

      <header className="mt-6 max-w-3xl">
        <p className="text-xs uppercase tracking-[0.16em] text-muted">
          Reliability
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">
          {make.name} {model.name} years to avoid &amp; reliability
        </h1>
        <p className="mt-3 text-muted md:text-lg">
          Used-buyer guide: which years to prefer, which to skip, and what
          issues show up by generation. Always confirm with a PPI and the NHTSA
          recalls on each year page.
        </p>
      </header>

      <ReliabilityGuideContent
        makeSlug={make.slug}
        modelSlug={model.slug}
        makeName={make.name}
        modelName={model.name}
        guide={guide}
        modelHref={modelPath}
      />
    </div>
  );
}
