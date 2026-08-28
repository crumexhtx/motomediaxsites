import "server-only";

import { getCatalog } from "@/data/catalog.server";
import { yearHref } from "@/lib/catalog";
import {
  bestCombinedMpg,
  type EfficiencyCandidate,
} from "@/lib/efficiency";
import { enrichYearEntry } from "@/lib/trims";

/** Every catalog year that has a published combined MPG. */
export function getEfficiencyCandidates(): EfficiencyCandidate[] {
  const out: EfficiencyCandidate[] = [];

  for (const make of getCatalog()) {
    for (const model of make.models) {
      for (const raw of model.years) {
        const year = enrichYearEntry(make.slug, model.slug, raw);
        const { mpg, trimName, powertrain } = bestCombinedMpg(year);
        if (mpg == null) continue;
        out.push({
          makeName: make.name,
          makeSlug: make.slug,
          modelName: model.name,
          modelSlug: model.slug,
          year: year.year,
          yearSlug: year.slug,
          href: yearHref(make.slug, model.slug, year.slug),
          mpgCombined: mpg,
          trimName,
          powertrain,
        });
      }
    }
  }

  return out.sort(
    (a, b) =>
      b.mpgCombined - a.mpgCombined ||
      b.year - a.year ||
      a.modelName.localeCompare(b.modelName),
  );
}
