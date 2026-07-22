/**
 * EPA FuelEconomy.gov vehicles.csv helpers for catalog build.
 * Source: https://www.fueleconomy.gov/feg/download.shtml
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EPA_DIR = path.join(__dirname, ".cache", "epa");
const EPA_ZIP = path.join(EPA_DIR, "vehicles.csv.zip");
const EPA_CSV = path.join(EPA_DIR, "vehicles.csv");
const EPA_ZIP_URL =
  "https://www.fueleconomy.gov/feg/epadata/vehicles.csv.zip";
const USER_AGENT =
  "motomediax/0.1 (catalog builder; https://github.com/motomediax)";

/** Max age before re-downloading the EPA dump (7 days). */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type EpaVehicle = {
  year: number;
  make: string;
  model: string;
  baseModel: string;
  cityMpg: number;
  highwayMpg: number;
  combinedMpg: number;
  drive?: string;
  transmission?: string;
  fuelType?: string;
  atvType?: string;
  /** EV total range (miles); 0 when N/A */
  rangeMiles?: number;
  /** PHEV combined MPGe-ish / charge-depleting combined */
  phevComb?: number;
  displ?: number;
  cylinders?: number;
};

export type EpaYearSummary = {
  mpgCity?: number;
  mpgHighway?: number;
  mpgCombined?: number;
  driveType?: string;
  fuelTypePrimary?: string;
  electrificationLevel?: string;
  rangeMiles?: number;
  transmission?: string;
  variantCount: number;
  variants: string[];
};

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function isFresh(file: string): boolean {
  if (!fs.existsSync(file)) return false;
  const age = Date.now() - fs.statSync(file).mtimeMs;
  return age < MAX_AGE_MS;
}

async function downloadZip(): Promise<void> {
  ensureDir(EPA_DIR);
  console.log("  downloading EPA vehicles.csv.zip …");
  const res = await fetch(EPA_ZIP_URL, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) {
    throw new Error(`EPA download failed: HTTP ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(EPA_ZIP, buf);
}

function unzipCsv(): void {
  if (process.platform === "win32") {
    execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `Expand-Archive -LiteralPath '${EPA_ZIP.replace(/'/g, "''")}' -DestinationPath '${EPA_DIR.replace(/'/g, "''")}' -Force`,
      ],
      { stdio: "pipe" },
    );
  } else {
    execFileSync("unzip", ["-o", EPA_ZIP, "-d", EPA_DIR], { stdio: "pipe" });
  }
  if (!fs.existsSync(EPA_CSV)) {
    throw new Error(`EPA unzip did not produce ${EPA_CSV}`);
  }
}

/** Ensure vehicles.csv is on disk (download + unzip if needed). */
export async function ensureEpaCsv(): Promise<string> {
  if (isFresh(EPA_CSV)) return EPA_CSV;
  await downloadZip();
  unzipCsv();
  return EPA_CSV;
}

/** Minimal CSV line parser (handles quoted fields). */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function num(value: string | undefined): number | undefined {
  if (value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function positiveMpg(n: number | undefined): number | undefined {
  if (n === undefined || n <= 0) return undefined;
  return Math.round(n);
}

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

/** Map catalog display names → EPA search tokens (most-specific first). */
function catalogModelTokens(modelName: string): string[] {
  const cleaned = modelName
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const tokens = [cleaned];

  // GR Supra is listed as "GR Supra" in EPA
  if (/^supra$/i.test(cleaned)) tokens.push("GR Supra", "Supra");
  if (/^gr86$/i.test(cleaned)) tokens.push("GR86", "GR 86");
  if (/^gr corolla$/i.test(cleaned)) tokens.push("GR Corolla");
  if (/^4runner$/i.test(cleaned)) tokens.push("4Runner");
  if (/^land cruiser$/i.test(cleaned)) tokens.push("Land Cruiser");
  if (/^f-150$/i.test(cleaned)) tokens.push("F150", "F-150");
  if (/^model 3$/i.test(cleaned)) tokens.push("Model 3");
  if (/^model y$/i.test(cleaned)) tokens.push("Model Y");
  if (/^model s$/i.test(cleaned)) tokens.push("Model S");
  if (/^model x$/i.test(cleaned)) tokens.push("Model X");
  if (/^c-class$/i.test(cleaned)) tokens.push("C-Class", "C 300", "C300");
  if (/^3 series$/i.test(cleaned)) tokens.push("3 Series", "330i", "330");
  if (/^wrx/i.test(cleaned)) tokens.push("WRX");
  // Performance variants: never fall back to the parent model (hybrid MPG bleed).
  if (/elantra n/i.test(cleaned)) tokens.push("Elantra N");
  // EPA lists CTR as "Civic 5Dr" + Premium, not "Civic Type R".
  if (/civic type r/i.test(cleaned)) tokens.push("Civic Type R", "Civic 5Dr");
  if (/^z$/i.test(cleaned)) tokens.push("Z");
  if (/mx-5|miata/i.test(cleaned)) tokens.push("MX-5", "Miata");

  // Prefer longer / more specific tokens so "Civic Type R" wins over "Civic".
  return [...new Set(tokens)].sort(
    (a, b) => normalizeKey(b).length - normalizeKey(a).length,
  );
}

function epaModelMatches(epaModel: string, epaBase: string, wanted: string): boolean {
  const m = normalizeKey(epaModel);
  const b = normalizeKey(epaBase || "");
  const w = normalizeKey(wanted);
  if (!w) return false;
  if (m === w || b === w) return true;
  // EPA often uses "Camry Hybrid LE", "RAV4 Prime", "F150 Pickup 2WD"
  if (m.startsWith(w) || b.startsWith(w)) return true;
  // Avoid short false positives (e.g. "Z" matching everything with z)
  if (w.length >= 3 && (m.includes(w) || b.includes(w))) return true;
  if (w.length < 3 && (m === w || b === w || m.startsWith(w))) return true;
  return false;
}

function electrificationFromAtv(atv?: string, fuel?: string): string | undefined {
  const a = (atv || "").toLowerCase();
  const f = (fuel || "").toLowerCase();
  if (a.includes("plug-in") || a.includes("phev") || f.includes("electricity")) {
    if (a.includes("hybrid") || f.includes("premium") || f.includes("regular")) {
      return "Plug-in Hybrid";
    }
  }
  if (a.includes("ev") || a === "ev" || (f === "electricity" && !a.includes("hybrid"))) {
    return "BEV";
  }
  if (a.includes("hybrid") || f.includes("hybrid")) return "Hybrid";
  return undefined;
}

function pickRepresentative(rows: EpaVehicle[]): EpaVehicle {
  // Prefer a mid/popular config: hybrid if present, else highest combined MPG gas,
  // else first row. Avoid exotic/guzzler extremes when possible.
  const hybrids = rows.filter(
    (r) =>
      (r.atvType || "").toLowerCase().includes("hybrid") &&
      !(r.atvType || "").toLowerCase().includes("plug"),
  );
  if (hybrids.length) {
    return [...hybrids].sort((a, b) => b.combinedMpg - a.combinedMpg)[0];
  }
  const plugIns = rows.filter((r) =>
    (r.atvType || "").toLowerCase().includes("plug"),
  );
  const gas = rows.filter(
    (r) =>
      !(r.atvType || "").toLowerCase().includes("hybrid") &&
      !(r.fuelType || "").toLowerCase().includes("electricity"),
  );
  const pool = gas.length ? gas : plugIns.length ? plugIns : rows;
  return [...pool].sort((a, b) => b.combinedMpg - a.combinedMpg)[0];
}

/** Sport / performance models: prefer non-hybrid gas with the lowest combined MPG. */
function pickSportRepresentative(rows: EpaVehicle[]): EpaVehicle {
  const gas = rows.filter(
    (r) =>
      !(r.atvType || "").toLowerCase().includes("hybrid") &&
      !(r.fuelType || "").toLowerCase().includes("electricity"),
  );
  const pool = gas.length ? gas : rows;
  return [...pool].sort((a, b) => a.combinedMpg - b.combinedMpg)[0];
}

export type EpaIndex = {
  byMakeYear: Map<string, EpaVehicle[]>;
};

function makeYearKey(make: string, year: number): string {
  return `${normalizeKey(make)}|${year}`;
}

/** Load and index EPA rows for the given years only. */
export async function loadEpaIndex(
  years: readonly number[],
): Promise<EpaIndex> {
  const csvPath = await ensureEpaCsv();
  const yearSet = new Set(years);
  const text = fs.readFileSync(csvPath, "utf8");
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) throw new Error("EPA CSV is empty");

  const header = parseCsvLine(lines[0]);
  const col = (name: string) => header.indexOf(name);
  const iYear = col("year");
  const iMake = col("make");
  const iModel = col("model");
  const iBase = col("baseModel");
  const iCity = col("city08");
  const iHwy = col("highway08");
  const iComb = col("comb08");
  const iDrive = col("drive");
  const iTrany = col("trany");
  const iFuel = col("fuelType1");
  const iAtv = col("atvType");
  const iRange = col("range");
  const iPhev = col("phevComb");
  const iDispl = col("displ");
  const iCyl = col("cylinders");

  const byMakeYear = new Map<string, EpaVehicle[]>();
  let kept = 0;

  for (let li = 1; li < lines.length; li++) {
    const line = lines[li];
    if (!line) continue;
    const p = parseCsvLine(line);
    const year = num(p[iYear]);
    if (year === undefined || !yearSet.has(year)) continue;

    const make = p[iMake]?.trim();
    const model = p[iModel]?.trim();
    if (!make || !model) continue;

    const cityMpg = positiveMpg(num(p[iCity])) ?? 0;
    const highwayMpg = positiveMpg(num(p[iHwy])) ?? 0;
    const combinedMpg = positiveMpg(num(p[iComb])) ?? 0;
    const rangeRaw = num(p[iRange]);
    const rangeMiles =
      rangeRaw !== undefined && rangeRaw > 0 ? Math.round(rangeRaw) : undefined;
    const phevComb = positiveMpg(num(p[iPhev]));

    const vehicle: EpaVehicle = {
      year,
      make,
      model,
      baseModel: (p[iBase] || "").trim(),
      cityMpg,
      highwayMpg,
      combinedMpg,
      drive: p[iDrive]?.trim() || undefined,
      transmission: p[iTrany]?.trim() || undefined,
      fuelType: p[iFuel]?.trim() || undefined,
      atvType: p[iAtv]?.trim() || undefined,
      rangeMiles,
      phevComb,
      displ: num(p[iDispl]),
      cylinders: num(p[iCyl]),
    };

    const key = makeYearKey(make, year);
    const list = byMakeYear.get(key);
    if (list) list.push(vehicle);
    else byMakeYear.set(key, [vehicle]);
    kept += 1;
  }

  console.log(`  EPA index: ${kept} vehicles across years ${years.join(", ")}`);
  return { byMakeYear };
}

export function lookupEpaSummary(
  index: EpaIndex,
  brand: string,
  modelName: string,
  year: number,
): EpaYearSummary | undefined {
  const rows = index.byMakeYear.get(makeYearKey(brand, year));
  if (!rows?.length) return undefined;

  const tokens = catalogModelTokens(modelName);
  // Use the first (most specific) token that matches any EPA row — do not
  // union with broader parent tokens (e.g. Type R must not pull Civic Hybrid).
  let matches: EpaVehicle[] = [];
  for (const token of tokens) {
    let hit = rows.filter((r) =>
      epaModelMatches(r.model, r.baseModel, token),
    );
    // Civic Type R is a premium-fuel hatch; drop hybrids / 4-door economy rows.
    if (/civic type r/i.test(modelName)) {
      const premiumHatch = hit.filter(
        (r) =>
          /5dr/i.test(r.model) &&
          !(r.atvType || "").toLowerCase().includes("hybrid") &&
          (r.fuelType || "").toLowerCase().includes("premium"),
      );
      if (premiumHatch.length) hit = premiumHatch;
      else {
        hit = hit.filter(
          (r) =>
            !(r.atvType || "").toLowerCase().includes("hybrid") &&
            r.combinedMpg > 0 &&
            r.combinedMpg <= 28,
        );
      }
    }
    if (hit.length) {
      matches = hit;
      break;
    }
  }
  if (!matches.length) return undefined;

  // For sport variants, prefer the least-efficient gas config (not hybrid).
  const sportModel =
    /type r|elantra n|wrx|sti|gt[- ]?r|mustang gt|camaro [sz]|gr corolla|gr86|supra|focus rs|golf r|amg/i.test(
      modelName,
    );
  const rep = sportModel
    ? pickSportRepresentative(matches)
    : pickRepresentative(matches);
  const variants = [
    ...new Set(matches.map((m) => m.model).filter(Boolean)),
  ].slice(0, 10);

  const isEv =
    (rep.fuelType || "").toLowerCase() === "electricity" &&
    !(rep.atvType || "").toLowerCase().includes("hybrid");

  return {
    mpgCity: isEv ? undefined : positiveMpg(rep.cityMpg),
    mpgHighway: isEv ? undefined : positiveMpg(rep.highwayMpg),
    mpgCombined: isEv
      ? positiveMpg(rep.combinedMpg) // MPGe stored in comb08 for EVs
      : positiveMpg(rep.combinedMpg),
    driveType: rep.drive,
    fuelTypePrimary: rep.fuelType,
    electrificationLevel: electrificationFromAtv(rep.atvType, rep.fuelType),
    rangeMiles: rep.rangeMiles,
    transmission: rep.transmission,
    variantCount: matches.length,
    variants,
  };
}

/** Merge EPA efficiency fields into an existing specs object. */
export function mergeEpaIntoSpecs<T extends Record<string, unknown>>(
  specs: T | undefined,
  epa: EpaYearSummary | undefined,
  options: { overwriteMpg?: boolean } = {},
): T | undefined {
  if (!epa) return specs;
  const next = { ...(specs ?? {}) } as T & {
    mpgCity?: number;
    mpgHighway?: number;
    mpgCombined?: number;
    driveType?: string;
    fuelTypePrimary?: string;
    electrificationLevel?: string;
    rangeMiles?: number;
  };

  const overwrite = options.overwriteMpg === true;
  if ((overwrite || next.mpgCity == null) && epa.mpgCity != null)
    next.mpgCity = epa.mpgCity;
  if ((overwrite || next.mpgHighway == null) && epa.mpgHighway != null)
    next.mpgHighway = epa.mpgHighway;
  if ((overwrite || next.mpgCombined == null) && epa.mpgCombined != null)
    next.mpgCombined = epa.mpgCombined;
  if (!next.driveType && epa.driveType) next.driveType = epa.driveType;
  if (!next.fuelTypePrimary && epa.fuelTypePrimary)
    next.fuelTypePrimary = epa.fuelTypePrimary;
  if (!next.electrificationLevel && epa.electrificationLevel)
    next.electrificationLevel = epa.electrificationLevel;
  if (next.rangeMiles == null && epa.rangeMiles != null)
    next.rangeMiles = epa.rangeMiles;

  return next;
}
