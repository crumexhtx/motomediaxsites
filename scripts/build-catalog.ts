/**
 * Build catalog.generated.json from brands.json using Wikipedia + NHTSA + EPA.
 * Cache lives under scripts/.cache/ — delete to force refresh.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadEpaIndex,
  lookupEpaSummary,
  mergeEpaIntoSpecs,
  type EpaIndex,
} from "./epa";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CACHE_DIR = path.join(__dirname, ".cache");
const BRANDS_PATH = path.join(ROOT, "src/data/brands.json");
const OUT_PATH = path.join(ROOT, "src/data/catalog.generated.json");

const YEARS = [2024, 2025, 2026] as const;
/** Per-model year overrides keyed as `makeSlug/modelSlug` (lowercase). */
const MODEL_YEARS: Record<string, number[]> = JSON.parse(
  fs.readFileSync(path.join(ROOT, "src/data/model-years.json"), "utf8"),
) as Record<string, number[]>;
const USER_AGENT =
  "motomediax/0.1 (catalog builder; https://github.com/motomediax)";

const BRAND_COUNTRY: Record<string, string> = {
  Toyota: "Japan",
  Ford: "United States",
  Chevrolet: "United States",
  Honda: "Japan",
  Nissan: "Japan",
  Hyundai: "South Korea",
  Kia: "South Korea",
  Subaru: "Japan",
  Jeep: "United States",
  GMC: "United States",
  BMW: "Germany",
  "Mercedes-Benz": "Germany",
  Tesla: "United States",
  Volkswagen: "Germany",
  Mazda: "Japan",
};

type BrandSeed = { brand: string; models: string[] };

type GalleryImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

type VehicleSpecs = {
  make?: string;
  model?: string;
  modelYear?: number;
  available?: boolean;
  bodyClass?: string;
  driveType?: string;
  fuelTypePrimary?: string;
  electrificationLevel?: string;
  plantCountry?: string;
  overallRating?: string;
  frontCrashRating?: string;
  sideCrashRating?: string;
  rolloverRating?: string;
  vehicleDescription?: string;
  trimCount?: number;
  trims?: string[];
  overallLengthIn?: string;
  overallWidthIn?: string;
  overallHeightIn?: string;
  wheelbaseIn?: string;
  curbWeightLb?: string;
  mpgCity?: number;
  mpgHighway?: number;
  mpgCombined?: number;
  rangeMiles?: number;
};

type CatalogSources = {
  wikipedia?: string;
  nhtsa?: string;
  epa?: string;
};

type YearEntry = {
  year: number;
  slug: string;
  summary: string;
  description: string;
  highlights?: string[];
  images: GalleryImage[];
  specs?: VehicleSpecs;
  sources?: CatalogSources;
};

type ModelEntry = {
  name: string;
  slug: string;
  tagline: string;
  years: YearEntry[];
  sources?: CatalogSources;
};

type MakeEntry = {
  name: string;
  slug: string;
  country: string;
  blurb: string;
  coverImage: GalleryImage;
  models: ModelEntry[];
};

type WikiSummary = {
  title: string;
  extract: string;
  description?: string;
  content_urls?: { desktop?: { page?: string } };
  originalimage?: { source: string; width: number; height: number };
  thumbnail?: { source: string; width: number; height: number };
  type?: string;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Strip generation notes like "(A90)" or "(C5/C6/C7/C8)". */
function cleanModelName(model: string): string {
  return model
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s*\/\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wikiTitleCandidates(brand: string, model: string): string[] {
  const cleaned = cleanModelName(model);
  const candidates = [
    `${brand} ${cleaned}`,
    `${brand} ${model}`,
    cleaned,
  ];

  if (brand === "Toyota" && /^supra/i.test(cleaned)) {
    candidates.unshift("Toyota GR Supra");
  }
  if (brand === "Chevrolet" && /^corvette/i.test(cleaned)) {
    candidates.unshift("Chevrolet Corvette");
  }
  if (brand === "Mercedes-Benz") {
    candidates.unshift(`Mercedes-Benz ${cleaned}`);
  }
  if (brand === "BMW" && /^\d/.test(cleaned)) {
    candidates.unshift(`BMW ${cleaned}`);
  }
  if (brand === "Hyundai" && /elantra/i.test(cleaned)) {
    candidates.unshift("Hyundai Elantra N", "Hyundai Elantra", "Elantra N");
  }
  if (brand === "Subaru" && /wrx/i.test(model)) {
    candidates.unshift("Subaru WRX", "Subaru Impreza WRX");
  }
  if (brand === "Mercedes-Benz" && /slk|slc/i.test(model)) {
    candidates.unshift("Mercedes-Benz SLK-Class", "Mercedes-Benz SLC-Class");
  }
  if (brand === "Tesla" && /roadster/i.test(cleaned)) {
    candidates.unshift("Tesla Roadster (2020)", "Tesla Roadster");
  }
  if (brand === "Mazda" && /miata/i.test(cleaned)) {
    candidates.unshift("Mazda MX-5", "Mazda MX-5 Miata");
  }
  if (brand === "Nissan" && cleaned.toLowerCase() === "z") {
    candidates.unshift("Nissan Z (RZ34)", "Nissan Fairlady Z", "Nissan Z");
  }

  return [...new Set(candidates.map((c) => c.trim()).filter(Boolean))];
}

function parentModelFallback(model: string): string | null {
  const cleaned = cleanModelName(model);
  if (/\s+N$/i.test(cleaned)) return cleaned.replace(/\s+N$/i, "").trim();
  if (/\s+Type R$/i.test(cleaned)) return cleaned.replace(/\s+Type R$/i, "").trim();
  if (/\s+Mach-E$/i.test(cleaned)) return null;
  if (/\//.test(model)) return cleanModelName(model.split("/")[0]);
  return null;
}

function brandBadge(slug: string, name: string): GalleryImage {
  return {
    src: `/brands/${slug}.svg`,
    alt: `${name} badge`,
    width: 512,
    height: 512,
  };
}

function isWeakCarImage(src: string, hint = ""): boolean {
  const s = `${src} ${hint}`.toLowerCase();
  return (
    s.includes("wikipedia-logo") ||
    s.includes("headquarter") ||
    s.includes("headquarters") ||
    s.includes("wordmark") ||
    s.includes("logo.svg") ||
    s.includes("_logo") ||
    s.includes("logo_") ||
    s.includes("flag_of") ||
    s.includes("coat_of_arms") ||
    s.includes("map_of") ||
    s.includes("diagram") ||
    s.endsWith(".svg") ||
    /\/commons\/.+\blogo\b/i.test(src)
  );
}

/** Prefer a stable mid-size Wikimedia thumb over huge originals. */
function toReliableWikiUrl(src: string, width = 1280): string {
  const https = src.replace(/^http:/, "https:");
  if (!https.includes("upload.wikimedia.org")) return https;

  if (https.includes("/thumb/")) {
    return https.replace(/\/\d+px-/, `/${width}px-`);
  }

  const match = https.match(
    /\/wikipedia\/([^/]+)\/([0-9a-f])\/([0-9a-f]{2})\/([^/?#]+)$/i,
  );
  if (!match) return https;
  const [, project, a, b, file] = match;
  if (/\.svg$/i.test(file)) return https;
  return `https://upload.wikimedia.org/wikipedia/${project}/thumb/${a}/${b}/${file}/${width}px-${file}`;
}

function galleryFromUrl(
  src: string,
  alt: string,
  width = 1280,
  height = 853,
): GalleryImage {
  return {
    src: toReliableWikiUrl(src, width),
    alt,
    width,
    height,
  };
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function cachePath(key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 180);
  return path.join(CACHE_DIR, `${safe}.json`);
}

async function cachedJson<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { cacheNull?: boolean } = {},
): Promise<T> {
  ensureDir(CACHE_DIR);
  const file = cachePath(key);
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  }
  const data = await fetcher();
  // Avoid permanently caching transient network failures as "missing".
  if (data == null && options.cacheNull === false) {
    return data;
  }
  fs.writeFileSync(file, JSON.stringify(data));
  return data;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson<T>(url: string): Promise<T | null> {
  await sleep(120);
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    console.warn(`HTTP ${res.status} for ${url}`);
    return null;
  }
  return (await res.json()) as T;
}

async function fetchWikiSummary(title: string): Promise<WikiSummary | null> {
  const encoded = encodeURIComponent(title.replace(/ /g, "_"));
  const file = cachePath(`wiki:${title}`);
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, "utf8")) as WikiSummary;
  }

  const encodedUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
  await sleep(120);
  const res = await fetch(encodedUrl, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  });

  // Real 404 → cache a missing stub. Transient errors → do not cache.
  if (res.status === 404) {
    const missing: WikiSummary = { title, extract: "", type: "missing" };
    ensureDir(CACHE_DIR);
    fs.writeFileSync(file, JSON.stringify(missing));
    return missing;
  }
  if (!res.ok) {
    console.warn(`HTTP ${res.status} for ${encodedUrl} (not cached)`);
    return null;
  }

  const data = (await res.json()) as WikiSummary;
  ensureDir(CACHE_DIR);
  fs.writeFileSync(file, JSON.stringify(data));
  return data;
}

async function resolveWiki(
  brand: string,
  model?: string,
): Promise<{
  extract: string;
  tagline: string;
  pageUrl?: string;
  image?: GalleryImage;
} | null> {
  const titles = model
    ? wikiTitleCandidates(brand, model)
    : [`${brand}`, `${brand} Motor Company`, `${brand} (company)`];

  for (const title of titles) {
    const summary = await fetchWikiSummary(title);
    if (!summary || summary.type === "disambiguation" || !summary.extract) {
      continue;
    }
    const raw =
      summary.originalimage?.source ?? summary.thumbnail?.source ?? null;
    let image: GalleryImage | undefined;
    if (raw && !isWeakCarImage(raw, title)) {
      image = galleryFromUrl(
        raw,
        `${model ? `${brand} ${cleanModelName(model)}` : brand} — Wikimedia`,
        summary.originalimage?.width && summary.originalimage.width < 2000
          ? summary.originalimage.width
          : 1280,
        summary.originalimage?.height && summary.originalimage.height < 1400
          ? summary.originalimage.height
          : 853,
      );
    }

    const extract = summary.extract.trim();
    const tagline =
      summary.description?.trim() ||
      extract.split(/(?<=\.)\s+/)[0]?.slice(0, 140) ||
      `${brand}${model ? ` ${cleanModelName(model)}` : ""}`;

    return {
      extract,
      tagline,
      pageUrl: summary.content_urls?.desktop?.page,
      image,
    };
  }
  return null;
}

type CommonsSearchResponse = {
  query?: {
    search?: Array<{ title: string }>;
  };
};

type CommonsImageInfoResponse = {
  query?: {
    pages?: Record<
      string,
      {
        imageinfo?: Array<{
          url?: string;
          width?: number;
          height?: number;
          mime?: string;
        }>;
      }
    >;
  };
};

async function commonsCarImage(
  brand: string,
  model: string,
): Promise<GalleryImage | undefined> {
  const cleaned = cleanModelName(model);
  const query = `${brand} ${cleaned}`;
  const brandAliases: Record<string, string[]> = {
    Volkswagen: ["volkswagen", "vw"],
    "Mercedes-Benz": ["mercedes-benz", "mercedes", "benz"],
    Chevrolet: ["chevrolet", "chevy"],
    Mazda: ["mazda", "mx-5", "miata"],
    Nissan: ["nissan", "fairlady"],
  };
  const aliases = (brandAliases[brand] ?? [brand.toLowerCase()]).map((a) =>
    a.toLowerCase(),
  );
  const modelTokens = cleaned
    .toLowerCase()
    .split(/[\s/-]+/)
    .filter((t) => t.length > 1 && !["the", "and", "class"].includes(t));

  const search = await cachedJson(`commons-search-v2:${query}`, async () =>
    fetchJson<CommonsSearchResponse>(
      `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        `${query} filetype:bitmap`,
      )}&srnamespace=6&srlimit=12&format=json&origin=*`,
    ),
  );

  for (const hit of search?.query?.search ?? []) {
    const title = hit.title;
    const lower = title.toLowerCase();
    if (isWeakCarImage(title, title)) continue;
    const brandHit = aliases.some((a) => lower.includes(a));
    const modelHit = modelTokens.some((t) => lower.includes(t));
    if (!brandHit || !modelHit) continue;

    const info = await cachedJson(`commons-info:${title}`, async () =>
      fetchJson<CommonsImageInfoResponse>(
        `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(
          title,
        )}&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=1280&format=json&origin=*`,
      ),
    );
    const page = Object.values(info?.query?.pages ?? {})[0];
    const ii = page?.imageinfo?.[0];
    if (!ii?.url || !ii.mime?.startsWith("image/")) continue;
    if (ii.mime.includes("svg") || isWeakCarImage(ii.url, title)) continue;
    return galleryFromUrl(
      ii.url,
      `${brand} ${cleaned}`,
      ii.width && ii.width > 400 ? Math.min(ii.width, 1280) : 1280,
      ii.height && ii.height > 300 ? Math.min(ii.height, 853) : 853,
    );
  }
  return undefined;
}

function imageFitsBrandModel(
  src: string,
  brand: string,
  model: string,
): boolean {
  const s = decodeURIComponent(src).toLowerCase();
  const cleaned = cleanModelName(model).toLowerCase();
  const brandAliases: Record<string, string[]> = {
    Volkswagen: ["volkswagen", "vw"],
    "Mercedes-Benz": ["mercedes-benz", "mercedes", "benz"],
    Chevrolet: ["chevrolet", "chevy"],
    Mazda: ["mazda", "mx-5", "miata"],
  };
  const aliases = (brandAliases[brand] ?? [brand.toLowerCase()]).map((a) =>
    a.toLowerCase(),
  );
  if (aliases.some((a) => s.includes(a))) return true;
  if (cleaned.split(/[\s/-]+/).some((t) => t.length > 2 && s.includes(t))) {
    // Model token present — OK unless a different brand is clearly named.
    const foreign = [
      "toyota",
      "ford",
      "chevrolet",
      "honda",
      "nissan",
      "hyundai",
      "kia",
      "subaru",
      "jeep",
      "gmc",
      "bmw",
      "mercedes",
      "tesla",
      "volkswagen",
      "mazda",
    ].filter((b) => !aliases.includes(b));
    if (foreign.some((b) => s.includes(b))) return false;
    return true;
  }
  return false;
}

async function resolveCarImage(
  brand: string,
  model: string,
  wikiImage?: GalleryImage,
): Promise<GalleryImage | undefined> {
  if (
    wikiImage &&
    !isWeakCarImage(wikiImage.src, wikiImage.alt) &&
    imageFitsBrandModel(wikiImage.src, brand, model)
  ) {
    return { ...wikiImage, src: toReliableWikiUrl(wikiImage.src) };
  }
  return commonsCarImage(brand, model);
}

async function resolveModelWiki(
  brand: string,
  model: string,
): Promise<{
  extract: string;
  tagline: string;
  pageUrl?: string;
  image?: GalleryImage;
} | null> {
  const primary = await resolveWiki(brand, model);
  if (primary?.extract) return primary;

  const parent = parentModelFallback(model);
  if (parent) {
    const fallback = await resolveWiki(brand, parent);
    if (fallback?.extract) {
      return {
        ...fallback,
        tagline: `${brand} ${cleanModelName(model)}`,
      };
    }
  }
  return primary;
}

type NhtsaModelsResponse = {
  Results?: Array<{ Make_Name?: string; Model_Name?: string }>;
};

type SafetyListResponse = {
  Results?: Array<{ VehicleId?: number; VehicleDescription?: string }>;
};

type SafetyDetailResponse = {
  Results?: Array<{
    OverallRating?: string;
    OverallFrontCrashRating?: string;
    OverallSideCrashRating?: string;
    RolloverRating?: string;
    VehicleDescription?: string;
    VehicleId?: number;
  }>;
};

type CvsResponse = {
  Results?: Array<{
    Specs?: Array<{ Name?: string; Value?: string }>;
  }>;
};

function nhtsaModelMatches(
  listed: string | undefined,
  wanted: string,
): boolean {
  if (!listed) return false;
  const a = listed.toLowerCase().replace(/[^a-z0-9]/g, "");
  const b = wanted.toLowerCase().replace(/[^a-z0-9]/g, "");
  return a === b || a.includes(b) || b.includes(a);
}

function ratingOrUndef(value?: string): string | undefined {
  if (!value || value === "Not Rated" || value === "Not Applicable") {
    return undefined;
  }
  return value;
}

function cvsValue(
  specs: Array<{ Name?: string; Value?: string }> | undefined,
  name: string,
): string | undefined {
  const hit = specs?.find((s) => s.Name === name)?.Value?.trim();
  if (!hit || hit === "0") return undefined;
  const num = Number(hit);
  if (!Number.isFinite(num)) return hit;
  return Number.isInteger(num) ? String(num) : num.toFixed(1);
}

async function fetchNhtsaSpecs(
  brand: string,
  model: string,
  year: number,
): Promise<VehicleSpecs | undefined> {
  const cleaned = cleanModelName(model);
  const makeEnc = encodeURIComponent(brand);
  const modelEnc = encodeURIComponent(cleaned);

  const modelsForYear = await cachedJson(
    `nhtsa-models:${brand}:${year}`,
    async () =>
      fetchJson<NhtsaModelsResponse>(
        `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${makeEnc}/modelyear/${year}?format=json`,
      ),
  );

  const available = Boolean(
    modelsForYear?.Results?.some((r) =>
      nhtsaModelMatches(r.Model_Name, cleaned),
    ),
  );

  const safetyList = await cachedJson(
    `nhtsa-safety:${brand}:${cleaned}:${year}`,
    async () =>
      fetchJson<SafetyListResponse>(
        `https://api.nhtsa.gov/SafetyRatings/modelyear/${year}/make/${makeEnc}/model/${modelEnc}?format=json`,
      ),
  );

  const trims = (safetyList?.Results ?? [])
    .map((r) => r.VehicleDescription?.trim())
    .filter((v): v is string => Boolean(v));
  const uniqueTrims = [...new Set(trims)].slice(0, 8);
  const first = safetyList?.Results?.[0];

  let overallRating: string | undefined;
  let frontCrashRating: string | undefined;
  let sideCrashRating: string | undefined;
  let rolloverRating: string | undefined;
  let vehicleDescription: string | undefined = first?.VehicleDescription;

  if (first?.VehicleId) {
    const detail = await cachedJson(
      `nhtsa-safety-id:${first.VehicleId}`,
      async () =>
        fetchJson<SafetyDetailResponse>(
          `https://api.nhtsa.gov/SafetyRatings/VehicleId/${first.VehicleId}?format=json`,
        ),
    );
    const row = detail?.Results?.[0];
    overallRating = ratingOrUndef(row?.OverallRating);
    frontCrashRating = ratingOrUndef(row?.OverallFrontCrashRating);
    sideCrashRating = ratingOrUndef(row?.OverallSideCrashRating);
    rolloverRating = ratingOrUndef(row?.RolloverRating);
    if (row?.VehicleDescription) {
      vehicleDescription = row.VehicleDescription;
    }
  }

  const cvs = await cachedJson(
    `nhtsa-cvs:${brand}:${cleaned}:${year}`,
    async () =>
      fetchJson<CvsResponse>(
        `https://vpic.nhtsa.dot.gov/api/vehicles/GetCanadianVehicleSpecifications/?year=${year}&make=${makeEnc}&model=${modelEnc}&units=US&format=json`,
      ),
  );
  const cvsSpecs = cvs?.Results?.[0]?.Specs;
  const overallLengthIn = cvsValue(cvsSpecs, "OL");
  const overallWidthIn = cvsValue(cvsSpecs, "OW");
  const overallHeightIn = cvsValue(cvsSpecs, "OH");
  const wheelbaseIn = cvsValue(cvsSpecs, "WB");
  const curbWeightLb = cvsValue(cvsSpecs, "CW");

  const hasSafety = Boolean(
    overallRating ||
      frontCrashRating ||
      sideCrashRating ||
      rolloverRating ||
      vehicleDescription,
  );
  const hasDims = Boolean(
    overallLengthIn ||
      overallWidthIn ||
      overallHeightIn ||
      wheelbaseIn ||
      curbWeightLb,
  );

  if (!available && !hasSafety && !hasDims) {
    return undefined;
  }

  return {
    make: brand,
    model: cleaned,
    modelYear: year,
    available,
    overallRating,
    frontCrashRating,
    sideCrashRating,
    rolloverRating,
    vehicleDescription,
    trimCount: uniqueTrims.length || undefined,
    trims: uniqueTrims.length ? uniqueTrims : undefined,
    overallLengthIn,
    overallWidthIn,
    overallHeightIn,
    wheelbaseIn,
    curbWeightLb,
  };
}

function buildYearCopy(
  brand: string,
  displayName: string,
  year: number,
  wikiExtract: string,
  specs?: VehicleSpecs,
): { summary: string; description: string; highlights: string[] } {
  const highlights: string[] = [];
  const bits: string[] = [];

  if (specs?.available) {
    highlights.push(`Listed for ${year} in NHTSA vPIC`);
  } else if (specs?.available === false) {
    highlights.push(`No clear ${year} vPIC model match`);
  }

  if (specs?.overallRating) {
    highlights.push(`NHTSA overall safety ${specs.overallRating}/5`);
    bits.push(`NHTSA overall rating ${specs.overallRating}/5`);
  }
  if (specs?.frontCrashRating) {
    highlights.push(`Front crash ${specs.frontCrashRating}/5`);
  }
  if (specs?.sideCrashRating) {
    highlights.push(`Side crash ${specs.sideCrashRating}/5`);
  }
  if (specs?.rolloverRating) {
    highlights.push(`Rollover ${specs.rolloverRating}/5`);
  }
  if (specs?.trimCount && specs.trimCount > 1) {
    highlights.push(`${specs.trimCount} NHTSA-rated configurations`);
  }
  if (specs?.wheelbaseIn) {
    highlights.push(`Wheelbase ${specs.wheelbaseIn} in`);
  }
  if (specs?.curbWeightLb) {
    highlights.push(`Curb weight about ${specs.curbWeightLb} lb`);
  }
  if (specs?.overallLengthIn && specs?.overallWidthIn) {
    highlights.push(
      `About ${specs.overallLengthIn} × ${specs.overallWidthIn} in (L×W)`,
    );
  }
  if (specs?.mpgCombined) {
    highlights.push(`EPA combined ${specs.mpgCombined} mpg`);
    if (!bits.length) bits.push(`EPA combined ${specs.mpgCombined} mpg`);
  } else if (specs?.rangeMiles) {
    highlights.push(`EPA range about ${specs.rangeMiles} mi`);
    if (!bits.length) bits.push(`EPA range about ${specs.rangeMiles} mi`);
  }
  if (specs?.electrificationLevel) {
    highlights.push(specs.electrificationLevel);
  }

  const summary = `${year} ${brand} ${displayName}${
    bits.length ? ` — ${bits[0]}` : specs?.available ? " — offered in the U.S. market" : ""
  }.`.slice(0, 220);

  const dimSentence =
    specs?.overallLengthIn || specs?.wheelbaseIn || specs?.curbWeightLb
      ? ` For the ${year} model year, published dimensions include${
          specs.overallLengthIn ? ` overall length ${specs.overallLengthIn} in` : ""
        }${specs.overallWidthIn ? `, width ${specs.overallWidthIn} in` : ""}${
          specs.overallHeightIn ? `, height ${specs.overallHeightIn} in` : ""
        }${specs.wheelbaseIn ? `, and wheelbase ${specs.wheelbaseIn} in` : ""}${
          specs.curbWeightLb ? `, with curb weight around ${specs.curbWeightLb} lb` : ""
        }.`
      : "";

  const safetySentence = specs?.overallRating
    ? ` NHTSA safety ratings for a representative ${year} configuration${
        specs.vehicleDescription ? ` (${specs.vehicleDescription})` : ""
      } include an overall score of ${specs.overallRating}/5${
        specs.frontCrashRating ? `, front crash ${specs.frontCrashRating}/5` : ""
      }${specs.sideCrashRating ? `, side crash ${specs.sideCrashRating}/5` : ""}${
        specs.rolloverRating ? `, and rollover ${specs.rolloverRating}/5` : ""
      }.`
    : specs?.vehicleDescription
      ? ` NHTSA lists ${year} configurations such as ${specs.vehicleDescription}.`
      : specs?.available
        ? ` This model appears in NHTSA vPIC for ${year}, though detailed crash ratings may not be published yet.`
        : ` Detailed ${year} NHTSA crash ratings were not found for this nameplate.`;

  const trimSentence =
    specs?.trims && specs.trims.length > 1
      ? ` Rated configurations include: ${specs.trims.slice(0, 5).join("; ")}.`
      : "";

  const efficiencySentence = specs?.mpgCombined
    ? ` EPA fuel economy for a representative ${year} configuration is about ${
        specs.mpgCity != null ? `${specs.mpgCity} city / ` : ""
      }${specs.mpgHighway != null ? `${specs.mpgHighway} highway / ` : ""}${
        specs.mpgCombined
      } combined mpg${
        specs.electrificationLevel
          ? ` (${specs.electrificationLevel.toLowerCase()})`
          : ""
      }.`
    : specs?.rangeMiles
      ? ` EPA lists an estimated driving range around ${specs.rangeMiles} miles for a representative ${year} configuration.`
      : "";

  const description = [
    `The ${year} ${brand} ${displayName} continues this nameplate in the motomediax catalog.`,
    wikiExtract,
    safetySentence.trim(),
    dimSentence.trim(),
    efficiencySentence.trim(),
    trimSentence.trim(),
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return { summary, description, highlights: highlights.slice(0, 8) };
}

async function buildCatalog(): Promise<MakeEntry[]> {
  const seeds = JSON.parse(fs.readFileSync(BRANDS_PATH, "utf8")) as BrandSeed[];
  const catalog: MakeEntry[] = [];
  let modelCount = 0;
  let yearCount = 0;
  let skipped = 0;
  let noPhoto = 0;
  let epaHits = 0;

  console.log("\n== EPA FuelEconomy.gov ==");
  let epaIndex: EpaIndex;
  try {
    epaIndex = await loadEpaIndex(YEARS);
  } catch (err) {
    console.warn("  EPA load failed; continuing without MPG enrichment:", err);
    epaIndex = { byMakeYear: new Map() };
  }

  for (const seed of seeds) {
    console.log(`\n== ${seed.brand} (${seed.models.length} models) ==`);
    const brandWiki = await resolveWiki(seed.brand);
    const makeSlug = slugify(seed.brand);
    const coverImage = brandBadge(makeSlug, seed.brand);

    const models: ModelEntry[] = [];

    for (const modelName of seed.models) {
      const displayName = cleanModelName(modelName);
      const modelWiki = await resolveModelWiki(seed.brand, modelName);
      if (!modelWiki?.extract) {
        console.warn(`  skip (no wiki): ${seed.brand} ${modelName}`);
        skipped += 1;
        continue;
      }

      const carImage = await resolveCarImage(
        seed.brand,
        modelName,
        modelWiki.image,
      );
      if (!carImage) {
        console.warn(`  warn (no photo): ${seed.brand} ${displayName}`);
        noPhoto += 1;
      }

      const years: YearEntry[] = [];
      const extract = modelWiki.extract;
      const tagline = modelWiki.tagline || `${seed.brand} ${displayName}`;

      const modelSlug = slugify(displayName);
      const yearList = MODEL_YEARS[`${makeSlug}/${modelSlug}`] ?? [...YEARS];

      for (const year of yearList) {
        const nhtsa = await fetchNhtsaSpecs(seed.brand, modelName, year);
        const epa = lookupEpaSummary(epaIndex, seed.brand, modelName, year);
        if (epa) epaHits += 1;
        const specs = mergeEpaIntoSpecs(nhtsa, epa);
        const { summary, description, highlights } = buildYearCopy(
          seed.brand,
          displayName,
          year,
          extract,
          specs,
        );

        const images: GalleryImage[] = carImage
          ? [
              {
                ...carImage,
                alt: `${year} ${seed.brand} ${displayName}`,
              },
            ]
          : [];

        // Keep the year page even without a photo if we have copy; UI shows placeholder.
        if (!images.length && !description.trim()) {
          continue;
        }

        years.push({
          year,
          slug: String(year),
          summary,
          description,
          highlights,
          images,
          specs,
          sources: {
            wikipedia: modelWiki.pageUrl ?? brandWiki?.pageUrl,
            nhtsa: specs ? "https://www.nhtsa.gov/ratings" : undefined,
            epa: epa
              ? "https://www.fueleconomy.gov/feg/download.shtml"
              : undefined,
          },
        });
        yearCount += 1;
      }

      if (years.length === 0) {
        skipped += 1;
        continue;
      }

      models.push({
        name: displayName,
        slug: slugify(displayName),
        tagline: tagline.slice(0, 160),
        years,
        sources: {
          wikipedia: modelWiki.pageUrl ?? brandWiki?.pageUrl,
        },
      });
      modelCount += 1;
      process.stdout.write(
        `  ✓ ${displayName}${carImage ? "" : " (text only)"}\n`,
      );
    }

    if (models.length === 0) {
      console.warn(`  no models kept for ${seed.brand}`);
      continue;
    }

    catalog.push({
      name: seed.brand,
      slug: makeSlug,
      country: BRAND_COUNTRY[seed.brand] ?? "Unknown",
      blurb: (
        brandWiki?.extract ||
        `${seed.brand} vehicles in the motomediax catalog.`
      ).slice(0, 400),
      coverImage,
      models,
    });
  }

  console.log(
    `\nDone: ${catalog.length} makes, ${modelCount} models, ${yearCount} years, ${skipped} skipped, ${noPhoto} without photo, ${epaHits} EPA matches`,
  );
  return catalog;
}

async function localizeImages(catalog: MakeEntry[]): Promise<MakeEntry[]> {
  const mediaDir = path.join(ROOT, "public", "catalog");
  ensureDir(mediaDir);
  const downloaded = new Map<string, string>();
  let ok = 0;
  let fail = 0;

  async function fetchWithRetry(url: string, attempts = 5): Promise<Buffer> {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i += 1) {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": USER_AGENT },
        });
        if (res.status === 429) {
          await sleep(2000 * (i + 1));
          continue;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return Buffer.from(await res.arrayBuffer());
      } catch (e) {
        lastErr = e;
        await sleep(1000 * (i + 1));
      }
    }
    throw lastErr ?? new Error("download failed");
  }

  async function localizeOne(
    img: GalleryImage,
    key: string,
  ): Promise<GalleryImage> {
    if (!img.src.startsWith("http")) return img;
    if (downloaded.has(img.src)) {
      return { ...img, src: downloaded.get(img.src)! };
    }

    const extMatch = img.src.match(/\.(jpe?g|png|webp|gif)(?:\?|$)/i);
    const ext = (extMatch?.[1] ?? "jpg").toLowerCase().replace("jpeg", "jpg");
    const fileName = `${key}.${ext}`;
    const abs = path.join(mediaDir, fileName);
    const pub = `/catalog/${fileName}`;

    if (!fs.existsSync(abs) || fs.statSync(abs).size < 1000) {
      try {
        const buf = await fetchWithRetry(img.src);
        fs.writeFileSync(abs, buf);
        ok += 1;
      } catch (e) {
        fail += 1;
        console.warn(`  image download failed (${key}): ${e}`);
        downloaded.set(img.src, img.src);
        return img;
      }
    } else {
      ok += 1;
    }

    downloaded.set(img.src, pub);
    return { ...img, src: pub };
  }

  for (const make of catalog) {
    for (const model of make.models) {
      const key = `${make.slug}--${model.slug}`;
      const first = model.years[0]?.images[0];
      if (!first) continue;
      const localized = await localizeOne(first, key);
      for (const year of model.years) {
        year.images = year.images.map((img) =>
          img.src === first.src || img.src === localized.src
            ? { ...localized, alt: img.alt }
            : img,
        );
        if (!year.images.length && localized.src) {
          year.images = [{ ...localized, alt: `${year.year} ${make.name} ${model.name}` }];
        }
      }
      await sleep(150);
    }
  }

  console.log(`Localized images: ${ok} ok, ${fail} failed → public/catalog/`);
  return catalog;
}

async function main() {
  ensureDir(path.dirname(OUT_PATH));
  const catalog = await localizeImages(await buildCatalog());
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`Wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
