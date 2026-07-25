/**
 * Sanitize discontinued / cloned year entries in catalog.generated.json:
 * - Fix image alts to the entry year
 * - Drop highlights that reference other model years (e.g. "Listed for 2026")
 * - Strip contradictory "continues"/listed-for phrasing from descriptions
 * - Ensure summary reflects the final catalog year when discontinued
 *
 * Does NOT rewrite historical year tokens inside Wikipedia extracts. Blind
 * year rewriting caused corruption like "from 2020 until 2020". Prefer
 * `pnpm refresh:discontinued` for overview regeneration.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = path.join(ROOT, "src/data/catalog.generated.json");
const DISCONTINUED_PATH = path.join(ROOT, "src/data/discontinued.json");

const discontinued = JSON.parse(fs.readFileSync(DISCONTINUED_PATH, "utf8"));
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));

let fixed = 0;

function rewriteAltYear(text, year, makeName, modelName) {
  if (typeof text !== "string" || !text) {
    return `${year} ${makeName} ${modelName}`;
  }
  // Prefer a clean canonical alt rather than rewriting arbitrary years in prose.
  if (/\b20\d{2}\b/.test(text) || text.length < 8) {
    return `${year} ${makeName} ${modelName}`;
  }
  return text;
}

function cleanHighlights(highlights, year) {
  if (!Array.isArray(highlights)) return highlights;
  return highlights.filter((h) => {
    if (typeof h !== "string") return false;
    const lower = h.toLowerCase();
    if (/listed for 20\d{2}/.test(lower)) return false;
    const years = [...h.matchAll(/\b(20\d{2})\b/g)].map((m) => Number(m[1]));
    if (years.some((y) => y !== year && y >= 2024)) return false;
    return true;
  });
}

function cleanDescription(description, year, discMessage) {
  if (typeof description !== "string" || !description) {
    return discMessage ?? description;
  }
  let next = description;
  if (discMessage && next.startsWith(discMessage)) {
    next = next.slice(discMessage.length).trim();
  }
  next = next
    .replace(/[^.]*\bcontinues\b[^.]*\./gi, "")
    .replace(/[^.]*listed for 20\d{2}[^.]*\./gi, "")
    // Fix only obvious same-year clone corruption, leave real history alone.
    .replace(/\bfrom (20\d{2}) until \1\b/gi, `through $1`)
    .replace(/\bproduced for the (20\d{2})[–-](\1)\b/gi, `produced for the $1`)
    .replace(/\s{2,}/g, " ")
    .trim();

  // Soft-fix only "the YYYY Brand" when YYYY is a default catalog year
  // that disagrees with this page year (clone leftover), not all year tokens.
  next = next.replace(
    new RegExp(
      `\\bthe (?!${year})(202[4-9]|203\\d)\\b(?=\\s+[A-Z])`,
      "g",
    ),
    `the ${year}`,
  );

  if (discMessage) {
    next = `${discMessage} ${next}`.trim();
  }
  return next;
}

for (const make of catalog) {
  for (const model of make.models) {
    const key = `${make.slug}/${model.slug}`;
    const disc = discontinued[key];
    for (const yearEntry of model.years) {
      const year = yearEntry.year;
      let touched = false;

      if (Array.isArray(yearEntry.images)) {
        for (const img of yearEntry.images) {
          if (!img || typeof img !== "object") continue;
          const nextAlt = rewriteAltYear(
            img.alt,
            year,
            make.name,
            model.name,
          );
          if (nextAlt !== img.alt) {
            img.alt = nextAlt;
            touched = true;
          }
        }
      }

      const beforeHighlights = JSON.stringify(yearEntry.highlights ?? null);
      yearEntry.highlights = cleanHighlights(yearEntry.highlights, year);
      if (JSON.stringify(yearEntry.highlights ?? null) !== beforeHighlights) {
        touched = true;
      }

      if (disc && disc.banner !== false && year === disc.lastYear) {
        const summary = `${year} ${make.name} ${model.name} — final U.S. catalog year.`;
        if (yearEntry.summary !== summary) {
          yearEntry.summary = summary;
          touched = true;
        }
        const nextDesc = cleanDescription(
          yearEntry.description,
          year,
          disc.message,
        );
        if (nextDesc !== yearEntry.description) {
          yearEntry.description = nextDesc;
          touched = true;
        }
        if (yearEntry.specs && typeof yearEntry.specs === "object") {
          if (yearEntry.specs.modelYear !== year) {
            yearEntry.specs.modelYear = year;
            touched = true;
          }
          if (yearEntry.specs.available !== false) {
            yearEntry.specs.available = false;
            touched = true;
          }
        }
        const highlights = cleanHighlights(yearEntry.highlights, year) ?? [];
        if (!highlights.some((h) => /final u\.?s\.?/i.test(h))) {
          yearEntry.highlights = ["Final U.S. catalog year", ...highlights].slice(
            0,
            8,
          );
          touched = true;
        }
      }

      if (touched) fixed += 1;
    }
  }
}

fs.writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog)}\n`);
console.log(`Sanitized ${fixed} year entries`);
