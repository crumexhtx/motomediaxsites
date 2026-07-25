/**
 * Prune ghost years from catalog.generated.json using model-years.json.
 * When the pinned last year is missing, clone the newest existing year entry
 * and rewrite year-bound copy/alts/highlights so the clone matches the pin.
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

function adaptClone(clone, year, make, model, disc) {
  clone.year = year;
  clone.slug = String(year);
  clone.summary = disc
    ? `${year} ${make.name} ${model.name} — final U.S. catalog year.`
    : `${year} ${make.name} ${model.name}.`;

  if (Array.isArray(clone.images)) {
    for (const img of clone.images) {
      if (!img || typeof img !== "object") continue;
      img.alt = `${year} ${make.name} ${model.name}`;
    }
  }

  if (Array.isArray(clone.highlights)) {
    clone.highlights = clone.highlights.filter((h) => {
      if (typeof h !== "string") return false;
      if (/listed for 20\d{2}/i.test(h)) return false;
      const years = [...h.matchAll(/\b(20\d{2})\b/g)].map((m) => Number(m[1]));
      if (years.some((y) => y !== year && y >= 2024)) return false;
      return true;
    });
  }

  if (typeof clone.description === "string") {
    let description = clone.description
      .replace(/^The .+? ended after \d{4}\.[^.]*\.\s*/i, "")
      .replace(/[^.]*\bcontinues\b[^.]*\./gi, "")
      .replace(/[^.]*listed for 20\d{2}[^.]*\./gi, "")
      // Only rewrite default-window catalog leftovers in "the YYYY Brand" form.
      .replace(/\bthe (202[4-9]|203\d)\b(?=\s+[A-Z])/g, `the ${year}`)
      .replace(/\s{2,}/g, " ")
      .trim();
    const framing = `The ${year} ${make.name} ${model.name} was the final model year covered in this catalog.`;
    clone.description = disc?.message
      ? `${disc.message} ${framing} ${description}`.trim()
      : `${framing} ${description}`.trim();
  }

  if (clone.specs && typeof clone.specs === "object") {
    clone.specs.modelYear = year;
    if (disc) clone.specs.available = false;
  }
}

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
      adaptClone(clone, year, make, model, disc);
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
