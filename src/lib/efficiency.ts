import type { GalleryImage, YearEntry } from "@/data/catalog";
import { resolvePowertrainKind, type OwnershipKind } from "@/lib/ownership";

export type EfficiencyCandidate = {
  makeName: string;
  makeSlug: string;
  modelName: string;
  modelSlug: string;
  year: number;
  yearSlug: string;
  href: string;
  mpgCombined: number;
  trimName: string | null;
  powertrain: OwnershipKind | null;
  image: GalleryImage;
};

export type EfficiencyMpgBounds = {
  min: number;
  max: number;
};

export type EfficiencyGroupId = "hybrid" | "phev" | "ev" | "gas";

export type EfficiencyGroup = {
  id: EfficiencyGroupId;
  title: string;
  lead: string;
  items: EfficiencyCandidate[];
};

/** Default slider start — useful “efficient enough” without only showing hybrids. */
export const DEFAULT_MIN_MPG = 30;

const GROUP_META: Array<{
  id: EfficiencyGroupId;
  title: string;
  lead: string;
}> = [
  {
    id: "hybrid",
    title: "Hybrids",
    lead: "Gas-electric hybrids — combined MPG from catalog specs.",
  },
  {
    id: "phev",
    title: "Plug-in hybrids",
    lead: "PHEV gas-combined estimates; electric-only range is not modeled here.",
  },
  {
    id: "ev",
    title: "Battery electric",
    lead: "BEVs when the catalog lists combined MPGe (not mi/kWh).",
  },
  {
    id: "gas",
    title: "Gas",
    lead: "Conventional gas powertrains that still clear your MPG floor.",
  },
];

/**
 * Best published combined MPG for a year (year specs or any trim).
 * Returns the trim name when a trim row wins.
 */
export function bestCombinedMpg(year: YearEntry): {
  mpg: number | null;
  trimName: string | null;
  powertrain: OwnershipKind | null;
} {
  let mpg: number | null = null;
  let trimName: string | null = null;
  let winnerTrim =
    year.performance?.trims.find((t) => t.id === year.performance?.defaultTrimId) ??
    year.performance?.trims[0];

  const specMpg = year.specs?.mpgCombined;
  if (specMpg != null && specMpg > 0) {
    mpg = specMpg;
  }

  for (const trim of year.performance?.trims ?? []) {
    if (trim.mpgCombined == null || !(trim.mpgCombined > 0)) continue;
    if (mpg == null || trim.mpgCombined > mpg) {
      mpg = trim.mpgCombined;
      trimName = trim.name;
      winnerTrim = trim;
    }
  }

  if (mpg == null) {
    return { mpg: null, trimName: null, powertrain: null };
  }

  const powertrain = resolvePowertrainKind({
    mpgCombined: mpg,
    rangeMiles: winnerTrim?.rangeMiles ?? year.specs?.rangeMiles,
    batteryKwh: winnerTrim?.batteryKwh ?? year.specs?.batteryKwh,
    fuelTypePrimary: year.specs?.fuelTypePrimary,
    electrificationLevel: year.specs?.electrificationLevel,
    engine: winnerTrim?.engine,
    aspiration: winnerTrim?.aspiration,
  });

  return { mpg, trimName, powertrain };
}

export function efficiencyMpgBounds(
  candidates: EfficiencyCandidate[],
): EfficiencyMpgBounds {
  if (!candidates.length) return { min: 15, max: 60 };
  let min = candidates[0].mpgCombined;
  let max = candidates[0].mpgCombined;
  for (const c of candidates) {
    if (c.mpgCombined < min) min = c.mpgCombined;
    if (c.mpgCombined > max) max = c.mpgCombined;
  }
  return {
    min: Math.max(10, Math.floor(min)),
    max: Math.ceil(max),
  };
}

/**
 * Models whose newest year (among those meeting the bar) clears `minMpg`.
 * Sorted by combined MPG descending.
 */
export function filterModelsByMinMpg(
  candidates: EfficiencyCandidate[],
  minMpg: number,
): EfficiencyCandidate[] {
  const threshold = Number.isFinite(minMpg) ? minMpg : 0;
  const newestByModel = new Map<string, EfficiencyCandidate>();

  for (const c of candidates) {
    if (c.mpgCombined < threshold) continue;
    const key = `${c.makeSlug}/${c.modelSlug}`;
    const prev = newestByModel.get(key);
    if (!prev || c.year > prev.year) {
      newestByModel.set(key, c);
    }
  }

  return [...newestByModel.values()].sort(
    (a, b) =>
      b.mpgCombined - a.mpgCombined ||
      a.makeName.localeCompare(b.makeName) ||
      a.modelName.localeCompare(b.modelName),
  );
}

/** Bucket filtered models into hybrid / PHEV / EV / gas (empty groups omitted). */
export function groupEfficiencyResults(
  results: EfficiencyCandidate[],
): EfficiencyGroup[] {
  const buckets: Record<EfficiencyGroupId, EfficiencyCandidate[]> = {
    hybrid: [],
    phev: [],
    ev: [],
    gas: [],
  };

  for (const item of results) {
    const id: EfficiencyGroupId =
      item.powertrain === "hybrid" ||
      item.powertrain === "phev" ||
      item.powertrain === "ev"
        ? item.powertrain
        : "gas";
    buckets[id].push(item);
  }

  return GROUP_META.filter((meta) => buckets[meta.id].length > 0).map(
    (meta) => ({
      ...meta,
      items: buckets[meta.id],
    }),
  );
}

export function clampMinMpg(
  value: number,
  bounds: EfficiencyMpgBounds,
): number {
  if (!Number.isFinite(value)) return DEFAULT_MIN_MPG;
  return Math.min(bounds.max, Math.max(bounds.min, Math.round(value)));
}
