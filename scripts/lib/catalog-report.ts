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

export function isBlankCopy(value: string | undefined | null): boolean {
  return !value || !value.trim();
}
