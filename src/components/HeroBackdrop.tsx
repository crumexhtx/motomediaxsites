"use client";

import { CatalogImage } from "@/components/CatalogImage";
import type { GalleryImage } from "@/data/catalog";

type Props = {
  images: GalleryImage[];
};

/**
 * Single full-bleed landing backdrop — one dominant photo with a slow
 * ken-burns drift. Avoids slideshow crossfades that read as a repeating tile.
 */
export function HeroBackdrop({ images }: Props) {
  const image = images.find((img) => Boolean(img?.src));

  if (!image) {
    return (
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 70% 40%, rgba(61,156,240,0.2), transparent 55%), linear-gradient(160deg, #0c121a 0%, #0a0c0f 55%, #121820 100%)",
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="hero-pan absolute inset-[-4%]">
        <CatalogImage
          src={image.src}
          alt=""
          fill
          priority
          quality={55}
          sizes="100vw"
          className="object-cover object-[center_35%]"
        />
      </div>
    </div>
  );
}
