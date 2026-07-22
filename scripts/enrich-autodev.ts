/**
 * Patch Auto.dev listing-derived fields into catalog.generated.json.
 * Cache-first — re-runs cost 0 API calls unless --force.
 *
 * Usage:
 *   pnpm enrich:autodev [brand] [--force] [--dry-run] [--limit N]
 * Examples:
 *   pnpm enrich:autodev toyota
 *   pnpm enrich:autodev --limit 5
 *   pnpm enrich:autodev ford --force
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getAutodevFetchStats,
  loadEnvLocal,
  loadListingsCache,
  mergeAutodevIntoSpecs,
  mergeAutodevIntoTrim,
  requireAutodevApiKey,
  resetAutodevFetchStats,
  summarizeYear,
  YEAR_RANGE,
} from "./autodev";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_PATH = path.join(ROOT, "src/data/catalog.generated.json");

const FORCE = process.argv.includes("--force");
const DRY_RUN = process.argv.includes("--dry-run");

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

type TrimRow = {
  id: string;
  name: string;
  engine?: string;
  transmission?: string;
  drivetrain?: string;
  seatingCapacity?: number;
  [k: string]: unknown;
};

type YearEntry = {
  year: number;
  specs?: Record<string, unknown>;
  sources?: { autodev?: string; [k: string]: unknown };
  performance?: { trims?: TrimRow[]; [k: string]: unknown };
  [k: string]: unknown;
};

type ModelEntry = {
  name: string;
  slug: string;
  years: YearEntry[];
  [k: string]: unknown;
};

type MakeEntry = {
  name: string;
  slug: string;
  models: ModelEntry[];
  [k: string]: unknown;
};

async function main() {
  loadEnvLocal();
  // Validate key early when we may need network; cache-only runs still ok without
  // a key if every model is already cached — but --force always needs it.
  if (FORCE) requireAutodevApiKey();
  else {
    try {
      requireAutodevApiKey();
    } catch {
      console.warn(
        "AUTODEVAPI not set — will only succeed if all models are already cached.",
      );
    }
  }

  if (!fs.existsSync(OUT_PATH)) {
    throw new Error(`Missing ${OUT_PATH} — run pnpm build:catalog first`);
  }

  const catalog = JSON.parse(fs.readFileSync(OUT_PATH, "utf8")) as MakeEntry[];
  resetAutodevFetchStats();

  let modelsProcessed = 0;
  let yearsPatched = 0;
  let modelsSkippedEmpty = 0;

  const makes = BRAND
    ? catalog.filter((m) => m.slug === BRAND || m.name.toLowerCase() === BRAND)
    : catalog;

  if (BRAND && !makes.length) {
    throw new Error(`No make matching "${BRAND}" in catalog`);
  }

  outer: for (const make of makes) {
    for (const model of make.models) {
      if (LIMIT != null && modelsProcessed >= LIMIT) break outer;

      console.log(`  ${make.name} ${model.name} …`);
      let envelope;
      try {
        envelope = await loadListingsCache(make.name, model.name, {
          force: FORCE,
          yearRange: YEAR_RANGE,
        });
      } catch (err) {
        console.warn(
          `  ! skip ${make.name} ${model.name}: ${err instanceof Error ? err.message : err}`,
        );
        continue;
      }

      modelsProcessed += 1;
      let modelHits = 0;

      for (const year of model.years) {
        const summary = summarizeYear(envelope, year.year);
        if (!summary) continue;

        const before = JSON.stringify(year.specs ?? null);
        year.specs = mergeAutodevIntoSpecs(year.specs, summary) as Record<
          string,
          unknown
        >;
        year.sources = {
          ...year.sources,
          autodev: "https://www.auto.dev/",
        };

        if (year.performance?.trims?.length) {
          year.performance.trims = year.performance.trims.map((t) =>
            mergeAutodevIntoTrim(t, summary),
          );
        }

        if (JSON.stringify(year.specs ?? null) !== before || year.sources.autodev) {
          modelHits += 1;
          yearsPatched += 1;
        }
      }

      if (!modelHits) modelsSkippedEmpty += 1;
    }
  }

  if (!DRY_RUN) {
    fs.writeFileSync(OUT_PATH, `${JSON.stringify(catalog, null, 2)}\n`);
  }

  const { apiCalls, cacheHits } = getAutodevFetchStats();
  console.log(
    [
      DRY_RUN ? "Dry run — catalog not written." : `Patched ${OUT_PATH}`,
      `models=${modelsProcessed}`,
      `years touched=${yearsPatched}`,
      `empty models=${modelsSkippedEmpty}`,
      `apiCalls=${apiCalls}`,
      `cacheHits=${cacheHits}`,
      FORCE ? "(force)" : "",
      BRAND ? `brand=${BRAND}` : "",
      LIMIT != null ? `limit=${LIMIT}` : "",
    ]
      .filter(Boolean)
      .join(" | "),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
