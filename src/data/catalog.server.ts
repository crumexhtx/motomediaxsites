import "server-only";

import fs from "node:fs";
import path from "node:path";
import type { MakeEntry } from "@/data/catalog";

const catalogPath = path.join(
  process.cwd(),
  "src/data/catalog.generated.json",
);

type CatalogCache = { mtimeMs: number; data: MakeEntry[] };

declare global {
  var __motomediaxCatalogCache: CatalogCache | undefined;
}

/**
 * Server-only: read catalog from disk (mtime-cached) so route lookups always
 * match the latest `pnpm build:catalog` output without a stale Turbopack bundle.
 */
export function getCatalog(): MakeEntry[] {
  const stat = fs.statSync(catalogPath);
  const cached = globalThis.__motomediaxCatalogCache;
  if (cached && cached.mtimeMs === stat.mtimeMs) {
    return cached.data;
  }
  const data = JSON.parse(fs.readFileSync(catalogPath, "utf8")) as MakeEntry[];
  globalThis.__motomediaxCatalogCache = { mtimeMs: stat.mtimeMs, data };
  return data;
}

/** Catalog file mtime — use for sitemap lastModified instead of Date.now(). */
export function getCatalogMtime(): Date {
  return new Date(fs.statSync(catalogPath).mtimeMs);
}

/** True when a site-relative `/…` asset exists under `public/`. Remotes always pass. */
export function publicAssetExists(src: string | undefined | null): boolean {
  if (!src) return false;
  if (/^https?:\/\//i.test(src)) return true;
  if (!src.startsWith("/")) return false;
  try {
    const abs = path.join(process.cwd(), "public", src.replace(/^\//, ""));
    if (!fs.existsSync(abs)) return false;
    const size = fs.statSync(abs).size;
    if (src.endsWith(".svg")) return size > 0;
    return size > 500;
  } catch {
    return false;
  }
}
