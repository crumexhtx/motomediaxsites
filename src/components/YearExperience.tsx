"use client";

import { useMemo, useState, type ReactNode } from "react";
import { CatalogImage } from "@/components/CatalogImage";
import { YearDetailPanel } from "@/components/YearDetailPanel";
import { YearVideoEmbed } from "@/components/YearVideoEmbed";
import type {
  GalleryImage,
  VehicleSpecs,
  YearPerformance,
  YearVideo,
} from "@/data/catalog";

type Props = {
  title: string;
  summary: string;
  yearLabel: string;
  breadcrumbs: ReactNode;
  yearChips: ReactNode;
  overview: ReactNode;
  performance?: YearPerformance;
  specs?: VehicleSpecs;
  baseImages: GalleryImage[];
  video?: YearVideo;
  nhtsaUrl?: string;
  epaUrl?: string;
};

export function YearExperience({
  title,
  summary,
  yearLabel,
  breadcrumbs,
  yearChips,
  overview,
  performance,
  specs,
  baseImages,
  video,
  nhtsaUrl,
  epaUrl,
}: Props) {
  const trims = useMemo(() => performance?.trims ?? [], [performance?.trims]);
  const initialId =
    performance?.defaultTrimId &&
    trims.some((t) => t.id === performance.defaultTrimId)
      ? performance.defaultTrimId
      : trims[0]?.id;

  const [trimId, setTrimId] = useState(initialId);
  const trim = useMemo(
    () => trims.find((t) => t.id === trimId) ?? trims[0],
    [trims, trimId],
  );

  const hero = baseImages[0];

  return (
    <article>
      <div className="relative min-h-[42vh] overflow-hidden md:min-h-[52vh]">
        {hero ? (
          <CatalogImage
            key={hero.src}
            src={hero.src}
            alt={hero.alt}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-soft" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-black/50 to-black/25" />
        <div className="container-wide relative flex min-h-[42vh] flex-col justify-end pb-10 pt-24 md:min-h-[52vh]">
          {breadcrumbs}
          <h1 className="mt-4 font-display text-4xl tracking-tight text-white md:text-6xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-white/80 md:text-lg">
            {summary}
          </p>
          {trim ? (
            <p className="mt-2 text-sm text-white/65">Trim: {trim.name}</p>
          ) : null}
        </div>
      </div>

      <div className="container-wide py-10 md:py-14">
        <section className="mb-10">
          <h2 className="mb-3 text-xs uppercase tracking-[0.16em] text-muted">
            Other years
          </h2>
          {yearChips}
        </section>

        {overview}

        {video ? <YearVideoEmbed video={video} /> : null}

        <YearDetailPanel
          yearLabel={yearLabel}
          performance={performance}
          specs={specs}
          nhtsaUrl={nhtsaUrl}
          epaUrl={epaUrl}
          trimId={trimId}
          onTrimChange={setTrimId}
        />
      </div>
    </article>
  );
}
