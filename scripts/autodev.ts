/**
 * Auto.dev Listings helpers for offline catalog enrichment.
 * Docs: https://docs.auto.dev/v2/products/vehicle-listings
 *
 * Cache-first: responses live under scripts/.cache/autodev/ (gitignored).
 * Never log the API key.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CACHE_DIR = path.join(__dirname, ".cache", "autodev");
const API_BASE = "https://api.auto.dev";
const USER_AGENT = "motomediax/0.1 (catalog enrich; https://github.com/motomediax)";

/** Stay under Starter 5 rps. */
const MIN_DELAY_MS = 220;

export const YEAR_RANGE = "2024-2026" as const;

export type AutodevListingVehicle = {
  vin?: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  drivetrain?: string;
  engine?: string;
  fuel?: string;
  transmission?: string;
  doors?: number;
  seats?: number;
};

export type AutodevCacheEnvelope = {
  fetchedAt: string;
  make: string;
  model: string;
  yearRange: string;
  /** Raw API envelope (data + facets + links). */
  response: {
    data?: unknown;
    facets?: Record<string, Record<string, string>>;
    links?: Record<string, string>;
    total?: number;
  };
};

export type AutodevYearSummary = {
  driveType?: string;
  fuelTypePrimary?: string;
  seatingCapacity?: number;
  transmission?: string;
  engine?: string;
  trimCount?: number;
  trims?: string[];
  sampleVin?: string;
  listingCount: number;
};

export type AutodevFetchStats = {
  apiCalls: number;
  cacheHits: number;
};

let lastFetchAt = 0;
const stats: AutodevFetchStats = { apiCalls: 0, cacheHits: 0 };

export function getAutodevFetchStats(): AutodevFetchStats {
  return { ...stats };
}

export function resetAutodevFetchStats(): void {
  stats.apiCalls = 0;
  stats.cacheHits = 0;
}

/** Load KEY=VALUE pairs from .env.local into process.env (does not override). */
export function loadEnvLocal(): void {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function requireAutodevApiKey(): string {
  loadEnvLocal();
  const key = process.env.AUTODEVAPI?.trim();
  if (!key) {
    throw new Error(
      "Missing AUTODEVAPI. Add it to .env.local (see .env.example).",
    );
  }
  return key;
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function cacheFilePath(makeSlug: string, modelSlug: string): string {
  return path.join(CACHE_DIR, `${makeSlug}--${modelSlug}.json`);
}

async function throttle(): Promise<void> {
  const wait = MIN_DELAY_MS - (Date.now() - lastFetchAt);
  if (wait > 0) {
    await new Promise((r) => setTimeout(r, wait));
  }
  lastFetchAt = Date.now();
}

function normalizeListingRow(row: Record<string, unknown>): AutodevListingVehicle {
  // Default nested shape
  const vehicle = row.vehicle as Record<string, unknown> | undefined;
  if (vehicle && typeof vehicle === "object") {
    return {
      vin: str(vehicle.vin) ?? str(row.vin),
      year: num(vehicle.year),
      make: str(vehicle.make),
      model: str(vehicle.model),
      trim: str(vehicle.trim),
      drivetrain: str(vehicle.drivetrain),
      engine: str(vehicle.engine),
      fuel: str(vehicle.fuel),
      transmission: str(vehicle.transmission),
      doors: num(vehicle.doors),
      seats: num(vehicle.seats),
    };
  }

  // Flat ?select= shape: "vehicle.year", etc.
  return {
    vin: str(row["vehicle.vin"]) ?? str(row.vin),
    year: num(row["vehicle.year"]),
    make: str(row["vehicle.make"]),
    model: str(row["vehicle.model"]),
    trim: str(row["vehicle.trim"]),
    drivetrain: str(row["vehicle.drivetrain"]),
    engine: str(row["vehicle.engine"]),
    fuel: str(row["vehicle.fuel"]),
    transmission: str(row["vehicle.transmission"]),
    doors: num(row["vehicle.doors"]),
    seats: num(row["vehicle.seats"]),
  };
}

function str(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim()) return v.trim();
  return undefined;
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/** Parse facet keys like "LE (1234)" → "LE". */
export function parseFacetLabels(
  facets: Record<string, string> | undefined,
): string[] {
  if (!facets) return [];
  const labels: string[] = [];
  for (const key of Object.keys(facets)) {
    const label = key.replace(/\s*\(\d+\)\s*$/, "").trim();
    if (label) labels.push(label);
  }
  return labels;
}

function mode<T extends string | number>(values: T[]): T | undefined {
  if (!values.length) return undefined;
  const counts = new Map<T, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best: T | undefined;
  let bestN = 0;
  for (const [v, n] of counts) {
    if (n > bestN) {
      best = v;
      bestN = n;
    }
  }
  return best;
}

const SELECT_FIELDS = [
  "vehicle.vin",
  "vehicle.year",
  "vehicle.make",
  "vehicle.model",
  "vehicle.trim",
  "vehicle.drivetrain",
  "vehicle.engine",
  "vehicle.fuel",
  "vehicle.transmission",
  "vehicle.doors",
  "vehicle.seats",
].join(",");

async function fetchListingsFromApi(
  apiKey: string,
  make: string,
  model: string,
  yearRange: string,
): Promise<AutodevCacheEnvelope["response"]> {
  const params = new URLSearchParams({
    "vehicle.make": make,
    "vehicle.model": model,
    "vehicle.year": yearRange,
    limit: "20",
    includes: "facets",
    select: SELECT_FIELDS,
  });
  const url = `${API_BASE}/listings?${params.toString()}`;

  await throttle();
  stats.apiCalls += 1;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Auto.dev listings HTTP ${res.status} for ${make} ${model}: ${body.slice(0, 200)}`,
    );
  }

  return (await res.json()) as AutodevCacheEnvelope["response"];
}

/**
 * Load listings for make+model from disk cache, or fetch once and cache.
 */
export async function loadListingsCache(
  make: string,
  model: string,
  options: { force?: boolean; yearRange?: string } = {},
): Promise<AutodevCacheEnvelope> {
  const yearRange = options.yearRange ?? YEAR_RANGE;
  const makeSlug = slugify(make);
  const modelSlug = slugify(model);
  const file = cacheFilePath(makeSlug, modelSlug);
  ensureDir(CACHE_DIR);

  if (!options.force && fs.existsSync(file)) {
    stats.cacheHits += 1;
    return JSON.parse(fs.readFileSync(file, "utf8")) as AutodevCacheEnvelope;
  }

  const apiKey = requireAutodevApiKey();
  const response = await fetchListingsFromApi(apiKey, make, model, yearRange);
  const envelope: AutodevCacheEnvelope = {
    fetchedAt: new Date().toISOString(),
    make,
    model,
    yearRange,
    response,
  };
  fs.writeFileSync(file, `${JSON.stringify(envelope, null, 2)}\n`);
  return envelope;
}

function listingsFromEnvelope(
  envelope: AutodevCacheEnvelope,
): AutodevListingVehicle[] {
  const data = envelope.response.data;
  if (!Array.isArray(data)) return [];
  return data.map((row) =>
    normalizeListingRow(row as Record<string, unknown>),
  );
}

/**
 * Aggregate listings + facets into a year-level summary for catalog merge.
 */
export function summarizeYear(
  envelope: AutodevCacheEnvelope,
  year: number,
): AutodevYearSummary | undefined {
  const all = listingsFromEnvelope(envelope);
  const forYear = all.filter((v) => v.year === year);
  const pool = forYear.length ? forYear : all;

  if (!pool.length && !envelope.response.facets) {
    return undefined;
  }

  const drives = pool
    .map((v) => v.drivetrain)
    .filter((x): x is string => Boolean(x));
  const fuels = pool.map((v) => v.fuel).filter((x): x is string => Boolean(x));
  const transmissions = pool
    .map((v) => v.transmission)
    .filter((x): x is string => Boolean(x));
  const engines = pool
    .map((v) => v.engine)
    .filter((x): x is string => Boolean(x));
  const seats = pool
    .map((v) => v.seats)
    .filter((x): x is number => x != null && x > 0);
  const trimsFromListings = [
    ...new Set(
      pool.map((v) => v.trim).filter((x): x is string => Boolean(x)),
    ),
  ];

  const facetTrims = parseFacetLabels(envelope.response.facets?.trims);
  // Facets are market-wide aggregates (richer than a 20-row sample).
  // Prefer them when they have at least as many names as the listing sample.
  const trims = (
    facetTrims.length >= trimsFromListings.length && facetTrims.length
      ? facetTrims
      : trimsFromListings.length
        ? trimsFromListings
        : facetTrims
  ).slice(0, 24);

  const sampleVin = pool.find((v) => v.vin)?.vin;

  if (
    !drives.length &&
    !fuels.length &&
    !seats.length &&
    !trims.length &&
    !transmissions.length
  ) {
    return undefined;
  }

  return {
    driveType: mode(drives),
    fuelTypePrimary: mode(fuels),
    seatingCapacity: mode(seats),
    transmission: mode(transmissions),
    engine: mode(engines),
    trimCount: trims.length || undefined,
    trims: trims.length ? trims : undefined,
    sampleVin,
    listingCount: forYear.length || pool.length,
  };
}

/**
 * Fill empty VehicleSpecs keys from Auto.dev summary (never overwrite).
 */
export function mergeAutodevIntoSpecs<T extends Record<string, unknown>>(
  specs: T | undefined,
  summary: AutodevYearSummary | undefined,
): T | undefined {
  if (!summary) return specs;
  const next = { ...(specs ?? {}) } as T & {
    driveType?: string;
    fuelTypePrimary?: string;
    seatingCapacity?: number;
    trimCount?: number;
    trims?: string[];
  };

  if (!next.driveType && summary.driveType) next.driveType = summary.driveType;
  if (!next.fuelTypePrimary && summary.fuelTypePrimary) {
    next.fuelTypePrimary = summary.fuelTypePrimary;
  }
  if (next.seatingCapacity == null && summary.seatingCapacity != null) {
    next.seatingCapacity = summary.seatingCapacity;
  }
  // Prefer Auto.dev trim names when existing trims look like NHTSA blurbs,
  // are missing, or are a thinner sample than the Auto.dev facet list.
  if (summary.trims?.length) {
    const existing = next.trims;
    const looksLikeNhtsa =
      !existing?.length ||
      existing.every(
        (t) =>
          /\b\d{4}\b/.test(t) &&
          (t.includes(" DR ") || t.includes(" HB ") || t.includes("N/A")),
      );
    const richer =
      !existing?.length || summary.trims.length > existing.length;
    if (!existing?.length || looksLikeNhtsa || richer) {
      next.trims = summary.trims;
      next.trimCount = summary.trimCount ?? summary.trims.length;
    } else if (next.trimCount == null) {
      next.trimCount = existing.length;
    }
  }

  return next;
}

/**
 * Backfill empty mechanical fields on a curated trim row.
 */
export function mergeAutodevIntoTrim<
  T extends {
    engine?: string;
    transmission?: string;
    drivetrain?: string;
    seatingCapacity?: number;
  },
>(trim: T, summary: AutodevYearSummary | undefined): T {
  if (!summary) return trim;
  const next = { ...trim };
  if (!next.engine && summary.engine) next.engine = summary.engine;
  if (!next.transmission && summary.transmission) {
    next.transmission = summary.transmission;
  }
  if (!next.drivetrain && summary.driveType) next.drivetrain = summary.driveType;
  if (next.seatingCapacity == null && summary.seatingCapacity != null) {
    next.seatingCapacity = summary.seatingCapacity;
  }
  return next;
}
