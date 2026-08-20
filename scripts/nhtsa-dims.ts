/**
 * NHTSA Canadian Vehicle Specs (CVS) → exterior dimensions / curb weight.
 * Used by enrich:nhtsa-dims and shared with build-catalog style lookups.
 */

export type CvsDimSpecs = {
  overallLengthIn?: string;
  overallWidthIn?: string;
  overallHeightIn?: string;
  wheelbaseIn?: string;
  curbWeightLb?: string;
};

type CvsSpec = { Name?: string; Value?: string };
type CvsResponse = {
  Results?: Array<{ Specs?: CvsSpec[] }>;
};

const USER_AGENT =
  "motomediax/0.1 (catalog dims; https://github.com/motomediax)";

function cvsValue(
  specs: CvsSpec[] | undefined,
  name: string,
): string | undefined {
  const hit = specs?.find((s) => s.Name === name)?.Value?.trim();
  if (!hit || hit === "0") return undefined;
  const num = Number(hit);
  if (!Number.isFinite(num)) return hit;
  return Number.isInteger(num) ? String(num) : num.toFixed(1);
}

/** Strip generation notes like "(A90)" for the CVS model query. */
export function cleanModelNameForCvs(model: string): string {
  return model
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s*\/\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * CVS often uses slightly different model labels than our catalog display names.
 * Tried in order; first hit with dimensions wins.
 */
const CVS_MODEL_ALIASES: Record<string, string[]> = {
  "mustang mach-e": ["Mustang Mach E", "Mach-E"],
  "c-class": ["C Class"],
  "s-class": ["S Class"],
  "e-class": ["E Class"],
  "sl-class": ["SL Class", "SL"],
  miata: ["MX-5", "MX-5 Miata"],
  "cx-30": ["CX30", "CX-30"],
  "cx-90": ["CX90", "CX-90"],
  "cx-5": ["CX5", "CX-5"],
  "cx-9": ["CX9", "CX-9"],
  "wrx sti": ["WRX", "WRX STI"],
  "civic type r": ["Civic Type R", "Civic"],
};

export function cvsModelCandidates(model: string): string[] {
  const cleaned = cleanModelNameForCvs(model);
  const aliases = CVS_MODEL_ALIASES[cleaned.toLowerCase()] ?? [];
  const out = [cleaned, ...aliases];
  return [...new Set(out.map((s) => s.trim()).filter(Boolean))];
}

export function parseCvsDims(
  results: CvsResponse["Results"] | undefined,
): CvsDimSpecs | undefined {
  const specs = results?.[0]?.Specs;
  if (!specs?.length) return undefined;
  const overallLengthIn = cvsValue(specs, "OL");
  const overallWidthIn = cvsValue(specs, "OW");
  const overallHeightIn = cvsValue(specs, "OH");
  const wheelbaseIn = cvsValue(specs, "WB");
  const curbWeightLb = cvsValue(specs, "CW");
  if (
    !overallLengthIn &&
    !overallWidthIn &&
    !overallHeightIn &&
    !wheelbaseIn &&
    !curbWeightLb
  ) {
    return undefined;
  }
  return {
    overallLengthIn,
    overallWidthIn,
    overallHeightIn,
    wheelbaseIn,
    curbWeightLb,
  };
}

export async function fetchCvsDims(
  make: string,
  model: string,
  year: number,
): Promise<CvsDimSpecs | undefined> {
  for (const candidate of cvsModelCandidates(model)) {
    const url =
      `https://vpic.nhtsa.dot.gov/api/vehicles/GetCanadianVehicleSpecifications/` +
      `?year=${year}&make=${encodeURIComponent(make)}` +
      `&model=${encodeURIComponent(candidate)}&units=US&format=json`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`CVS ${res.status} for ${year} ${make} ${candidate}`);
    }
    const data = (await res.json()) as CvsResponse;
    const dims = parseCvsDims(data.Results);
    if (dims) return dims;
  }
  return undefined;
}

export function mergeCvsDimsIntoSpecs(
  specs: Record<string, unknown> | undefined,
  dims: CvsDimSpecs,
  options?: { overwrite?: boolean },
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...(specs ?? {}) };
  const overwrite = Boolean(options?.overwrite);
  const assign = (key: keyof CvsDimSpecs) => {
    const value = dims[key];
    if (value == null) return;
    if (!overwrite && next[key] != null && next[key] !== "") return;
    next[key] = value;
  };
  assign("overallLengthIn");
  assign("overallWidthIn");
  assign("overallHeightIn");
  assign("wheelbaseIn");
  assign("curbWeightLb");
  return next;
}

export function yearNeedsCvsDims(
  specs: Record<string, unknown> | undefined,
): boolean {
  if (!specs) return true;
  return !(
    specs.overallLengthIn ||
    specs.overallWidthIn ||
    specs.overallHeightIn ||
    specs.wheelbaseIn ||
    specs.curbWeightLb
  );
}
