/**
 * Validate curated year videos against the catalog.
 *
 * Checks:
 * - Coverage: every catalog model-year should have a video entry
 * - Shape: youtubeId / title / owner present
 * - Live: YouTube oEmbed resolves (video still public)
 * - Relevance: title mentions model (and preferably year / brand)
 *
 * Usage:
 *   node scripts/validate-videos.mjs
 *   node scripts/validate-videos.mjs --brand mazda
 *   SKIP_LIVE=1 node scripts/validate-videos.mjs   # shape/coverage only
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = path.join(ROOT, "src/data/catalog.generated.json");
const VIDEOS_DIR = path.join(ROOT, "src/data/videos");
const SKIP_LIVE = process.env.SKIP_LIVE === "1";

const MODEL_ALIASES = {
  miata: { any: ["miata", "mx-5", "mx5"], none: [] },
  mazda3: { any: ["mazda3", "mazda 3"], none: [] },
  mazda6: { any: ["mazda6", "mazda 6"], none: [] },
  "cx-5": { any: ["cx-5", "cx5"], none: ["cx-50", "cx50"] },
  "cx-30": { any: ["cx-30", "cx30"], none: [] },
  "cx-9": { any: ["cx-9", "cx9"], none: ["cx-90", "cx90"] },
  "cx-90": { any: ["cx-90", "cx90"], none: [] },
  mazdaspeed3: { any: ["mazdaspeed3", "mazdaspeed 3", "speed3"], none: [] },
  "rx-8": { any: ["rx-8", "rx8"], none: [] },
  "model-s": {
    any: ["model s"],
    none: ["model 3", "model y", "model x", "cybertruck"],
  },
  "model-3": {
    any: ["model 3", "model3"],
    none: ["model y", "model s", "model x", "cybertruck"],
  },
  "model-x": {
    any: ["model x"],
    none: ["model 3", "model y", "model s", "cybertruck"],
  },
  "model-y": {
    any: ["model y"],
    none: ["model 3", "model s", "model x", "cybertruck"],
  },
  cybertruck: { any: ["cybertruck"], none: [] },
  roadster: { any: ["roadster"], none: [] },
  "c-class": { any: ["c-class", "c class", "c300"], none: ["e-class", "s-class"] },
  "e-class": { any: ["e-class", "e class", "e350"], none: ["c-class", "s-class"] },
  "s-class": { any: ["s-class", "s class", "s580"], none: ["c-class", "e-class"] },
  "g-class": { any: ["g-class", "g class", "g-wagen", "gwagen", "g550"], none: [] },
  "amg-gt": { any: ["amg gt", "amg-gt"], none: [] },
  "sl-class": { any: ["sl-class", "sl class", "sl55", "sl63"], none: ["slk", "slc"] },
  glc: { any: ["glc"], none: ["gle", "gls"] },
  gle: { any: ["gle"], none: ["glc", "gls"] },
  gls: { any: ["gls"], none: ["glc", "gle"] },
  cla: { any: ["cla"], none: [] },
  eqs: { any: ["eqs"], none: [] },
  "slk-slc": { any: ["slk", "slc"], none: [] },
  jetta: { any: ["jetta"], none: [] },
  golf: { any: ["golf"], none: ["gti", "golf r"] },
  gti: { any: ["gti"], none: ["golf r"] },
  "golf-r": { any: ["golf r", "golf-r"], none: [] },
  passat: { any: ["passat"], none: [] },
  tiguan: { any: ["tiguan"], none: [] },
  touareg: { any: ["touareg"], none: [] },
  atlas: { any: ["atlas"], none: [] },
  beetle: { any: ["beetle"], none: [] },
  "id-4": { any: ["id.4", "id4", "id 4"], none: [] },
  "3-series": {
    any: ["3 series", "3-series", "330i", "330e", "m340"],
    none: [],
  },
  "5-series": { any: ["5 series", "5-series", "530i", "540i"], none: [] },
  "7-series": { any: ["7 series", "7-series", "740i", "760i"], none: [] },
  m2: { any: ["m2"], none: [] },
  m3: { any: ["m3"], none: [] },
  m4: { any: ["m4"], none: [] },
  m5: { any: ["m5"], none: [] },
  x3: { any: ["x3"], none: [] },
  x5: { any: ["x5"], none: [] },
  x7: { any: ["x7"], none: [] },
  z4: { any: ["z4"], none: [] },
  i3: { any: ["i3"], none: [] },
  i8: { any: ["i8"], none: [] },
  i4: { any: ["i4"], none: [] },
  ix: { any: ["ix"], none: [] },
};

const brandFilter = (() => {
  const idx = process.argv.indexOf("--brand");
  return idx >= 0 ? process.argv[idx + 1]?.toLowerCase() : null;
})();

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));

const errors = [];
const warnings = [];

function fail(msg) {
  errors.push(msg);
}
function warn(msg) {
  warnings.push(msg);
}

function titleRelevant(title, brand, modelName, modelSlug, year) {
  const t = title.toLowerCase();
  const aliases = MODEL_ALIASES[modelSlug];
  if (aliases) {
    if (aliases.none?.some((tok) => t.includes(tok.toLowerCase()))) {
      return { ok: false, reason: "negative token" };
    }
    if (aliases.any?.some((tok) => t.includes(tok.toLowerCase()))) {
      const yearOk =
        t.includes(String(year)) ||
        t.includes(String(year - 1)) ||
        t.includes(String(year + 1));
      return {
        ok: true,
        yearOk,
        reason: yearOk ? "alias+year" : "alias, year soft",
      };
    }
  }
  const modelTokens = modelName
    .toLowerCase()
    .replace(/[()]/g, " ")
    .split(/[\s/-]+/)
    .filter((tok) => tok && !["the", "and", "class", "series"].includes(tok));
  const modelOk =
    modelTokens.length === 0
      ? brand.toLowerCase().split(/\s+/)[0] &&
        t.includes(brand.toLowerCase().split(/\s+/)[0])
      : modelTokens.every((tok) => t.includes(tok));
  if (!modelOk) return { ok: false, reason: "model tokens missing" };
  const yearOk =
    t.includes(String(year)) ||
    t.includes(String(year - 1)) ||
    t.includes(String(year + 1));
  return { ok: true, yearOk, reason: yearOk ? "tokens+year" : "tokens, year soft" };
}

async function oembed(youtubeId) {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${youtubeId}`,
  )}&format=json`;
  const res = await fetch(url, {
    headers: { "User-Agent": "MotoMediaXBot/1.0 (video validate)" },
  });
  if (res.status === 404 || res.status === 401) {
    return { ok: false, status: res.status };
  }
  if (!res.ok) {
    return { ok: false, status: res.status, soft: true };
  }
  const data = await res.json();
  return {
    ok: true,
    title: data.title,
    author: data.author_name,
    authorUrl: data.author_url,
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

let checked = 0;
let liveOk = 0;
let liveFail = 0;
let missing = 0;
let irrelevant = 0;

for (const make of catalog) {
  if (brandFilter && make.slug !== brandFilter) continue;
  const videoPath = path.join(VIDEOS_DIR, `${make.slug}.json`);
  if (!fs.existsSync(videoPath)) {
    fail(`${make.slug}: missing videos file`);
    continue;
  }
  const videos = JSON.parse(fs.readFileSync(videoPath, "utf8"));

  for (const model of make.models) {
    for (const yearEntry of model.years) {
      const year = yearEntry.year;
      const slot = videos?.[model.slug]?.[String(year)];
      const key = `${make.slug}/${model.slug}/${year}`;
      if (!slot) {
        fail(`${key}: missing video`);
        missing += 1;
        continue;
      }
      if (!slot.youtubeId || !/^[\w-]{11}$/.test(slot.youtubeId)) {
        fail(`${key}: invalid youtubeId`);
        continue;
      }
      if (!slot.title?.trim()) fail(`${key}: missing title`);
      if (!slot.owner?.trim()) fail(`${key}: missing owner`);

      const rel = titleRelevant(
        slot.title,
        make.name,
        model.name,
        model.slug,
        year,
      );
      if (!rel.ok) {
        fail(`${key}: title not relevant (${rel.reason}): ${slot.title}`);
        irrelevant += 1;
      } else if (!rel.yearOk) {
        warn(`${key}: title year soft-miss: ${slot.title}`);
      }

      if (!SKIP_LIVE) {
        await sleep(80);
        const live = await oembed(slot.youtubeId);
        checked += 1;
        if (!live.ok) {
          if (live.soft) {
            warn(`${key}: oEmbed HTTP ${live.status} (transient?)`);
          } else {
            fail(`${key}: video unavailable (HTTP ${live.status}) id=${slot.youtubeId}`);
            liveFail += 1;
          }
        } else {
          liveOk += 1;
          // Cross-check live title relevance too.
          const liveRel = titleRelevant(
            live.title || "",
            make.name,
            model.name,
            model.slug,
            year,
          );
          if (!liveRel.ok) {
            fail(
              `${key}: live YouTube title not relevant (${liveRel.reason}): ${live.title}`,
            );
            irrelevant += 1;
          }
          // Prefer live metadata when channel URL was a watch link.
          if (live.author && slot.owner !== live.author) {
            // Keep as warning — curated owner may be intentional display name.
            warn(`${key}: owner "${slot.owner}" vs live "${live.author}"`);
          }
        }
      }
    }
  }
}

console.log(
  JSON.stringify(
    {
      missing,
      irrelevant,
      liveOk,
      liveFail,
      checked,
      errors: errors.length,
      warnings: warnings.length,
    },
    null,
    2,
  ),
);

for (const e of errors) console.log(`[error] ${e}`);
for (const w of warnings.slice(0, 40)) console.log(`[warn] ${w}`);
if (warnings.length > 40) {
  console.log(`[warn] … ${warnings.length - 40} more warnings`);
}

if (errors.length > 0) process.exitCode = 1;
