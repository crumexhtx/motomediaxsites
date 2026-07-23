/**
 * Prune ghost years from catalog.generated.json using model-years.json.
 * When the pinned last year is missing, clone the newest existing year entry.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = path.join(ROOT, "src/data/catalog.generated.json");
const MODEL_YEARS_PATH = path.join(ROOT, "src/data/model-years.json");
const DISCONTINUED_PATH = path.join(ROOT, "src/data/discontinued.json");

const modelYears = JSON.parse(fs.readFileSync(MODEL_YEARS_PATH, "utf8"));
const discontinued = JSON.parse(fs.readFileSync(DISCONTINUED_PATH, "utf8"));
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));

let pruned = 0;
let cloned = 0;

for (const make of catalog) {
  for (const model of make.models) {
    const key = `${make.slug}/${model.slug}`;
    const allowed = modelYears[key];
    if (!allowed?.length) continue;

    const existingByYear = new Map(model.years.map((y) => [y.year, y]));
    const template =
      [...model.years].sort((a, b) => b.year - a.year)[0] ?? null;

    const nextYears = [];
    for (const year of [...allowed].sort((a, b) => a - b)) {
      const existing = existingByYear.get(year);
      if (existing) {
        nextYears.push(existing);
        continue;
      }
      if (!template) continue;
      const disc = discontinued[key];
      const clone = structuredClone(template);
      clone.year = year;
      clone.slug = String(year);
      clone.summary = disc
        ? `${year} ${make.name} ${model.name} — final U.S. catalog year.`
        : `${year} ${make.name} ${model.name}.`;
      if (typeof clone.description === "string" && disc) {
        clone.description = `${disc.message} ${clone.description}`;
      }
      if (clone.specs && typeof clone.specs === "object") {
        clone.specs.modelYear = year;
        clone.specs.available = false;
      }
      nextYears.push(clone);
      cloned += 1;
      console.log(`cloned ${key} → ${year}`);
    }

    const before = model.years.length;
    model.years = nextYears;
    const removed = before - nextYears.length;
    if (removed !== 0) {
      pruned += Math.max(0, removed);
      console.log(
        `updated ${key}: kept [${allowed.join(",")}] (was ${before} years)`,
      );
    }
  }
}

fs.writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog)}\n`);
console.log(
  `done — net year-row change pruned≈${pruned}, cloned ${cloned}`,
);
