/**
 * NHTSA recalls + complaints helpers for offline catalog enrichment.
 * APIs: api.nhtsa.gov (no key). Cache under scripts/.cache/nhtsa-safety/
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  YearComplaintSummary,
  YearRecall,
  YearSafetyStatus,
} from "../src/data/catalog";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SAFETY_CACHE_DIR = path.join(__dirname, ".cache", "nhtsa-safety");

const USER_AGENT = "MotoMediaXBot/1.0 (catalog enrich; https://www.motomediax.com/)";
const MIN_DELAY_MS = 120;

export type SafetyFetchResult<T> = {
  status: YearSafetyStatus["recalls"];
  data: T;
  error?: string;
  resolvedModel?: string;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function cachePath(kind: string, make: string, model: string, year: number) {
  const safe = `${kind}--${make}--${model}--${year}`
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .slice(0, 180);
  return path.join(SAFETY_CACHE_DIR, `${safe}.json`);
}

export function normalizeComponent(raw: string): string {
  const first = raw.split(",")[0]?.trim() || raw.trim();
  const top = first.split(":")[0]?.trim() || first;
  return top
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bAnd\b/g, "and");
}

function parseReportDate(raw: string | undefined): string {
  if (!raw) return "";
  // NHTSA recalls/complaints APIs return DD/MM/YYYY (day first).
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const [, dd, mm, yyyy] = dmy;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  return raw.slice(0, 32);
}

/** Repair dates previously stored as YYYY-DD-MM from a MM/DD mis-parse. */
export function coerceIsoDate(date: string): string {
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return parseReportDate(date) || date;
  const [, y, a, b] = m;
  const ai = Number(a);
  const bi = Number(b);
  if (ai > 12 && bi >= 1 && bi <= 12) {
    return `${y}-${b}-${a}`;
  }
  return date;
}

function truncateSummary(text: string, max = 320): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const boundary = cut.lastIndexOf(" ");
  return `${(boundary > 80 ? cut.slice(0, boundary) : cut).trim()}…`;
}

async function fetchJson(
  url: string,
): Promise<{ ok: boolean; status: number; json: unknown }> {
  await sleep(MIN_DELAY_MS);
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  // NHTSA sometimes returns HTTP 400 with a valid empty success payload.
  if (
    !res.ok &&
    json &&
    typeof json === "object" &&
    ("results" in (json as object) || "Results" in (json as object))
  ) {
    return { ok: true, status: res.status, json };
  }
  return { ok: res.ok, status: res.status, json };
}

function resultsOf(json: unknown): unknown[] {
  if (!json || typeof json !== "object") return [];
  const obj = json as Record<string, unknown>;
  const r = obj.results ?? obj.Results;
  return Array.isArray(r) ? r : [];
}

const POWERTRAIN_TOKENS = new Set([
  "gas",
  "bev",
  "hev",
  "phev",
  "diesel",
  "hybrid",
  "electric",
  "cng",
]);

function normalizeModelTokens(raw: string): string[] {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Pick the best NHTSA product-model string for a catalog model name.
 * Prefer full multi-token matches (Mustang Mach-E over Mustang) and prefer
 * bare names over powertrain-tagged variants (EXPLORER over EXPLORER GAS),
 * because recallsByVehicle often indexes the bare model only.
 */
export function pickBestNhtsaModel(
  catalogModel: string,
  nhtsaModels: string[],
): string {
  const wantTokens = normalizeModelTokens(catalogModel);
  if (!wantTokens.length) return catalogModel;
  const want = wantTokens.join(" ");

  const scored = nhtsaModels
    .map((m) => {
      const tokens = normalizeModelTokens(m);
      const n = tokens.join(" ");
      const core = tokens.filter((t) => !POWERTRAIN_TOKENS.has(t));
      const coreJoined = core.join(" ");
      const fuelExtra = tokens.length - core.length;

      let score = 0;
      if (n === want || coreJoined === want) {
        score = 100 - fuelExtra;
      } else {
        const hit = wantTokens.filter((t) => core.includes(t) || tokens.includes(t)).length;
        const coverage = hit / wantTokens.length;
        // Require every catalog token to appear — blocks Mustang stealing Mach-E.
        if (coverage < 1) {
          score = coverage * 30;
        } else {
          // All want tokens present; prefer fewer extra non-fuel tokens.
          const extraCore = core.filter((t) => !wantTokens.includes(t)).length;
          score = 90 - fuelExtra - Math.min(extraCore, 8);
        }
      }
      return { m, score, len: core.length };
    })
    .sort((a, b) => b.score - a.score || b.len - a.len);

  if (scored[0] && scored[0].score >= 40) return scored[0].m;
  return catalogModel;
}

/** Map catalog model names to NHTSA product model strings for a make/year. */
export async function resolveNhtsaModel(
  make: string,
  model: string,
  year: number,
  issueType: "r" | "c",
  force = false,
): Promise<string> {
  const cacheFile = cachePath(`models-${issueType}`, make, "list", year);
  fs.mkdirSync(SAFETY_CACHE_DIR, { recursive: true });
  let models: string[] = [];
  if (fs.existsSync(cacheFile) && !force) {
    models = JSON.parse(fs.readFileSync(cacheFile, "utf8")).models ?? [];
  } else {
    const url = `https://api.nhtsa.gov/products/vehicle/models?modelYear=${year}&make=${encodeURIComponent(make)}&issueType=${issueType}`;
    const { ok, json } = await fetchJson(url);
    if (ok) {
      models = resultsOf(json)
        .map((row) => {
          const r = row as Record<string, unknown>;
          return String(r.model ?? r.Model ?? "").trim();
        })
        .filter(Boolean);
      fs.writeFileSync(
        cacheFile,
        JSON.stringify({ models, fetchedAt: new Date().toISOString() }),
      );
    }
  }

  return pickBestNhtsaModel(model, models);
}

function recallQueryCandidates(catalogModel: string, resolvedModel: string): string[] {
  const out: string[] = [];
  const push = (value: string) => {
    const v = value.trim();
    if (v && !out.some((x) => x.toLowerCase() === v.toLowerCase())) out.push(v);
  };
  push(resolvedModel);
  // Bare catalog name often works when the product list only has "EXPLORER GAS".
  push(catalogModel);
  const stripped = normalizeModelTokens(resolvedModel)
    .filter((t) => !POWERTRAIN_TOKENS.has(t))
    .join(" ");
  if (stripped) push(stripped);
  return out;
}

export async function fetchRecalls(
  make: string,
  model: string,
  year: number,
  opts: { force?: boolean } = {},
): Promise<SafetyFetchResult<YearRecall[]>> {
  const resolvedModel = await resolveNhtsaModel(
    make,
    model,
    year,
    "r",
    opts.force,
  );
  const candidates = recallQueryCandidates(model, resolvedModel);
  fs.mkdirSync(SAFETY_CACHE_DIR, { recursive: true });

  let best: SafetyFetchResult<YearRecall[]> = {
    status: "empty",
    data: [],
    resolvedModel,
  };

  for (const candidate of candidates) {
    const file = cachePath("recalls", make, candidate, year);
    let json: unknown;
    if (fs.existsSync(file) && !opts.force) {
      json = JSON.parse(fs.readFileSync(file, "utf8")).payload;
    } else {
      const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(candidate)}&modelYear=${year}`;
      const res = await fetchJson(url);
      if (!res.ok || res.json == null) {
        if (best.status === "empty" && best.data.length === 0) {
          best = {
            status: "error",
            data: [],
            error: `HTTP ${res.status}`,
            resolvedModel: candidate,
          };
        }
        continue;
      }
      json = res.json;
      fs.writeFileSync(
        file,
        JSON.stringify({
          payload: json,
          resolvedModel: candidate,
          fetchedAt: new Date().toISOString(),
        }),
      );
    }

    const rows = resultsOf(json);
    const recalls: YearRecall[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      const r = row as Record<string, unknown>;
      const campaignNumber = String(
        r.NHTSACampaignNumber ?? r.nhtsaCampaignNumber ?? "",
      ).trim();
      const component = String(r.Component ?? r.component ?? "").trim();
      const summary = String(r.Summary ?? r.summary ?? "").trim();
      const date = parseReportDate(
        String(r.ReportReceivedDate ?? r.reportReceivedDate ?? ""),
      );
      if (!campaignNumber || !component || !summary || !date) continue;
      if (seen.has(campaignNumber)) continue;
      seen.add(campaignNumber);
      recalls.push({
        campaignNumber,
        date,
        component: normalizeComponent(component),
        summary: truncateSummary(summary, 320),
      });
    }

    recalls.sort((a, b) => b.date.localeCompare(a.date));
    const next: SafetyFetchResult<YearRecall[]> = {
      status: recalls.length ? "ok" : "empty",
      data: recalls.slice(0, 20),
      resolvedModel: candidate,
    };
    if (next.status === "ok") return next;
    if (best.status !== "ok") best = next;
  }

  return best;
}

export async function fetchComplaintSummary(
  make: string,
  model: string,
  year: number,
  opts: { force?: boolean } = {},
): Promise<SafetyFetchResult<YearComplaintSummary>> {
  const empty: YearComplaintSummary = {
    total: 0,
    crashCount: 0,
    fireCount: 0,
    injuryCount: 0,
    byComponent: [],
  };
  const resolvedModel = await resolveNhtsaModel(
    make,
    model,
    year,
    "c",
    opts.force,
  );
  const file = cachePath("complaints", make, resolvedModel, year);
  fs.mkdirSync(SAFETY_CACHE_DIR, { recursive: true });

  let json: unknown;
  if (fs.existsSync(file) && !opts.force) {
    json = JSON.parse(fs.readFileSync(file, "utf8")).payload;
  } else {
    const url = `https://api.nhtsa.gov/complaints/complaintsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(resolvedModel)}&modelYear=${year}`;
    const res = await fetchJson(url);
    if (!res.ok || res.json == null) {
      return {
        status: "error",
        data: empty,
        error: `HTTP ${res.status}`,
        resolvedModel,
      };
    }
    json = res.json;
    fs.writeFileSync(
      file,
      JSON.stringify({
        payload: json,
        resolvedModel,
        fetchedAt: new Date().toISOString(),
      }),
    );
  }

  const rows = resultsOf(json);
  const counts = new Map<string, number>();
  let crashCount = 0;
  let fireCount = 0;
  let injuryCount = 0;

  for (const row of rows) {
    const r = row as Record<string, unknown>;
    if (r.crash) crashCount += 1;
    if (r.fire) fireCount += 1;
    injuryCount += Number(r.numberOfInjuries ?? 0) || 0;
    const components = String(r.components ?? r.Components ?? "")
      .split(",")
      .map((c) => normalizeComponent(c))
      .filter(Boolean);
    if (!components.length) {
      counts.set("Unspecified", (counts.get("Unspecified") ?? 0) + 1);
      continue;
    }
    // Count primary component only to avoid double-counting multi-tag rows.
    const primary = components[0];
    counts.set(primary, (counts.get(primary) ?? 0) + 1);
  }

  const byComponent = [...counts.entries()]
    .map(([component, count]) => ({ component, count }))
    .sort((a, b) => b.count - a.count || a.component.localeCompare(b.component))
    .slice(0, 8);

  const summary: YearComplaintSummary = {
    total: rows.length,
    crashCount,
    fireCount,
    injuryCount,
    byComponent,
  };

  return {
    status: rows.length ? "ok" : "empty",
    data: summary,
    resolvedModel,
  };
}
