/**
 * Refresh overview copy for discontinued last-year catalog entries.
 *
 * Rebuilds summary / description / highlights with final-year framing and a
 * fresh Wikipedia extract (when available). Does NOT rewrite historical years
 * inside wiki text — that corruption was the root of "from 2020 until 2020".
 *
 * Usage: node scripts/refresh-discontinued-content.mjs
 * Offline: OFFLINE=1 skips network and only rewrites framing from existing copy.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = path.join(ROOT, "src/data/catalog.generated.json");
const DISCONTINUED_PATH = path.join(ROOT, "src/data/discontinued.json");
const CACHE_DIR = path.join(ROOT, "scripts/.cache");
const OFFLINE = process.env.OFFLINE === "1";
const USER_AGENT =
  "MotoMediaXBot/1.0 (catalog refresh; https://www.motomediax.com/)";

/** Prefer specific article titles when the bare name is ambiguous or wrong. */
const WIKI_TITLE_OVERRIDES = {
  "ford/fusion": ["Ford Fusion (Americas)", "Ford Fusion"],
  "bmw/i3": ["BMW i3 (hatchback)", "BMW i3"],
  "bmw/i8": ["BMW i8"],
  "chevrolet/bolt-ev": ["Chevrolet Bolt EV", "Chevrolet Bolt"],
  "hyundai/genesis": ["Hyundai Genesis"],
  "kia/optima": ["Kia Optima", "Kia K5"],
  "mercedes-benz/slk-slc": [
    "Mercedes-Benz SLK-Class",
    "Mercedes-Benz SLC-Class",
  ],
  "mazda/mazda6": ["Mazda6", "Mazda 6"],
  "mazda/mazdaspeed3": ["Mazdaspeed3", "Mazda3"],
  "tesla/roadster": ["Tesla Roadster", "Tesla Roadster (first generation)"],
  "volkswagen/beetle": ["Volkswagen Beetle", "Volkswagen New Beetle"],
  "ford/gt": ["Ford GT"],
};

const discontinued = JSON.parse(fs.readFileSync(DISCONTINUED_PATH, "utf8"));
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function cachePath(key) {
  const safe = key.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 180);
  return path.join(CACHE_DIR, `wiki-refresh-${safe}.json`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function looksLikeDisambiguation(summary) {
  if (!summary) return true;
  if (summary.type === "disambiguation" || summary.type === "missing") {
    return true;
  }
  const extract = (summary.extract || "").trim();
  const lower = extract.toLowerCase();
  if (
    lower.startsWith("may refer to") ||
    lower.includes(" may refer to:") ||
    /\bmay refer to\b/.test(lower.slice(0, 80))
  ) {
    return true;
  }
  // Nameplate / list pages: short lead then several "Brand Model (" entries.
  if (
    /nameplate/i.test(extract.slice(0, 120)) &&
    (extract.match(/\b[A-Z][A-Za-z0-9-]+ \([^)]{3,40}\)/g) || []).length >= 2
  ) {
    return true;
  }
  return false;
}

async function fetchWikiSummary(title) {
  const file = cachePath(title);
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  }
  if (OFFLINE) return null;

  const encoded = encodeURIComponent(title.replace(/ /g, "_"));
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
  await sleep(120);
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (res.status === 404) {
    const missing = { title, extract: "", type: "missing" };
    ensureDir(CACHE_DIR);
    fs.writeFileSync(file, JSON.stringify(missing));
    return missing;
  }
  if (!res.ok) {
    console.warn(`  wiki HTTP ${res.status} for ${title}`);
    return null;
  }
  const data = await res.json();
  ensureDir(CACHE_DIR);
  fs.writeFileSync(file, JSON.stringify(data));
  return data;
}

function titleCandidates(makeName, modelName, key) {
  const overrides = WIKI_TITLE_OVERRIDES[key] ?? [];
  const cleaned = modelName.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  return [
    ...overrides,
    `${makeName} ${cleaned}`,
    `${makeName} ${modelName}`,
    cleaned,
  ].filter((v, i, arr) => v && arr.indexOf(v) === i);
}

async function resolveExtract(makeName, modelName, key) {
  for (const title of titleCandidates(makeName, modelName, key)) {
    const summary = await fetchWikiSummary(title);
    if (!summary || looksLikeDisambiguation(summary)) continue;
    const extract = (summary.extract || "").trim();
    if (!extract || extract.length < 40) continue;
    return {
      extract,
      pageUrl: summary.content_urls?.desktop?.page,
    };
  }
  return null;
}

/** Drop clone/banner leftovers; keep historical years intact. */
function stripCloneArtifacts(text) {
  if (typeof text !== "string" || !text) return "";
  return text
    .replace(/^The .+? ended after \d{4}\.[^.]*\.\s*/i, "")
    .replace(/^There was no \d{4}[^.]*\.\s*/i, "")
    .replace(/[^.]*\bcontinues\b[^.]*\./gi, "")
    .replace(/[^.]*listed for 20\d{2}[^.]*\./gi, "")
    .replace(
      /Detailed \d{4} NHTSA crash ratings were not found for this nameplate\./gi,
      "",
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

function firstSentences(text, maxChars = 520) {
  if (!text) return "";
  const parts = text.split(/(?<=\.)\s+/).filter(Boolean);
  let out = "";
  for (const part of parts) {
    const next = out ? `${out} ${part}` : part;
    if (next.length > maxChars && out) break;
    out = next;
    if (out.length >= Math.min(280, maxChars)) break;
  }
  return out.trim();
}

function specSentences(year, specs) {
  if (!specs || typeof specs !== "object") return [];
  const out = [];
  if (specs.overallRating) {
    out.push(
      `NHTSA safety ratings for a representative ${year} configuration${
        specs.vehicleDescription ? ` (${specs.vehicleDescription})` : ""
      } include an overall score of ${specs.overallRating}/5${
        specs.frontCrashRating ? `, front crash ${specs.frontCrashRating}/5` : ""
      }${specs.sideCrashRating ? `, side crash ${specs.sideCrashRating}/5` : ""}${
        specs.rolloverRating ? `, and rollover ${specs.rolloverRating}/5` : ""
      }.`,
    );
  }
  if (specs.overallLengthIn || specs.wheelbaseIn || specs.curbWeightLb) {
    out.push(
      `Published ${year} dimensions include${
        specs.overallLengthIn ? ` overall length ${specs.overallLengthIn} in` : ""
      }${specs.overallWidthIn ? `, width ${specs.overallWidthIn} in` : ""}${
        specs.overallHeightIn ? `, height ${specs.overallHeightIn} in` : ""
      }${specs.wheelbaseIn ? `, and wheelbase ${specs.wheelbaseIn} in` : ""}${
        specs.curbWeightLb
          ? `, with curb weight around ${specs.curbWeightLb} lb`
          : ""
      }.`,
    );
  }
  if (specs.mpgCombined) {
    out.push(
      `EPA fuel economy for a representative ${year} configuration is about ${
        specs.mpgCity != null ? `${specs.mpgCity} city / ` : ""
      }${specs.mpgHighway != null ? `${specs.mpgHighway} highway / ` : ""}${
        specs.mpgCombined
      } combined mpg${
        specs.electrificationLevel
          ? ` (${String(specs.electrificationLevel).toLowerCase()})`
          : ""
      }.`,
    );
  } else if (specs.rangeMiles) {
    out.push(
      `EPA lists an estimated driving range around ${specs.rangeMiles} miles for a representative ${year} configuration.`,
    );
  }
  return out;
}

function buildHighlights(year, specs, existing) {
  const highlights = ["Final U.S. catalog year"];
  const keep = Array.isArray(existing)
    ? existing.filter((h) => {
        if (typeof h !== "string") return false;
        const lower = h.toLowerCase();
        if (/final u\.?s\.? (catalog|model) year/i.test(lower)) return false;
        if (/listed for 20\d{2}/i.test(lower)) return false;
        if (/\bcontinues\b/i.test(lower)) return false;
        const years = [...h.matchAll(/\b(20\d{2})\b/g)].map((m) => Number(m[1]));
        if (years.some((y) => y !== year && y >= 2024)) return false;
        return true;
      })
    : [];
  for (const h of keep) {
    if (!highlights.includes(h)) highlights.push(h);
  }
  if (specs?.overallRating) {
    highlights.push(`NHTSA overall safety ${specs.overallRating}/5`);
  }
  if (specs?.mpgCombined) {
    highlights.push(`EPA combined ${specs.mpgCombined} mpg`);
  } else if (specs?.rangeMiles) {
    highlights.push(`EPA range about ${specs.rangeMiles} mi`);
  }
  if (specs?.wheelbaseIn) {
    highlights.push(`Wheelbase ${specs.wheelbaseIn} in`);
  }
  return [...new Set(highlights)].slice(0, 8);
}

function buildDescription({
  year,
  makeName,
  modelName,
  message,
  wikiExtract,
  priorDescription,
  specs,
}) {
  const framing = `The ${year} ${makeName} ${modelName} was the final model year covered in this catalog.`;
  const wiki = firstSentences(wikiExtract || "", 520);
  const fallback = firstSentences(stripCloneArtifacts(priorDescription), 420);
  const body = wiki || fallback || "";
  const specsText = specSentences(year, specs).join(" ");
  return [message, framing, body, specsText]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

let refreshed = 0;
let wikiHits = 0;
let wikiMisses = 0;

for (const make of catalog) {
  for (const model of make.models) {
    const key = `${make.slug}/${model.slug}`;
    const disc = discontinued[key];
    if (!disc || disc.banner === false) continue;

    const yearEntry = model.years.find((y) => y.year === disc.lastYear);
    if (!yearEntry) {
      console.warn(`  missing last year ${disc.lastYear} for ${key}`);
      continue;
    }

    const year = disc.lastYear;
    const wiki = await resolveExtract(make.name, model.name, key);
    if (wiki?.extract) wikiHits += 1;
    else wikiMisses += 1;

    const summary = `${year} ${make.name} ${model.name} — final U.S. catalog year.`;
    const description = buildDescription({
      year,
      makeName: make.name,
      modelName: model.name,
      message: disc.message,
      wikiExtract: wiki?.extract,
      priorDescription: yearEntry.description,
      specs: yearEntry.specs,
    });
    const highlights = buildHighlights(year, yearEntry.specs, yearEntry.highlights);

    yearEntry.summary = summary;
    yearEntry.description = description;
    yearEntry.highlights = highlights;

    if (Array.isArray(yearEntry.images)) {
      for (const img of yearEntry.images) {
        if (img && typeof img === "object") {
          img.alt = `${year} ${make.name} ${model.name}`;
        }
      }
    }

    if (yearEntry.specs && typeof yearEntry.specs === "object") {
      yearEntry.specs.modelYear = year;
      yearEntry.specs.available = false;
    }

    if (wiki?.pageUrl) {
      yearEntry.sources = {
        ...(yearEntry.sources || {}),
        wikipedia: wiki.pageUrl,
      };
      model.sources = {
        ...(model.sources || {}),
        wikipedia: wiki.pageUrl,
      };
    }

    refreshed += 1;
    process.stdout.write(`  ✓ ${key} (${year})${wiki?.extract ? "" : " [no wiki]"}\n`);
  }
}

fs.writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog)}\n`);
console.log(
  `Refreshed ${refreshed} discontinued last-year entries (wiki hits ${wikiHits}, misses ${wikiMisses}${OFFLINE ? ", offline" : ""})`,
);
