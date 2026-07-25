/**
 * Sanitize discontinued / cloned year entries in catalog.generated.json:
 * - Fix image alts to the entry year
 * - Drop highlights that reference other model years (e.g. "Listed for 2026")
 * - Strip contradictory "continues"/wrong-year phrasing from descriptions
 * - Ensure summary reflects the final catalog year when discontinued
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

function rewriteYearTokens(text, year) {
  if (typeof text !== "string" || !text) return text;
  return text.replace(/\b20\d{2}\b/g, String(year));
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
  // Drop leading duplicated discontinued banners if we re-apply.
  if (discMessage && next.startsWith(discMessage)) {
    next = next.slice(discMessage.length).trim();
  }
  // Remove sentences that claim the nameplate continues into a later year.
  next = next
    .replace(/[^.]*\bcontinues\b[^.]*\./gi, "")
    .replace(/[^.]*listed for 20\d{2}[^.]*\./gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  // Soft-rewrite remaining year tokens that clearly disagree with the page year
  // when they appear as "the 2026 …" style catalog leftovers.
  next = next.replace(
    new RegExp(`\\b(?!${year})(202[4-9]|203\\d)\\b`, "g"),
    String(year),
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
          if (img?.alt && /\b20\d{2}\b/.test(img.alt)) {
            const nextAlt = rewriteYearTokens(img.alt, year);
            if (nextAlt !== img.alt) {
              img.alt = nextAlt;
              touched = true;
            }
          } else if (img && !img.alt) {
            img.alt = `${year} ${make.name} ${model.name}`;
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
      } else {
        // Even for active years, keep image alts aligned if they drifted.
        const cleaned = cleanHighlights(yearEntry.highlights, year);
        if (JSON.stringify(cleaned) !== JSON.stringify(yearEntry.highlights)) {
          yearEntry.highlights = cleaned;
          touched = true;
        }
      }

      if (touched) fixed += 1;
    }
  }
}

fs.writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog)}\n`);
console.log(`Sanitized ${fixed} year entries`);
