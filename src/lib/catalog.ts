import {
  type GalleryImage,
  type MakeEntry,
  type ModelEntry,
  type YearEntry,
} from "@/data/catalog";
import { getCatalog, publicAssetExists } from "@/data/catalog.server";
import { enrichYearEntry } from "@/lib/trims";

export type SearchResult = {
  type: "make" | "model" | "year";
  title: string;
  subtitle: string;
  href: string;
  image: GalleryImage;
};

function normSlug(slug: string) {
  try {
    return decodeURIComponent(slug).toLowerCase();
  } catch {
    return slug.toLowerCase();
  }
}

function brandFallback(make: MakeEntry): GalleryImage {
  return {
    src: `/brands/${make.slug}.svg`,
    alt: `${make.name} badge`,
    width: 128,
    height: 128,
  };
}

/** Prefer an image that exists on disk (or is remote); otherwise undefined. */
function usableImage(image?: GalleryImage): GalleryImage | undefined {
  if (!image?.src) return undefined;
  if (image.src.endsWith(".svg")) return image;
  if (publicAssetExists(image.src)) return image;
  return undefined;
}

function newestYear(model: ModelEntry): YearEntry | undefined {
  if (!model.years.length) return undefined;
  return [...model.years].sort((a, b) => b.year - a.year)[0];
}

export function getAllMakes(): MakeEntry[] {
  return [...getCatalog()].sort((a, b) => a.name.localeCompare(b.name));
}

export function getMake(slug: string): MakeEntry | undefined {
  const key = normSlug(slug);
  return getCatalog().find((m) => m.slug === key);
}

export function getModel(
  makeSlug: string,
  modelSlug: string,
): { make: MakeEntry; model: ModelEntry } | undefined {
  const make = getMake(makeSlug);
  if (!make) return undefined;
  const key = normSlug(modelSlug);
  const model = make.models.find((m) => m.slug === key);
  if (!model) return undefined;
  return {
    make,
    model: {
      ...model,
      years: model.years.map((y) =>
        enrichYearEntry(make.slug, model.slug, y),
      ),
    },
  };
}

export function getYear(
  makeSlug: string,
  modelSlug: string,
  yearSlug: string,
):
  | { make: MakeEntry; model: ModelEntry; year: YearEntry }
  | undefined {
  const found = getModel(makeSlug, modelSlug);
  if (!found) return undefined;
  const key = normSlug(yearSlug);
  // Years on `found.model` are already enriched by getModel.
  const year = found.model.years.find((y) => y.slug === key);
  if (!year) return undefined;
  return {
    ...found,
    year,
  };
}

export function getLatestEntries(limit = 8) {
  const entries: {
    make: MakeEntry;
    model: ModelEntry;
    year: YearEntry;
    href: string;
    image: GalleryImage;
  }[] = [];

  for (const make of getCatalog()) {
    for (const model of make.models) {
      for (const year of model.years) {
        const image = pickBestCardImage(year.images, {
          makeName: make.name,
          modelName: model.name,
        });
        if (!image) continue;
        entries.push({
          make,
          model,
          year,
          href: yearHref(make.slug, model.slug, year.slug),
          image,
        });
      }
    }
  }

  return entries
    .sort((a, b) => b.year.year - a.year.year)
    .slice(0, limit);
}

/** Prefer a specific model for the landing hero when present. */
export function getLandingHeroImage(): GalleryImage | undefined {
  const preferred = getYear("gmc", "hummer-ev", "2025") ?? getYear("gmc", "hummer-ev", "2024") ?? getYear("gmc", "hummer-ev", "2026");
  if (preferred) {
    const image = pickBestCardImage(preferred.year.images, {
      makeName: preferred.make.name,
      modelName: preferred.model.name,
    });
    if (image && publicAssetExists(image.src)) {
      return {
        ...image,
        alt: `${preferred.year.year} ${preferred.make.name} ${preferred.model.name}`,
      };
    }
  }
  return getHeroBackdropImages(1)[0];
}

/** Diverse local catalog photos for the landing hero (one per make). */
export function getHeroBackdropImages(limit = 6): GalleryImage[] {
  const picked: GalleryImage[] = [];
  const seenMakes = new Set<string>();

  // Prefer enriched year pages so default-trim photos win when present.
  for (const make of getCatalog()) {
    for (const model of make.models) {
      if (seenMakes.has(make.slug)) break;
      // Newest year first for a current look.
      const years = [...model.years].sort((a, b) => b.year - a.year);
      for (const year of years) {
        if (seenMakes.has(make.slug)) break;
        const enriched = enrichYearEntry(make.slug, model.slug, year);
        const image = pickBestCardImage(enriched.images, {
          makeName: make.name,
          modelName: model.name,
        });
        if (!image || !publicAssetExists(image.src)) continue;
        seenMakes.add(make.slug);
        picked.push({
          ...image,
          alt: `${year.year} ${make.name} ${model.name}`,
        });
      }
    }
    if (picked.length >= limit) break;
  }

  if (picked.length >= Math.min(2, limit)) return picked.slice(0, limit);

  // Fallback: any non-SVG photos from latest entries.
  for (const entry of getLatestEntries(24)) {
    if (picked.some((p) => p.src === entry.image.src)) continue;
    if (entry.image.src.endsWith(".svg")) continue;
    picked.push(entry.image);
    if (picked.length >= limit) break;
  }

  return picked.slice(0, limit);
}

/**
 * Best cover for a make tile: always the brand logo badge.
 */
export function makeCoverImage(make: MakeEntry): GalleryImage {
  const cover = usableImage(make.coverImage);
  if (cover?.src.endsWith(".svg")) return cover;
  return brandFallback(make);
}

/**
 * Score an image for use as a model/year card hero.
 * Prefers front / three-quarter exterior shots; demotes rear, interior, gauges, logos.
 */
export function scoreCardImage(
  image: GalleryImage,
  opts?: { makeName?: string; modelName?: string },
): number {
  const hay = `${image.src} ${image.alt}`.toLowerCase();
  let score = 0;

  if (image.src.endsWith(".svg")) return -100;
  if (!image.src) return -100;

  // Orientation: landscape cards read better for car exteriors.
  if (image.width && image.height) {
    const ratio = image.width / image.height;
    if (ratio >= 1.2) score += 4;
    else if (ratio < 0.9) score -= 6;
  }

  if (/\bfront\b|front[- ]?(left|right|3|three)|three[- ]?quarter|3\/4/.test(hay)) {
    score += 12;
  }
  if (/\bexterior\b|\bstreet\b|\bparked\b|\broad\b/.test(hay)) score += 3;

  if (/\brear\b|\bback\b|taillight|tail[- ]?lamp|\btrunk\b|\bboot\b/.test(hay)) {
    score -= 14;
  }
  if (
    /\binterior\b|\bdashboard\b|\bcabin\b|\bseat\b|\bgauge\b|\bfuel\b|\btank\b|\binstrument\b/.test(
      hay,
    )
  ) {
    score -= 18;
  }
  if (/\blogo\b|\bbadge\b|\bemblem\b|\bwordmark\b|wikipedia-logo/.test(hay)) {
    score -= 16;
  }
  if (/\bengine\b|\bmotor\b|\bwheel\b only|\bclose[- ]?up\b/.test(hay)) {
    score -= 8;
  }

  const make = opts?.makeName?.toLowerCase();
  const model = opts?.modelName?.toLowerCase();
  if (make && hay.includes(make)) score += 2;
  if (model) {
    const tokens = model
      .split(/[\s/-]+/)
      .filter((t) => t.length >= 2 && !["the", "and", "ev"].includes(t));
    if (tokens.length && tokens.every((t) => hay.includes(t))) score += 4;
  }

  return score;
}

/** Pick the best exterior / front-facing card image from a list. */
export function pickBestCardImage(
  images: GalleryImage[] | undefined,
  opts?: { makeName?: string; modelName?: string },
): GalleryImage | undefined {
  if (!images?.length) return undefined;
  let best: GalleryImage | undefined;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const image of images) {
    const usable = usableImage(image);
    if (!usable || usable.src.endsWith(".svg")) continue;
    const score = scoreCardImage(usable, opts);
    if (score > bestScore) {
      bestScore = score;
      best = usable;
    }
  }
  // Reject clearly bad heroes when a better option isn't available.
  if (best && bestScore <= -12) return undefined;
  return best;
}

function firstCarImage(
  make: MakeEntry,
  model?: ModelEntry,
): GalleryImage | undefined {
  if (model) {
    const years = [...model.years].sort((a, b) => b.year - a.year);
    for (const year of years) {
      const img = pickBestCardImage(year.images, {
        makeName: make.name,
        modelName: model.name,
      });
      if (img) return img;
    }
  }
  for (const m of make.models) {
    const years = [...m.years].sort((a, b) => b.year - a.year);
    for (const year of years) {
      const img = pickBestCardImage(year.images, {
        makeName: make.name,
        modelName: m.name,
      });
      if (img) return img;
    }
  }
  return undefined;
}

/** Newest-year card image for a model, with brand badge fallback. */
export function modelCardImage(
  make: MakeEntry,
  model: ModelEntry,
): GalleryImage {
  const year = newestYear(model);
  return (
    pickBestCardImage(year?.images, {
      makeName: make.name,
      modelName: model.name,
    }) ??
    firstCarImage(make, model) ??
    brandFallback(make)
  );
}

export function searchCatalog(query: string, limit = 40): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: SearchResult[] = [];
  const exactYearQuery = /^\d{4}$/.test(q);
  const digitsOnlyQuery = /^\d+$/.test(q);

  for (const make of getCatalog()) {
    if (
      !exactYearQuery &&
      (make.name.toLowerCase().includes(q) ||
        make.country.toLowerCase().includes(q))
    ) {
      const image = brandFallback(make);
      results.push({
        type: "make",
        title: make.name,
        subtitle: make.country,
        href: makeHref(make.slug),
        image,
      });
    }

    for (const model of make.models) {
      const modelMatch =
        !exactYearQuery &&
        (model.name.toLowerCase().includes(q) ||
          model.tagline.toLowerCase().includes(q) ||
          `${make.name} ${model.name}`.toLowerCase().includes(q));

      if (modelMatch) {
        const image = modelCardImage(make, model);
        results.push({
          type: "model",
          title: `${make.name} ${model.name}`,
          subtitle: model.tagline,
          href: modelHref(make.slug, model.slug),
          image,
        });
      }

      for (const year of model.years) {
        const yearLabel = `${make.name} ${model.name} ${year.year}`;
        let yearHit = false;
        if (exactYearQuery) {
          yearHit = String(year.year) === q;
        } else if (!digitsOnlyQuery) {
          yearHit =
            yearLabel.toLowerCase().includes(q) ||
            year.summary.toLowerCase().includes(q);
        }

        if (yearHit) {
          const yearImage = usableImage(year.images[0]);
          const image =
            yearImage && !yearImage.src.endsWith(".svg")
              ? yearImage
              : (firstCarImage(make, model) ?? brandFallback(make));
          results.push({
            type: "year",
            title: yearLabel,
            subtitle: year.summary,
            href: yearHref(make.slug, model.slug, year.slug),
            image,
          });
        }
      }
    }
  }

  return results.slice(0, limit);
}

export function getAllMakeParams() {
  return getCatalog().map((make) => ({ make: make.slug }));
}

export function getAllModelParams() {
  return getCatalog().flatMap((make) =>
    make.models.map((model) => ({
      make: make.slug,
      model: model.slug,
    })),
  );
}

export function getAllYearParams() {
  return getCatalog().flatMap((make) =>
    make.models.flatMap((model) =>
      model.years.map((year) => ({
        make: make.slug,
        model: model.slug,
        year: year.slug,
      })),
    ),
  );
}

export function makeHref(makeSlug: string) {
  return `/makes/${makeSlug}`;
}

export function modelHref(makeSlug: string, modelSlug: string) {
  return `/makes/${makeSlug}/${modelSlug}`;
}

export function yearHref(
  makeSlug: string,
  modelSlug: string,
  yearSlug: string,
) {
  return `/makes/${makeSlug}/${modelSlug}/${yearSlug}`;
}
