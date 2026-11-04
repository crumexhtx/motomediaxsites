import {
  SITE,
  type GalleryImage,
  type MakeEntry,
  type ModelEntry,
  type YearEntry,
} from "@/data/catalog";
import { getCatalog, publicAssetExists } from "@/data/catalog.server";
import { enrichYearEntry } from "@/lib/trims";
import { formatYearRanges, normalizeModelNames } from "@/lib/text";

export type SearchResult = {
  type: "make" | "model" | "year";
  title: string;
  subtitle: string;
  href: string;
  image: GalleryImage;
};

/**
 * Collapse punctuation/spaces so "f150", "F 150", and "F-150" share a key.
 * Keeps letters+digits only, lowercased.
 */
export function normalizeSearchKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** True when query matches haystack via substring or normalized alphanumeric key. */
export function searchTextMatch(haystack: string, query: string): boolean {
  const h = haystack.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return false;
  if (h.includes(q)) return true;
  const hn = normalizeSearchKey(haystack);
  const qn = normalizeSearchKey(query);
  if (!qn) return false;
  return hn.includes(qn);
}

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

export type HomeMixedEntry = {
  type: "make" | "model" | "year";
  key: string;
  href: string;
  title: string;
  subtitle: string;
  image: GalleryImage;
};

/** Models ranked by catalog depth — used for homepage featured picks. */
function rankedModels(make: MakeEntry): ModelEntry[] {
  return [...make.models].sort((a, b) => b.years.length - a.years.length);
}

/** Popular used-buyer model-year band featured on the homepage. */
export const HOME_USED_YEAR_MIN = 2018;
export const HOME_USED_YEAR_MAX = 2023;

/**
 * Pick a year for homepage cards that reads as a used-car shopping pick:
 * newest year inside 2018–2023 when present; otherwise the oldest year above
 * that band (e.g. 2024, not 2026); otherwise the newest older year.
 */
export function pickHomeUsedYear(model: ModelEntry): YearEntry | undefined {
  if (!model.years.length) return undefined;
  const byYearDesc = [...model.years].sort((a, b) => b.year - a.year);
  const inBand = byYearDesc.find(
    (y) => y.year >= HOME_USED_YEAR_MIN && y.year <= HOME_USED_YEAR_MAX,
  );
  if (inBand) return inBand;
  const above = byYearDesc.filter((y) => y.year > HOME_USED_YEAR_MAX);
  if (above.length) return above[above.length - 1];
  return byYearDesc[0];
}

function hasHomeUsedBandYear(model: ModelEntry): boolean {
  return model.years.some(
    (y) => y.year >= HOME_USED_YEAR_MIN && y.year <= HOME_USED_YEAR_MAX,
  );
}

/**
 * True for placeholder / raw Wikidata descriptions that read badly on cards:
 * generic labels ("Motor vehicle", "Car model"), disambiguation text,
 * "Series of…" / "… manufactured by …" phrasing, generation or date ranges.
 */
export function isRawWikidataLabel(value: string | null | undefined): boolean {
  const s = (value ?? "").trim();
  if (!s) return true;
  if (/^(motor vehicle|car model|automobile|vehicle|car)$/i.test(s)) return true;
  if (/^index of\b/i.test(s)) return true;
  if (/^(model|range|series|line|family|automotive|nameplate|upcoming)\b/i.test(s))
    return true;
  if (/\b(manufactured|produced|marketed|developed|sold)\s+by\b/i.test(s))
    return true;
  if (/\b(by|from)\s+(the\s+)?[A-Z]/.test(s)) return true;
  if (/\b(variant|version)\s+of\b/i.test(s)) return true;
  if (/\bgeneration\b/i.test(s)) return true;
  if (/\b(19|20)\d{2}\b/.test(s)) return true;
  if (/\(.*\)/.test(s)) return true;
  return false;
}

/** "2018–2023", "2024", or a comma list for non-contiguous years. */
export function formatYearSpan(years: number[]): string {
  const sorted = [...new Set(years)].sort((a, b) => a - b);
  if (!sorted.length) return "";
  const parts: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i <= sorted.length; i += 1) {
    const cur = sorted[i];
    if (cur === prev + 1) {
      prev = cur;
      continue;
    }
    parts.push(start === prev ? String(start) : `${start}–${prev}`);
    start = cur;
    prev = cur;
  }
  return parts.join(", ");
}

/** One-liner built only from catalog data: years covered, recalls, MPG. */
function generatedModelSummary(model: ModelEntry): string {
  const parts: string[] = [];
  const span = formatYearSpan(model.years.map((y) => y.year));
  if (span) {
    parts.push(
      model.years.length === 1 ? `${span} model year` : `${span} model years`,
    );
  }
  const campaigns = new Set<string>();
  for (const y of model.years) {
    for (const r of y.recalls ?? []) campaigns.add(r.campaignNumber);
  }
  if (campaigns.size > 0) {
    parts.push(
      `${campaigns.size} NHTSA recall${campaigns.size === 1 ? "" : "s"}`,
    );
  }
  const mpgs = model.years
    .map((y) => y.specs?.mpgCombined)
    .filter((v): v is number => typeof v === "number" && v > 0);
  if (mpgs.length) {
    const best = Math.max(...mpgs);
    const allBev = model.years.every(
      (y) => y.specs?.electrificationLevel === "BEV",
    );
    const unit = allBev ? "MPGe" : "MPG";
    parts.push(`up to ${best} ${unit} combined`);
  }
  return parts.join(" · ");
}

/**
 * Subtitle for model cards: the Wikidata tagline when it reads cleanly,
 * otherwise a line generated from our own data (may be empty → hide it).
 */
export function modelCardSubtitle(model: ModelEntry): string {
  if (!isRawWikidataLabel(model.tagline)) return model.tagline.trim();
  return generatedModelSummary(model);
}

/**
 * Interleaved make / model / year cards for the homepage grid.
 * Each visual row stays on one brand and uses two different models
 * (model card + year card) so the row isn't a duplicate pair.
 */
export function getHomeMixedEntries(limit = 12): HomeMixedEntry[] {
  const rows = Math.ceil(limit / 3);
  const mixed: HomeMixedEntry[] = [];

  for (const make of getAllMakes().slice(0, rows)) {
    const ranked = rankedModels(make);
    const modelA = ranked[0];
    if (!modelA) continue;
    // Prefer a second model for the year card (ideally one with a 2018–2023
    // year); fall back to modelA if the make is thin.
    const others = ranked.slice(1);
    const yearModel =
      others.find(hasHomeUsedBandYear) ?? others[0] ?? modelA;

    mixed.push({
      type: "make",
      key: `make-${make.slug}`,
      href: makeHref(make.slug),
      title: make.name,
      subtitle: `${make.country} · ${make.models.length} model${make.models.length === 1 ? "" : "s"}`,
      image: makeCoverImage(make),
    });

    mixed.push({
      type: "model",
      key: `model-${make.slug}-${modelA.slug}`,
      href: modelHref(make.slug, modelA.slug),
      title: `${make.name} ${modelA.name}`,
      subtitle: modelCardSubtitle(modelA),
      image: modelCardImage(make, modelA),
    });

    const year = pickHomeUsedYear(yearModel);
    if (year) {
      mixed.push({
        type: "year",
        key: `year-${make.slug}-${yearModel.slug}-${year.slug}`,
        href: yearHref(make.slug, yearModel.slug, year.slug),
        title: `${make.name} ${yearModel.name}`,
        subtitle: `${year.year} model year`,
        image:
          pickBestCardImage(year.images, {
            makeName: make.name,
            modelName: yearModel.name,
          }) ?? modelCardImage(make, yearModel),
      });
    }

    if (mixed.length >= limit) break;
  }

  return mixed.slice(0, limit);
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
  const fallback = getHeroBackdropImages(1)[0];
  if (!fallback) return undefined;
  // Alt must never be empty — fall back to a generic but meaningful label.
  return fallback.alt.trim()
    ? fallback
    : { ...fallback, alt: `Featured vehicle from the ${SITE.name} catalog` };
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
    picked.push({
      ...entry.image,
      alt:
        entry.image.alt?.trim() ||
        `${entry.year.year} ${entry.make.name} ${entry.model.name}`,
    });
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
      (searchTextMatch(make.name, q) ||
        searchTextMatch(make.slug, q) ||
        searchTextMatch(make.country, q))
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
      const modelLabel = `${make.name} ${model.name}`;
      const modelMatch =
        !exactYearQuery &&
        (searchTextMatch(model.name, q) ||
          searchTextMatch(model.slug, q) ||
          (!isRawWikidataLabel(model.tagline) &&
            searchTextMatch(model.tagline, q)) ||
          searchTextMatch(modelLabel, q) ||
          // "ford f150" / "f150 ford"
          searchTextMatch(`${make.slug} ${model.slug}`, q));

      if (modelMatch) {
        const image = modelCardImage(make, model);
        results.push({
          type: "model",
          title: modelLabel,
          subtitle: modelCardSubtitle(model),
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
            searchTextMatch(yearLabel, q) ||
            searchTextMatch(`${make.slug} ${model.slug} ${year.year}`, q) ||
            searchTextMatch(year.summary, q);
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

  // Prefer tighter matches: exact normalized model/make titles first.
  const qn = normalizeSearchKey(q);
  results.sort((a, b) => {
    const score = (r: SearchResult) => {
      const tn = normalizeSearchKey(r.title);
      if (tn === qn) return 0;
      if (tn.startsWith(qn)) return 1;
      if (tn.includes(qn)) return 2;
      return 3;
    };
    return score(a) - score(b);
  });

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
  const make = getMake(makeSlug);
  const key = normSlug(modelSlug);
  const model = make?.models.find((m) => m.slug === key);
  const newest = model ? newestYear(model) : undefined;
  if (model && newest) return yearHref(makeSlug, model.slug, newest.slug);
  return `/makes/${makeSlug}/${modelSlug}`;
}

export function yearHref(
  makeSlug: string,
  modelSlug: string,
  yearSlug: string,
) {
  return `/makes/${makeSlug}/${modelSlug}/${yearSlug}`;
}

/** One make/model touched by a recall campaign, with every affected year. */
export type RecallAffectedModel = {
  makeName: string;
  makeSlug: string;
  modelName: string;
  modelSlug: string;
  /** Affected model years, newest first. */
  years: number[];
  /** Link to the newest affected year page. */
  href: string;
};

/**
 * One NHTSA recall campaign (grouped by campaign number across model years).
 * `makeName` / `modelName` / `year` / `href` mirror the first (newest-year)
 * affected model so simple cards can keep a single link.
 */
export type RecentRecallItem = {
  /** NHTSA report received date (YYYY-MM-DD). */
  date: string;
  campaignNumber: string;
  component: string;
  summary: string;
  makeName: string;
  makeSlug: string;
  modelName: string;
  modelSlug: string;
  year: number;
  href: string;
  /** Union of affected model years in the catalog, newest first. */
  years: number[];
  /** Every make/model the campaign touches in our catalog. */
  affected: RecallAffectedModel[];
  /** e.g. "Toyota RAV4 2019–2021; Toyota 4Runner 2020". */
  affectedLabel: string;
};

/** Coerce NHTSA dates that may have been stored as YYYY-DD-MM. */
function coerceRecallDate(date: string): string {
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return date;
  const [, y, a, b] = m;
  if (Number(a) > 12 && Number(b) >= 1 && Number(b) <= 12) {
    return `${y}-${b}-${a}`;
  }
  return date;
}

type RecallGroup = {
  date: string;
  campaignNumber: string;
  component: string;
  summary: string;
  models: Map<string, RecallAffectedModel & { yearSlugs: Map<number, string> }>;
};

function groupRecallsByCampaign(): RecallGroup[] {
  const groups = new Map<string, RecallGroup>();
  for (const make of getCatalog()) {
    for (const model of make.models) {
      for (const year of model.years) {
        for (const recall of year.recalls ?? []) {
          const date = coerceRecallDate(recall.date);
          let group = groups.get(recall.campaignNumber);
          if (!group) {
            group = {
              date,
              campaignNumber: recall.campaignNumber,
              component: normalizeModelNames(recall.component),
              summary: normalizeModelNames(recall.summary),
              models: new Map(),
            };
            groups.set(recall.campaignNumber, group);
          } else if (date > group.date) {
            group.date = date;
          }
          const key = `${make.slug}/${model.slug}`;
          let entry = group.models.get(key);
          if (!entry) {
            entry = {
              makeName: make.name,
              makeSlug: make.slug,
              modelName: model.name,
              modelSlug: model.slug,
              years: [],
              href: "",
              yearSlugs: new Map(),
            };
            group.models.set(key, entry);
          }
          if (!entry.yearSlugs.has(year.year)) {
            entry.yearSlugs.set(year.year, year.slug);
            entry.years.push(year.year);
          }
        }
      }
    }
  }
  return [...groups.values()];
}

function toRecentRecallItem(group: RecallGroup): RecentRecallItem {
  const affected: RecallAffectedModel[] = [...group.models.values()]
    .map(({ yearSlugs, ...entry }) => {
      const years = [...entry.years].sort((a, b) => b - a);
      return {
        ...entry,
        years,
        href: yearHref(entry.makeSlug, entry.modelSlug, yearSlugs.get(years[0])!),
      };
    })
    .sort(
      (a, b) =>
        b.years[0] - a.years[0] ||
        `${a.makeName} ${a.modelName}`.localeCompare(
          `${b.makeName} ${b.modelName}`,
        ),
    );
  const primary = affected[0];
  const years = [
    ...new Set(affected.flatMap((a) => a.years)),
  ].sort((a, b) => b - a);

  return {
    date: group.date,
    campaignNumber: group.campaignNumber,
    component: group.component,
    summary: group.summary,
    makeName: primary.makeName,
    makeSlug: primary.makeSlug,
    modelName: primary.modelName,
    modelSlug: primary.modelSlug,
    year: primary.years[0],
    href: primary.href,
    years,
    affected,
    affectedLabel: affected
      .map(
        (a) => `${a.makeName} ${a.modelName} ${formatYearRanges(a.years)}`,
      )
      .join("; "),
  };
}

function sortedRecallGroups(): RecentRecallItem[] {
  return groupRecallsByCampaign()
    .map(toRecentRecallItem)
    .sort((a, b) => {
      const byDate = b.date.localeCompare(a.date);
      if (byDate) return byDate;
      return b.campaignNumber.localeCompare(a.campaignNumber);
    });
}

/**
 * Newest NHTSA recall campaigns across the catalog — one row per campaign
 * number (not per model year), newest NHTSA report date first.
 */
export function getRecentRecalls(limit = 24): RecentRecallItem[] {
  return sortedRecallGroups().slice(0, limit);
}

/** Real totals for /recalls headers (unique campaigns, not year×campaign rows). */
export function getRecallTotals(): {
  uniqueCampaigns: number;
  modelYearRows: number;
  newestReportDate?: string;
} {
  const groups = sortedRecallGroups();
  const modelYearRows = groups.reduce(
    (sum, g) => sum + g.affected.reduce((n, a) => n + a.years.length, 0),
    0,
  );
  return {
    uniqueCampaigns: groups.length,
    modelYearRows,
    newestReportDate: groups[0]?.date,
  };
}

let catalogFetchedAtCache: string | null | undefined;

/** Newest NHTSA enrich timestamp across the catalog (the latest data pull). */
export function getCatalogFetchedAt(): string | undefined {
  if (catalogFetchedAtCache === undefined) {
    let newest: string | null = null;
    for (const make of getCatalog()) {
      for (const model of make.models) {
        for (const year of model.years) {
          const at = year.safetyStatus?.fetchedAt;
          if (at && (!newest || at > newest)) newest = at;
        }
      }
    }
    catalogFetchedAtCache = newest;
  }
  return catalogFetchedAtCache ?? undefined;
}
