"use client";

import { useEffect, useState } from "react";
import { CatalogImage } from "@/components/CatalogImage";
import type { GalleryImage } from "@/data/catalog";

type Props = {
  images: GalleryImage[];
  /** Milliseconds between slides. */
  intervalMs?: number;
};

type SlideState = {
  index: number;
  prevIndex: number | null;
};

/**
 * Full-bleed landing backdrop that crossfades between catalog photos.
 * Only mounts prev/active/next so the first paint stays light.
 * Capped `sizes` + lower `quality` keep optimized files small.
 */
export function HeroBackdrop({ images, intervalMs = 7000 }: Props) {
  const slides = images.filter((img) => Boolean(img?.src));
  const [{ index, prevIndex }, setSlide] = useState<SlideState>({
    index: 0,
    prevIndex: null,
  });

  useEffect(() => {
    if (slides.length < 2) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return;

    const id = window.setInterval(() => {
      setSlide(({ index: current }) => ({
        index: (current + 1) % slides.length,
        prevIndex: current,
      }));
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [slides.length, intervalMs]);

  // Drop the outgoing slide after the fade finishes.
  useEffect(() => {
    if (prevIndex === null) return;
    const id = window.setTimeout(() => {
      setSlide((current) =>
        current.prevIndex === null
          ? current
          : { ...current, prevIndex: null },
      );
    }, 1300);
    return () => window.clearTimeout(id);
  }, [prevIndex, index]);

  if (!slides.length) {
    return <div className="absolute inset-0 bg-soft" />;
  }

  const nextIndex = slides.length > 1 ? (index + 1) % slides.length : index;
  const visible = new Set(
    [prevIndex, index, nextIndex].filter((i): i is number => i !== null),
  );

  return (
    <div className="absolute inset-0" aria-hidden="true">
      {[...visible].map((i) => {
        const image = slides[i];
        if (!image) return null;
        const active = i === index;
        return (
          <CatalogImage
            key={image.src}
            src={image.src}
            alt=""
            fill
            priority={i === 0}
            quality={45}
            sizes="(max-width: 768px) 100vw, 1100px"
            className={
              active
                ? "object-cover opacity-100 transition-opacity duration-[1.2s] ease-out"
                : "object-cover opacity-0 transition-opacity duration-[1.2s] ease-out"
            }
          />
        );
      })}
    </div>
  );
}
