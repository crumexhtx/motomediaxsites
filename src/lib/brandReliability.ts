/**
 * Brand-level reliability rankings from published surveys.
 * Data: src/data/brand-reliability-rankings.json
 *
 * Composite list is limited to makes in our catalog and averages ordinal ranks
 * from Consumer Reports (predicted score) and J.D. Power VDS (PP100) only —
 * never invent scores.
 */
import rankings from "@/data/brand-reliability-rankings.json";
import { getAllMakes } from "@/lib/catalog";

export type BrandRankingSource = {
  id: string;
  label: string;
  url: string;
  published: string | null;
};

export type CatalogBrandReliabilityRow = {
  rank: number;
  brand: string;
  makeSlug: string;
  href: string;
  /** Consumer Reports predicted reliability score (higher better), if listed. */
  crScore: number | null;
  crRank: number | null;
  /** J.D. Power VDS PP100 (lower better), if listed. */
  jdPp100: number | null;
  jdRank: number | null;
  /** CarGurus 2025 top-10 rank, if listed. */
  cargurusRank: number | null;
  /** Average of available CR + JD ordinal ranks among catalog brands. */
  averageRank: number;
};

type RankedBrand = {
  rank: number | null;
  brand: string;
  makeSlug: string | null;
  score?: number;
  pp100?: number;
  isBenchmark?: boolean;
  note?: string;
};

const DATA = rankings as {
  asOf: string;
  notes: string[];
  sources: BrandRankingSource[];
  cargurusTop10: RankedBrand[];
  consumerReportsPredicted: RankedBrand[];
  jdPowerVds2026: RankedBrand[];
};

export function getBrandReliabilityMeta() {
  return {
    asOf: DATA.asOf,
    notes: DATA.notes,
    sources: DATA.sources,
  };
}

export function getCargurusTop10() {
  return DATA.cargurusTop10;
}

export function getConsumerReportsPredicted() {
  return DATA.consumerReportsPredicted;
}

export function getJdPowerVds2026() {
  return DATA.jdPowerVds2026.filter((r) => !r.isBenchmark);
}

/**
 * Most → least reliable among MotoMediaX catalog makes, using the average of
 * CR and J.D. Power ordinal ranks when both exist (else the single available rank).
 */
export function getCatalogBrandReliabilityRanking(): CatalogBrandReliabilityRow[] {
  const makes = getAllMakes();
  const makeBySlug = new Map(makes.map((m) => [m.slug, m]));

  const crBySlug = new Map<string, RankedBrand>();
  for (const row of DATA.consumerReportsPredicted) {
    if (row.makeSlug) crBySlug.set(row.makeSlug, row);
  }

  const jdOfficial = DATA.jdPowerVds2026.filter(
    (r) => !r.isBenchmark && r.rank != null && r.makeSlug,
  );
  const jdBySlug = new Map<string, RankedBrand>();
  for (const row of jdOfficial) {
    if (row.makeSlug) jdBySlug.set(row.makeSlug, row);
  }
  // Tesla appears off-ranking with a PP100 — include for catalog completeness.
  const teslaJd = DATA.jdPowerVds2026.find((r) => r.makeSlug === "tesla");
  if (teslaJd?.makeSlug && !jdBySlug.has("tesla")) {
    jdBySlug.set("tesla", teslaJd);
  }

  const cgBySlug = new Map<string, RankedBrand>();
  for (const row of DATA.cargurusTop10) {
    if (row.makeSlug) cgBySlug.set(row.makeSlug, row);
  }

  // Ordinal ranks among catalog brands only (for fair averaging).
  const catalogSlugs = makes.map((m) => m.slug);

  const crCatalog = catalogSlugs
    .map((slug) => crBySlug.get(slug))
    .filter((r): r is RankedBrand => Boolean(r?.score != null))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const crOrdinal = new Map(
    crCatalog.map((r, i) => [r.makeSlug as string, i + 1]),
  );

  const jdCatalog = catalogSlugs
    .map((slug) => jdBySlug.get(slug))
    .filter((r): r is RankedBrand => Boolean(r?.pp100 != null))
    .sort((a, b) => (a.pp100 ?? 0) - (b.pp100 ?? 0));
  const jdOrdinal = new Map(
    jdCatalog.map((r, i) => [r.makeSlug as string, i + 1]),
  );

  const rows: CatalogBrandReliabilityRow[] = [];

  for (const make of makes) {
    const cr = crBySlug.get(make.slug);
    const jd = jdBySlug.get(make.slug);
    const cg = cgBySlug.get(make.slug);
    const crOrd = crOrdinal.get(make.slug) ?? null;
    const jdOrd = jdOrdinal.get(make.slug) ?? null;

    const parts: number[] = [];
    if (crOrd != null) parts.push(crOrd);
    if (jdOrd != null) parts.push(jdOrd);
    if (parts.length === 0) continue;

    const averageRank = parts.reduce((a, b) => a + b, 0) / parts.length;

    rows.push({
      rank: 0,
      brand: make.name,
      makeSlug: make.slug,
      href: `/makes/${make.slug}`,
      crScore: cr?.score ?? null,
      crRank: cr?.rank ?? null,
      jdPp100: jd?.pp100 ?? null,
      jdRank: jd?.rank ?? null,
      cargurusRank: cg?.rank ?? null,
      averageRank,
    });
  }

  rows.sort(
    (a, b) =>
      a.averageRank - b.averageRank ||
      a.brand.localeCompare(b.brand),
  );

  return rows.map((row, i) => ({ ...row, rank: i + 1 }));
}
