/**
 * Shared helpers for catalog validation / image audit scripts.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { MakeEntry } from "../../src/data/catalog";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.join(scriptsDir, "..", "..");

export const DEFAULT_YEARS = [2024, 2025, 2026] as const;

export type BrandSeed = { brand: string; models: string[] };

export type Issue = { level: "error" | "warn"; message: string };

export function loadCatalog(): MakeEntry[] {
  const catalogPath = path.join(ROOT, "src/data/catalog.generated.json");
  if (!fs.existsSync(catalogPath)) {
    throw new Error(
      `Missing ${catalogPath}. Run \`pnpm build:catalog\` first.`,
    );
  }
  return JSON.parse(fs.readFileSync(catalogPath, "utf8")) as MakeEntry[];
}

export function loadBrands(): BrandSeed[] {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, "src/data/brands.json"), "utf8"),
  ) as BrandSeed[];
}

export function loadModelYearOverrides(): Record<string, number[]> {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, "src/data/model-years.json"), "utf8"),
  ) as Record<string, number[]>;
}

/** Allowed years for a make/model: model-years.json override or default 2024–2026. */
export function allowedYearsForModel(
  makeSlug: string,
  modelSlug: string,
  overrides: Record<string, number[]>,
): Set<number> {
  const key = `${makeSlug}/${modelSlug}`;
  const listed = overrides[key];
  if (listed?.length) return new Set(listed);
  return new Set(DEFAULT_YEARS);
}

/** Strip parentheticals / slashes used in brands.json seed names. */
export function cleanModelName(model: string): string {
  return model
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s*\/\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeModelKey(model: string): string {
  return cleanModelName(model).toLowerCase();
}

export function catalogStats(catalog: MakeEntry[]) {
  return {
    makes: catalog.length,
    models: catalog.reduce((n, m) => n + m.models.length, 0),
    years: catalog.reduce(
      (n, m) => n + m.models.reduce((y, model) => y + model.years.length, 0),
      0,
    ),
  };
}

/** Local public asset check. SVGs only need to exist; rasters need >500 bytes. */
export function localPublicAssetIssue(
  src: string,
): "missing" | "too-small" | null {
  if (!src.startsWith("/")) return null;
  const abs = path.join(ROOT, "public", src.replace(/^\//, ""));
  if (!fs.existsSync(abs)) return "missing";
  const size = fs.statSync(abs).size;
  if (src.endsWith(".svg")) {
    return size > 0 ? null : "too-small";
  }
  return size < 500 ? "too-small" : null;
}

/** Recall data older than this is considered stale (days). */
export const RECALL_MAX_AGE_DAYS = 7;

/**
 * Newest `safetyStatus.fetchedAt` across the catalog — the last time any
 * recall/complaint lookup succeeded. Ignores missing / unparsable stamps.
 */
export function newestRecallFetchedAt(catalog: MakeEntry[]): string | undefined {
  let newest: string | undefined;
  let newestMs = -Infinity;
  for (const make of catalog) {
    for (const model of make.models) {
      for (const year of model.years) {
        const at = year.safetyStatus?.fetchedAt;
        if (!at) continue;
        const ms = Date.parse(at);
        if (Number.isNaN(ms)) continue;
        if (ms > newestMs) {
          newestMs = ms;
          newest = at;
        }
      }
    }
  }
  return newest;
}

/**
 * Freshness check for recall data: an issue (never null-and-silent) when the
 * newest recall fetch is older than `maxAgeDays`, or when there is none.
 * Severity is "error" in CI and "warn" for local runs.
 */
export function recallFreshnessIssue(
  catalog: MakeEntry[],
  opts: { now?: Date; isCi?: boolean; maxAgeDays?: number } = {},
): Issue | null {
  const now = opts.now ?? new Date();
  const maxAgeDays = opts.maxAgeDays ?? RECALL_MAX_AGE_DAYS;
  const level: Issue["level"] = opts.isCi ? "error" : "warn";
  const newest = newestRecallFetchedAt(catalog);
  if (!newest) {
    return {
      level,
      message: `No recall fetchedAt found anywhere in the catalog — run pnpm enrich:nhtsa-recalls -- --force`,
    };
  }
  const ageDays = (now.getTime() - Date.parse(newest)) / 86_400_000;
  if (ageDays > maxAgeDays) {
    return {
      level,
      message: `Recall data is stale: newest fetchedAt is ${newest.slice(0, 10)} (${Math.floor(ageDays)} days ago, limit ${maxAgeDays}). The daily-recalls workflow is not landing fresh data — check its latest run, or run pnpm enrich:nhtsa-recalls -- --force`,
    };
  }
  return null;
}

export function isBlankCopy(value: string | undefined | null): boolean {
  return !value || !value.trim();
}
