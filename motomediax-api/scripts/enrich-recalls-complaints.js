#!/usr/bin/env node
/**
 * Fetch NHTSA recalls + owner-complaint summaries for every make/model/year
 * in data/catalog.json and write data/recalls-complaints.json, keyed by
 * `{makeSlug}/{modelSlug}/{year}`.
 *
 * APIs (no key required):
 *   https://api.nhtsa.gov/recalls/recallsByVehicle?make=&model=&modelYear=
 *   https://api.nhtsa.gov/complaints/complaintsByVehicle?make=&model=&modelYear=
 *
 * Rate limiting: NHTSA does not publish a documented rate limit for these
 * endpoints. We serialize requests (no concurrency) with a delay between
 * every call as a conservative default — see --delay-ms below.
 *
 * The three possible outcomes per vehicle per data source are tracked
 * separately and never conflated:
 *   - ok:    the request succeeded and returned one or more records
 *   - empty: the request succeeded and confirmed zero records
 *   - error: the request itself failed (network error, non-2xx, bad body) —
 *            this is NOT the same as "zero recalls" and must never be
 *            reported as such
 *
 * Usage:
 *   node scripts/enrich-recalls-complaints.js
 *   node scripts/enrich-recalls-complaints.js --brand ford
 *   node scripts/enrich-recalls-complaints.js --brand ford --model mustang-mach-e
 *   node scripts/enrich-recalls-complaints.js --limit 10 --dry-run
 *   node scripts/enrich-recalls-complaints.js --force          # refetch everything
 *   node scripts/enrich-recalls-complaints.js --delay-ms 400   # slower, gentler
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const CATALOG_PATH = path.join(ROOT, "data", "catalog.json");
const OUT_PATH = path.join(ROOT, "data", "recalls-complaints.json");

const RECALLS_URL = "https://api.nhtsa.gov/recalls/recallsByVehicle";
const COMPLAINTS_URL = "https://api.nhtsa.gov/complaints/complaintsByVehicle";
const USER_AGENT =
  "MotoMediaXApiBot/1.0 (recall+complaint enrichment; https://www.motomediax.com/)";

function argFlag(name) {
  return process.argv.includes(name);
}

function argValue(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * NHTSA's recalls/complaints APIs return US-format MM/DD/YYYY date strings
 * (e.g. "06/30/2026" for June 30, 2026). Convert to ISO YYYY-MM-DD. Falls
 * back to passing through anything already ISO-shaped or unparseable.
 */
function parseDate(raw) {
  if (!raw || typeof raw !== "string") return "";
  const trimmed = raw.trim();
  const mdy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, mm, dd, yyyy] = mdy;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  return trimmed.slice(0, 32);
}

function normalizeComponent(raw) {
  const first = String(raw ?? "").split(",")[0]?.trim() || String(raw ?? "").trim();
  const top = first.split(":")[0]?.trim() || first;
  if (!top) return "Unspecified";
  return top
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bAnd\b/g, "and");
}

function truncateSummary(text, max = 320) {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const boundary = cut.lastIndexOf(" ");
  return `${(boundary > 80 ? cut.slice(0, boundary) : cut).trim()}…`;
}

async function fetchJson(url, delayMs) {
  await sleep(delayMs);
  let res;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
  } catch (err) {
    return { ok: false, error: `network error: ${err.message}` };
  }
  let text;
  try {
    text = await res.text();
  } catch (err) {
    return { ok: false, error: `body read error: ${err.message}` };
  }
  if (!res.ok) {
    return { ok: false, error: `HTTP ${res.status}` };
  }
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "invalid JSON response" };
  }
  return { ok: true, json };
}

function resultsOf(json) {
  if (!json || typeof json !== "object") return [];
  const rows = json.results ?? json.Results;
  return Array.isArray(rows) ? rows : [];
}

/** @returns {{ available: boolean, recalls: object[], error: string|null }} */
async function fetchRecalls(make, model, year, delayMs) {
  const url = `${RECALLS_URL}?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${year}`;
  const res = await fetchJson(url, delayMs);
  if (!res.ok) {
    return { available: false, recalls: [], error: res.error };
  }

  const seen = new Set();
  const recalls = [];
  for (const row of resultsOf(res.json)) {
    const campaignNumber = String(row.NHTSACampaignNumber ?? "").trim();
    const component = String(row.Component ?? "").trim();
    const summary = String(row.Summary ?? "").trim();
    const date = parseDate(row.ReportReceivedDate);
    if (!campaignNumber || seen.has(campaignNumber)) continue;
    seen.add(campaignNumber);
    recalls.push({
      campaignNumber,
      date,
      component: normalizeComponent(component),
      summary: truncateSummary(summary),
    });
  }
  recalls.sort((a, b) => b.date.localeCompare(a.date));
  return { available: true, recalls, error: null };
}

/** @returns {{ available: boolean, complaints: object|null, error: string|null }} */
async function fetchComplaints(make, model, year, delayMs) {
  const url = `${COMPLAINTS_URL}?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${year}`;
  const res = await fetchJson(url, delayMs);
  if (!res.ok) {
    return { available: false, complaints: null, error: res.error };
  }

  const rows = resultsOf(res.json);
  const counts = new Map();
  let crashCount = 0;
  let fireCount = 0;
  let injuryCount = 0;

  for (const row of rows) {
    if (row.crash) crashCount += 1;
    if (row.fire) fireCount += 1;
    injuryCount += Number(row.numberOfInjuries ?? 0) || 0;
    const raw = String(row.components ?? "").trim();
    const primary = raw ? normalizeComponent(raw.split(",")[0]) : "Unspecified";
    counts.set(primary, (counts.get(primary) ?? 0) + 1);
  }

  const byComponent = [...counts.entries()]
    .map(([component, count]) => ({ component, count }))
    .sort((a, b) => b.count - a.count || a.component.localeCompare(b.component))
    .slice(0, 8);

  return {
    available: true,
    complaints: { total: rows.length, crashCount, fireCount, injuryCount, byComponent },
    error: null,
  };
}

async function main() {
  if (!fs.existsSync(CATALOG_PATH)) {
    throw new Error(`Missing ${CATALOG_PATH} — run "npm run build:catalog" first.`);
  }

  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  const brandFilter = argValue("--brand")?.toLowerCase();
  const modelFilter = argValue("--model")?.toLowerCase();
  const limit = Number(argValue("--limit") || 0) || 0;
  const delayMs = Number(argValue("--delay-ms") || 250) || 250;
  const force = argFlag("--force");
  const dryRun = argFlag("--dry-run");

  const existing = fs.existsSync(OUT_PATH)
    ? JSON.parse(fs.readFileSync(OUT_PATH, "utf8"))
    : {};
  const out = force ? {} : { ...existing };

  let processed = 0;
  let recallOk = 0;
  let recallEmpty = 0;
  let recallErr = 0;
  let complaintOk = 0;
  let complaintEmpty = 0;
  let complaintErr = 0;
  let skippedAlreadyFetched = 0;

  console.log(
    `== NHTSA recalls+complaints enrichment (delay ${delayMs}ms${dryRun ? ", dry run" : ""}) ==`,
  );

  outer: for (const make of catalog) {
    if (brandFilter && make.slug !== brandFilter) continue;
    for (const model of make.models) {
      if (modelFilter && model.slug !== modelFilter) continue;
      for (const year of model.years) {
        if (limit && processed >= limit) break outer;
        const key = `${make.slug}/${model.slug}/${year.year}`;

        if (!force && out[key]?.recallDataAvailable && out[key]?.complaintDataAvailable) {
          skippedAlreadyFetched += 1;
          continue;
        }

        processed += 1;
        process.stdout.write(`  ${key}... `);

        if (dryRun) {
          console.log("(dry run, skipped)");
          continue;
        }

        const recallResult = await fetchRecalls(make.name, model.name, year.year, delayMs);
        if (!recallResult.available) {
          recallErr += 1;
          process.stdout.write(`recalls:ERROR(${recallResult.error}) `);
        } else if (recallResult.recalls.length === 0) {
          recallEmpty += 1;
          process.stdout.write("recalls:0 ");
        } else {
          recallOk += 1;
          process.stdout.write(`recalls:${recallResult.recalls.length} `);
        }

        const complaintResult = await fetchComplaints(make.name, model.name, year.year, delayMs);
        if (!complaintResult.available) {
          complaintErr += 1;
          process.stdout.write(`complaints:ERROR(${complaintResult.error})`);
        } else if (complaintResult.complaints.total === 0) {
          complaintEmpty += 1;
          process.stdout.write("complaints:0");
        } else {
          complaintOk += 1;
          process.stdout.write(`complaints:${complaintResult.complaints.total}`);
        }
        console.log("");

        out[key] = {
          recalls: recallResult.recalls,
          recallDataAvailable: recallResult.available,
          recallsError: recallResult.error,
          complaints: complaintResult.complaints,
          complaintDataAvailable: complaintResult.available,
          complaintsError: complaintResult.error,
          fetchedAt: new Date().toISOString(),
          source: "live: api.nhtsa.gov (scripts/enrich-recalls-complaints.js)",
        };
      }
    }
  }

  if (!dryRun) {
    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    fs.writeFileSync(OUT_PATH, `${JSON.stringify(out, null, 2)}\n`);
  }

  console.log("");
  console.log("== Summary ==");
  console.log(`Vehicles processed this run: ${processed}`);
  console.log(`Vehicles skipped (already had data, use --force to refetch): ${skippedAlreadyFetched}`);
  console.log(`Recalls   — ok: ${recallOk}, confirmed empty: ${recallEmpty}, FETCH FAILED: ${recallErr}`);
  console.log(`Complaints — ok: ${complaintOk}, confirmed empty: ${complaintEmpty}, FETCH FAILED: ${complaintErr}`);
  if (recallErr > 0 || complaintErr > 0) {
    console.log(
      `\n${recallErr + complaintErr} request(s) failed — re-run with --force on affected brands/models once the underlying issue (rate limit, outage, bad model-name match) is resolved. Failures are stored with recallDataAvailable/complaintDataAvailable: false, not silently treated as zero.`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
