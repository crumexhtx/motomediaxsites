/**
 * Repair catalog copy issues in place:
 * - Make blurbs truncated mid-sentence → sentence boundary
 * - Thin year summaries ("offered in the U.S. market") → enriched from description
 *
 * Usage: node scripts/repair-catalog-copy.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  enrichYearSummary,
  looksTruncatedMidSentence,
  truncateAtSentence,
} from "../src/lib/text.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = path.join(ROOT, "src/data/catalog.generated.json");
const DISCONTINUED_PATH = path.join(ROOT, "src/data/discontinued.json");

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
const discontinued = JSON.parse(fs.readFileSync(DISCONTINUED_PATH, "utf8"));

let blurbsFixed = 0;
let summariesFixed = 0;

for (const make of catalog) {
  const nextBlurb = truncateAtSentence(make.blurb || "", 400);
  if (nextBlurb && nextBlurb !== make.blurb) {
    make.blurb = nextBlurb;
    blurbsFixed += 1;
  } else if (looksTruncatedMidSentence(make.blurb || "")) {
    make.blurb = truncateAtSentence(make.blurb, 400);
    blurbsFixed += 1;
  }

  for (const model of make.models) {
    const key = `${make.slug}/${model.slug}`;
    const disc = discontinued[key];
    for (const year of model.years) {
      if (disc && disc.banner !== false && year.year === disc.lastYear) {
        const finalSummary = `${year.year} ${make.name} ${model.name} — final U.S. catalog year.`;
        if (year.summary !== finalSummary) {
          year.summary = finalSummary;
          summariesFixed += 1;
        }
        continue;
      }
      const next = enrichYearSummary({
        year: year.year,
        makeName: make.name,
        modelName: model.name,
        summary: year.summary,
        description: year.description,
      });
      if (next && next !== year.summary) {
        year.summary = next;
        summariesFixed += 1;
      }
    }
  }
}

fs.writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog)}\n`);
console.log(
  `Repaired catalog copy: ${blurbsFixed} blurbs, ${summariesFixed} year summaries`,
);
