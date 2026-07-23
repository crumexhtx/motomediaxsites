import type { TrimSpec, VehicleSpecs, YearEntry } from "@/data/catalog";

export type YearDiffChange = {
  key: string;
  label: string;
  previous: string;
  current: string;
  /** Numeric delta hint for display (higher/lower/changed). */
  tone: "up" | "down" | "change";
};

export type YearDiffResult = {
  previousYear: number;
  currentYear: number;
  changes: YearDiffChange[];
  trimsAdded: string[];
  trimsRemoved: string[];
};

type FieldDef = {
  key: string;
  label: string;
  /** Prefer higher values as "up" when numeric. */
  higherIsBetter?: boolean;
  fromSpecs: (s?: VehicleSpecs) => string | number | undefined | null;
  fromTrim?: (t?: TrimSpec) => string | number | undefined | null;
};

const FIELDS: FieldDef[] = [
  {
    key: "mpgCombined",
    label: "Combined MPG",
    higherIsBetter: true,
    fromSpecs: (s) => s?.mpgCombined,
    fromTrim: (t) => t?.mpgCombined,
  },
  {
    key: "mpgCity",
    label: "City MPG",
    higherIsBetter: true,
    fromSpecs: (s) => s?.mpgCity,
    fromTrim: (t) => t?.mpgCity,
  },
  {
    key: "mpgHighway",
    label: "Highway MPG",
    higherIsBetter: true,
    fromSpecs: (s) => s?.mpgHighway,
    fromTrim: (t) => t?.mpgHighway,
  },
  {
    key: "horsepower",
    label: "Horsepower",
    higherIsBetter: true,
    fromSpecs: () => undefined,
    fromTrim: (t) => t?.horsepower,
  },
  {
    key: "torqueLbFt",
    label: "Torque",
    higherIsBetter: true,
    fromSpecs: () => undefined,
    fromTrim: (t) => t?.torqueLbFt,
  },
  {
    key: "zeroToSixtySec",
    label: "0–60",
    higherIsBetter: false,
    fromSpecs: () => undefined,
    fromTrim: (t) => t?.zeroToSixtySec,
  },
  {
    key: "engine",
    label: "Engine",
    fromSpecs: () => undefined,
    fromTrim: (t) => t?.engine,
  },
  {
    key: "drivetrain",
    label: "Drivetrain",
    fromSpecs: (s) => s?.driveType,
    fromTrim: (t) => t?.drivetrain,
  },
  {
    key: "electrificationLevel",
    label: "Electrification",
    fromSpecs: (s) => s?.electrificationLevel,
  },
  {
    key: "overallLengthIn",
    label: "Length",
    fromSpecs: (s) => s?.overallLengthIn,
  },
  {
    key: "overallWidthIn",
    label: "Width",
    fromSpecs: (s) => s?.overallWidthIn,
  },
  {
    key: "overallHeightIn",
    label: "Height",
    fromSpecs: (s) => s?.overallHeightIn,
  },
  {
    key: "wheelbaseIn",
    label: "Wheelbase",
    fromSpecs: (s) => s?.wheelbaseIn,
  },
  {
    key: "curbWeightLb",
    label: "Curb weight",
    fromSpecs: (s) => s?.curbWeightLb,
    fromTrim: (t) => t?.curbWeightLb,
  },
  {
    key: "towingLb",
    label: "Towing",
    higherIsBetter: true,
    fromSpecs: (s) => s?.towingLb,
    fromTrim: (t) => t?.towingLb,
  },
  {
    key: "groundClearanceIn",
    label: "Ground clearance",
    fromSpecs: (s) => s?.groundClearanceIn,
    fromTrim: (t) => t?.groundClearanceIn,
  },
  {
    key: "overallRating",
    label: "Overall safety",
    higherIsBetter: true,
    fromSpecs: (s) => s?.overallRating,
  },
  {
    key: "frontCrashRating",
    label: "Front crash",
    higherIsBetter: true,
    fromSpecs: (s) => s?.frontCrashRating,
  },
  {
    key: "sideCrashRating",
    label: "Side crash",
    higherIsBetter: true,
    fromSpecs: (s) => s?.sideCrashRating,
  },
  {
    key: "rolloverRating",
    label: "Rollover",
    higherIsBetter: true,
    fromSpecs: (s) => s?.rolloverRating,
  },
];

function defaultTrim(year: YearEntry): TrimSpec | undefined {
  const trims = year.performance?.trims ?? [];
  if (!trims.length) return undefined;
  const id = year.performance?.defaultTrimId;
  return (id && trims.find((t) => t.id === id)) || trims[0];
}

function pickValue(
  field: FieldDef,
  year: YearEntry,
): string | number | undefined | null {
  const trim = defaultTrim(year);
  const fromTrim = field.fromTrim?.(trim);
  if (fromTrim !== undefined && fromTrim !== null && fromTrim !== "") {
    return fromTrim;
  }
  return field.fromSpecs(year.specs);
}

function formatValue(
  key: string,
  value: string | number | undefined | null,
): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") {
    if (key === "zeroToSixtySec") return `${value} s`;
    if (key === "horsepower") return `${value} hp`;
    if (key === "torqueLbFt") return `${value} lb-ft`;
    if (key.startsWith("mpg")) return `${value} mpg`;
    if (key === "towingLb" || key === "curbWeightLb") return `${value} lb`;
    if (key === "groundClearanceIn") return `${value} in`;
    return String(value);
  }
  const n = Number.parseFloat(value);
  if (
    Number.isFinite(n) &&
    /^(overallLengthIn|overallWidthIn|overallHeightIn|wheelbaseIn|groundClearanceIn)$/.test(
      key,
    )
  ) {
    return `${value} in`;
  }
  if (Number.isFinite(n) && key === "curbWeightLb") {
    return `${value} lb`;
  }
  if (/Rating$/.test(key) && /^\d/.test(value)) {
    return `${value} / 5`;
  }
  return String(value);
}

function toNumber(value: string | number): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const n = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function toneFor(
  field: FieldDef,
  prev: string | number,
  next: string | number,
): YearDiffChange["tone"] {
  const a = toNumber(prev);
  const b = toNumber(next);
  if (a === null || b === null || a === b) return "change";
  const rose = b > a;
  if (field.higherIsBetter === undefined) return "change";
  if (field.higherIsBetter) return rose ? "up" : "down";
  return rose ? "down" : "up";
}

function trimNames(year: YearEntry): string[] {
  const curated = year.performance?.trims?.map((t) => t.name) ?? [];
  if (curated.length) return curated;
  return year.specs?.trims ?? [];
}

/** Compare a year entry to the previous model year (specs + default trim). */
export function diffYears(
  previous: YearEntry,
  current: YearEntry,
): YearDiffResult {
  const changes: YearDiffChange[] = [];

  for (const field of FIELDS) {
    const prevRaw = pickValue(field, previous);
    const currRaw = pickValue(field, current);
    const prevFmt = formatValue(field.key, prevRaw);
    const currFmt = formatValue(field.key, currRaw);
    if (!prevFmt || !currFmt) continue;
    if (prevFmt === currFmt) continue;
    changes.push({
      key: field.key,
      label: field.label,
      previous: prevFmt,
      current: currFmt,
      tone: toneFor(field, prevRaw as string | number, currRaw as string | number),
    });
  }

  const prevTrims = new Set(trimNames(previous));
  const currTrims = new Set(trimNames(current));
  const trimsAdded = [...currTrims].filter((n) => !prevTrims.has(n)).sort();
  const trimsRemoved = [...prevTrims].filter((n) => !currTrims.has(n)).sort();

  return {
    previousYear: previous.year,
    currentYear: current.year,
    changes,
    trimsAdded,
    trimsRemoved,
  };
}

/** Nearest earlier year on the same model, if any. */
export function findPreviousYear(
  years: YearEntry[],
  currentYear: number,
): YearEntry | undefined {
  return [...years]
    .filter((y) => y.year < currentYear)
    .sort((a, b) => b.year - a.year)[0];
}
