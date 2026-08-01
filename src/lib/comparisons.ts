/**
 * High-intent model comparison pairs for AI-search / used-buyer queries.
 */
import comparisonsJson from "@/data/comparisons.json";
import { getModel, modelCardImage, yearHref } from "@/lib/catalog";
import {
  formatRetainedPct,
  formatUsd,
  getYearPricing,
  type YearPricing,
} from "@/lib/pricing";
import { estimateOwnershipCost } from "@/lib/ownership";
import type { ModelEntry, TrimSpec, VehicleSpecs } from "@/data/catalog";
import {
  buildSchematicLayout,
  dimensionsFromSpecs,
  formatInches,
  type SchematicLayout,
  type VehicleDimensions,
} from "@/lib/dimensionSchematic";

function newestYear(model: ModelEntry) {
  return [...model.years].sort((a, b) => b.year - a.year)[0];
}

export type ComparisonSideRef = {
  makeSlug: string;
  modelSlug: string;
};

export type ComparisonDef = {
  slug: string;
  a: ComparisonSideRef;
  b: ComparisonSideRef;
  title: string;
  query: string;
  pickA: string;
  pickB: string;
  verdict: string;
};

export type ComparisonMetricRow = {
  label: string;
  a: string;
  b: string;
};

export type ComparisonSide = {
  makeSlug: string;
  modelSlug: string;
  makeName: string;
  modelName: string;
  year: number;
  yearSlug: string;
  href: string;
  modelHref: string;
  tagline: string;
  pricing?: YearPricing;
  recallCount: number;
  complaintTotal: number;
  nhtsaOverall?: string;
  ownershipAnnual?: number;
  imageSrc?: string;
  dims?: VehicleDimensions;
  specs?: VehicleSpecs;
};

export type ComparisonPageData = {
  def: ComparisonDef;
  a: ComparisonSide;
  b: ComparisonSide;
  asOf: string;
  summary: string;
  metrics: ComparisonMetricRow[];
  schematic?: SchematicLayout;
};

const DEFS = comparisonsJson as ComparisonDef[];

export function getAllComparisons(): ComparisonDef[] {
  return DEFS;
}

export function getComparison(slug: string): ComparisonDef | undefined {
  return DEFS.find((c) => c.slug === slug);
}

export function getAllComparisonParams(): Array<{ slug: string }> {
  return DEFS.map((c) => ({ slug: c.slug }));
}

export function comparisonsForModel(
  makeSlug: string,
  modelSlug: string,
): ComparisonDef[] {
  const make = makeSlug.toLowerCase();
  const model = modelSlug.toLowerCase();
  return DEFS.filter(
    (c) =>
      (c.a.makeSlug === make && c.a.modelSlug === model) ||
      (c.b.makeSlug === make && c.b.modelSlug === model),
  );
}

function resolveSide(ref: ComparisonSideRef): ComparisonSide | undefined {
  const found = getModel(ref.makeSlug, ref.modelSlug);
  if (!found) return undefined;
  const { make, model } = found;
  const year = newestYear(model);
  if (!year) return undefined;
  const pricing = getYearPricing(make.slug, model.slug, year.year);
  const defaultTrim: TrimSpec | undefined =
    year.performance?.trims.find((t) => t.id === year.performance?.defaultTrimId) ??
    year.performance?.trims[0];
  const ownership = estimateOwnershipCost({
    mpgCombined: defaultTrim?.mpgCombined ?? year.specs?.mpgCombined,
    rangeMiles: defaultTrim?.rangeMiles ?? year.specs?.rangeMiles,
    batteryKwh: defaultTrim?.batteryKwh ?? year.specs?.batteryKwh,
    fuelTypePrimary: year.specs?.fuelTypePrimary,
    electrificationLevel: year.specs?.electrificationLevel,
    engine: defaultTrim?.engine,
    aspiration: defaultTrim?.aspiration,
  });
  const cover = modelCardImage(make, model);

  return {
    makeSlug: make.slug,
    modelSlug: model.slug,
    makeName: make.name,
    modelName: model.name,
    year: year.year,
    yearSlug: year.slug,
    href: yearHref(make.slug, model.slug, year.slug),
    modelHref: `/makes/${make.slug}/${model.slug}`,
    tagline: model.tagline,
    pricing,
    recallCount: year.recalls?.length ?? 0,
    complaintTotal: year.complaints?.total ?? 0,
    nhtsaOverall: year.specs?.overallRating,
    ownershipAnnual: ownership?.annualUsd,
    imageSrc: cover.src.endsWith(".svg") ? undefined : cover.src,
    dims: dimensionsFromSpecs(year.specs),
    specs: year.specs,
  };
}

function buildSummary(a: ComparisonSide, b: ComparisonSide, def: ComparisonDef): string {
  const aPrice = a.pricing ? formatUsd(a.pricing.usedAverage) : "n/a";
  const bPrice = b.pricing ? formatUsd(b.pricing.usedAverage) : "n/a";
  const text = `${def.query} On our latest snapshot, a used ${a.year} ${a.makeName} ${a.modelName} typically asks about ${aPrice} versus about ${bPrice} for a ${b.year} ${b.makeName} ${b.modelName}. We also compare NHTSA recalls, owner complaints, and estimated annual energy cost using the same formulas as our year pages.`;
  const words = text.split(/\s+/);
  if (words.length <= 80) return text;
  return `${words.slice(0, 78).join(" ")}.`;
}

export function buildComparisonPage(
  slug: string,
): ComparisonPageData | undefined {
  const def = getComparison(slug);
  if (!def) return undefined;
  const a = resolveSide(def.a);
  const b = resolveSide(def.b);
  if (!a || !b) return undefined;

  const asOf =
    a.pricing?.asOf ?? b.pricing?.asOf ?? new Date().toISOString().slice(0, 7);

  const metrics: ComparisonMetricRow[] = [
    {
      label: "Newest catalog year",
      a: String(a.year),
      b: String(b.year),
    },
    {
      label: "Est. used asking",
      a: a.pricing ? formatUsd(a.pricing.usedAverage) : "—",
      b: b.pricing ? formatUsd(b.pricing.usedAverage) : "—",
    },
    {
      label: "Original MSRP",
      a: a.pricing ? formatUsd(a.pricing.msrpBase) : "—",
      b: b.pricing ? formatUsd(b.pricing.msrpBase) : "—",
    },
    {
      label: "Retained vs MSRP",
      a: a.pricing ? formatRetainedPct(a.pricing.retainedPct) : "—",
      b: b.pricing ? formatRetainedPct(b.pricing.retainedPct) : "—",
    },
    {
      label: "NHTSA recalls (newest year)",
      a: String(a.recallCount),
      b: String(b.recallCount),
    },
    {
      label: "Owner complaints",
      a: String(a.complaintTotal),
      b: String(b.complaintTotal),
    },
    {
      label: "NHTSA overall",
      a: a.nhtsaOverall ? `${a.nhtsaOverall}/5` : "—",
      b: b.nhtsaOverall ? `${b.nhtsaOverall}/5` : "—",
    },
    {
      label: "Est. annual energy cost",
      a: a.ownershipAnnual != null ? formatUsd(a.ownershipAnnual) : "—",
      b: b.ownershipAnnual != null ? formatUsd(b.ownershipAnnual) : "—",
    },
    {
      label: "Overall length",
      a: a.dims ? formatInches(a.dims.lengthIn) : "—",
      b: b.dims ? formatInches(b.dims.lengthIn) : "—",
    },
    {
      label: "Overall height",
      a: a.dims ? formatInches(a.dims.heightIn) : "—",
      b: b.dims ? formatInches(b.dims.heightIn) : "—",
    },
    {
      label: "Wheelbase",
      a: a.dims?.wheelbaseIn != null ? formatInches(a.dims.wheelbaseIn) : "—",
      b: b.dims?.wheelbaseIn != null ? formatInches(b.dims.wheelbaseIn) : "—",
    },
  ];

  const schematic =
    a.dims && b.dims
      ? buildSchematicLayout(
          [
            {
              id: "a",
              label: `${a.year} ${a.makeName} ${a.modelName}`,
              dims: a.dims,
            },
            {
              id: "b",
              label: `${b.year} ${b.makeName} ${b.modelName}`,
              dims: b.dims,
            },
          ],
          { showDiffs: true },
        )
      : undefined;

  return {
    def,
    a,
    b,
    asOf,
    summary: buildSummary(a, b, def),
    metrics,
    schematic,
  };
}
