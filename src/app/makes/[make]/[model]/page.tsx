import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import {
  getAllModelParams,
  getModel,
  modelHref,
  yearHref,
} from "@/lib/catalog";
import { SITE } from "@/data/catalog";
import { absoluteUrl } from "@/lib/seo";

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
  const newest = [...model.years].sort((a, b) => b.year - a.year)[0];
  const canonical = newest
    ? yearHref(make.slug, model.slug, newest.slug)
    : `/makes/${make.slug}/${model.slug}`;
  const title = newest
    ? `${newest.year} ${make.name} ${model.name} photos & overview`
    : `${make.name} ${model.name} photos & years`;
  const description = `${model.tagline} Browse ${make.name} ${model.name} on ${SITE.name}.`;
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
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: absoluteUrl(canonical),
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

/** Model index removed — send visitors straight to the newest year overview. */
export default async function ModelPage({ params }: Props) {
  const raw = await params;
  const found = getModel(String(raw.make ?? ""), String(raw.model ?? ""));
  if (!found) notFound();

  const { make, model } = found;
  const newest = [...model.years].sort((a, b) => b.year - a.year)[0];
  if (!newest) notFound();

  permanentRedirect(modelHref(make.slug, model.slug));
}
