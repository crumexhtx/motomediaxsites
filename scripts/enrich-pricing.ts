/**
 * Pull used asking averages from Auto.dev listings into pricing-overrides.json.
 * Requires AUTODEVAPI. Cache-friendly; prefers used retail listings with price.
 *
 * Usage:
 *   pnpm enrich:pricing [brand] [--force] [--dry-run] [--limit N]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadEnvLocal,
  requireAutodevApiKey,
  slugify,
} from "./autodev";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CATALOG_PATH = path.join(ROOT, "src/data/catalog.generated.json");
const OUT_PATH = path.join(ROOT, "src/data/pricing-overrides.json");
const CACHE_DIR = path.join(__dirname, ".cache", "pricing");

const FORCE = process.argv.includes("--force");
const DRY_RUN = process.argv.includes("--dry-run");
const API_BASE = "https://api.auto.dev";
const MIN_DELAY_MS = 250;

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("-")) {
    return process.argv[i + 1];
  }
  return undefined;
}

const LIMIT = (() => {
  const raw = argValue("--limit");
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
})();

const brandArg = process.argv
  .slice(2)
  .find(
    (a, i, arr) =>
      !a.startsWith("-") &&
      arr[i - 1] !== "--limit" &&
      a !== "--force" &&
      a !== "--dry-run",
  );
const BRAND = brandArg?.toLowerCase();

type YearTarget = {
  makeName: string;
  makeSlug: string;
  modelName: string;
  modelSlug: string;
  year: number;
};

type OverrideEntry = {
  usedAverage: number;
  sampleSize: number;
  asOf: string;
  source: string;
};

let lastFetchAt = 0;

async function throttle() {
  const wait = MIN_DELAY_MS - (Date.now() - lastFetchAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastFetchAt = Date.now();
}

function cachePath(makeSlug: string, modelSlug: string, year: number) {
  return path.join(CACHE_DIR, `${makeSlug}--${modelSlug}--${year}.json`);
}

async function fetchUsedPrices(
  apiKey: string,
  make: string,
  model: string,
  year: number,
): Promise<number[]> {
  const file = cachePath(slugify(make), slugify(model), year);
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  if (!FORCE && fs.existsSync(file)) {
    const cached = JSON.parse(fs.readFileSync(file, "utf8")) as {
      prices?: number[];
    };
    return cached.prices ?? [];
  }

  const params = new URLSearchParams({
    "vehicle.make": make,
    "vehicle.model": model,
    "vehicle.year": String(year),
    "retailListing.used": "true",
    includeUnpriced: "false",
    limit: "50",
    select: "vehicle.year,retailListing.price",
  });

  await throttle();
  const res = await fetch(`${API_BASE}/listings?${params}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "User-Agent": "motomediax/0.1 (pricing enrich)",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Auto.dev HTTP ${res.status} for ${make} ${model} ${year}: ${body.slice(0, 160)}`,
    );
  }
  const json = (await res.json()) as { data?: unknown[] };
  const prices: number[] = [];
  for (const row of json.data ?? []) {
    const r = row as Record<string, unknown>;
    const nested = r.retailListing as { price?: unknown } | undefined;
    const raw =
      nested?.price ??
      r["retailListing.price"] ??
      r.price;
    const n = typeof raw === "number" ? raw : Number(raw);
    if (Number.isFinite(n) && n > 1000 && n < 1_000_000) prices.push(n);
  }
  fs.writeFileSync(file, `${JSON.stringify({ fetchedAt: new Date().toISOString(), prices }, null, 2)}\n`);
  return prices;
}

function median(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
}

async function main() {
  loadEnvLocal();
  const apiKey = requireAutodevApiKey();
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8")) as Array<{
    name: string;
    slug: string;
    models: Array<{
      name: string;
      slug: string;
      years: Array<{ year: number }>;
    }>;
  }>;

  const existing = fs.existsSync(OUT_PATH)
    ? (JSON.parse(fs.readFileSync(OUT_PATH, "utf8")) as Record<
        string,
        OverrideEntry
      >)
    : {};

  const targets: YearTarget[] = [];
  for (const make of catalog) {
    if (BRAND && make.slug !== BRAND) continue;
    for (const model of make.models) {
      for (const year of model.years) {
        targets.push({
          makeName: make.name,
          makeSlug: make.slug,
          modelName: model.name,
          modelSlug: model.slug,
          year: year.year,
        });
      }
    }
  }

  const slice = LIMIT ? targets.slice(0, LIMIT) : targets;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const t of slice) {
    const key = `${t.makeSlug}/${t.modelSlug}/${t.year}`;
    try {
      const prices = await fetchUsedPrices(
        apiKey,
        t.makeName,
        t.modelName,
        t.year,
      );
      const avg = median(prices);
      if (avg == null || prices.length < 3) {
        skipped += 1;
        console.log(`skip ${key} (n=${prices.length})`);
        continue;
      }
      existing[key] = {
        usedAverage: avg,
        sampleSize: prices.length,
        asOf: new Date().toISOString().slice(0, 10),
        source: "Auto.dev",
      };
      updated += 1;
      console.log(`ok ${key} avg=$${avg} n=${prices.length}`);
    } catch (err) {
      failed += 1;
      console.error(`fail ${key}:`, err instanceof Error ? err.message : err);
    }
  }

  if (!DRY_RUN) {
    fs.writeFileSync(OUT_PATH, `${JSON.stringify(existing, null, 2)}\n`);
  }
  console.log(
    `\nDone. updated=${updated} skipped=${skipped} failed=${failed} dryRun=${DRY_RUN}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
