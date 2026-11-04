import type { TrimSpec } from "@/data/catalog";

/** Visitor-facing text for a spec a trim genuinely has no published value for. */
export const NOT_PUBLISHED = "Not published";

/** Placeholder strings that mean "no value" — never shown to visitors as a value. */
export function isMissingSpec(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "number") return Number.isNaN(value);
  const t = String(value).trim();
  return t === "" || /^(—|–|-+|n\/a|na|null|undefined|unknown|tbd|todo)$/i.test(t);
}

/** "278" + " hp" → "278 hp"; missing → null (callers decide how to render). */
export function formatSpec(
  value: number | string | undefined | null,
  suffix = "",
): string | null {
  if (isMissingSpec(value)) return null;
  return `${value}${suffix}`;
}

export type CompareRow = { label: string; a: string | null; b: string | null };

/**
 * Rows for the Trim A vs Trim B table.
 * - A row is dropped when BOTH trims are missing the value.
 * - When only one is missing, that side stays `null` and renders "Not published".
 */
export function buildTrimCompareRows(a: TrimSpec, b: TrimSpec): CompareRow[] {
  const rows: CompareRow[] = [
    { label: "Horsepower", a: formatSpec(a.horsepower, " hp"), b: formatSpec(b.horsepower, " hp") },
    { label: "Torque", a: formatSpec(a.torqueLbFt, " lb-ft"), b: formatSpec(b.torqueLbFt, " lb-ft") },
    { label: "0–60", a: formatSpec(a.zeroToSixtySec, " s"), b: formatSpec(b.zeroToSixtySec, " s") },
    { label: "City MPG", a: formatSpec(a.mpgCity), b: formatSpec(b.mpgCity) },
    { label: "Highway MPG", a: formatSpec(a.mpgHighway), b: formatSpec(b.mpgHighway) },
    { label: "Combined MPG", a: formatSpec(a.mpgCombined), b: formatSpec(b.mpgCombined) },
    { label: "Engine", a: formatSpec(a.engine), b: formatSpec(b.engine) },
    { label: "Transmission", a: formatSpec(a.transmission), b: formatSpec(b.transmission) },
    { label: "Drivetrain", a: formatSpec(a.drivetrain), b: formatSpec(b.drivetrain) },
    { label: "Towing", a: formatSpec(a.towingLb, " lb"), b: formatSpec(b.towingLb, " lb") },
    { label: "Cargo", a: formatSpec(a.cargoCuFt, " cu ft"), b: formatSpec(b.cargoCuFt, " cu ft") },
    { label: "Ground clearance", a: formatSpec(a.groundClearanceIn, " in"), b: formatSpec(b.groundClearanceIn, " in") },
    { label: "Seating", a: formatSpec(a.seatingCapacity), b: formatSpec(b.seatingCapacity) },
    { label: "EV range", a: formatSpec(a.rangeMiles, " mi"), b: formatSpec(b.rangeMiles, " mi") },
  ];
  return rows.filter((row) => row.a !== null || row.b !== null);
}

export type IndexColumn = { label: string; cell: (t: TrimSpec) => string | null };

const INDEX_COLUMNS: IndexColumn[] = [
  { label: "HP", cell: (t) => formatSpec(t.horsepower) },
  { label: "Torque", cell: (t) => formatSpec(t.torqueLbFt) },
  { label: "0–60", cell: (t) => formatSpec(t.zeroToSixtySec, "s") },
  { label: "MPG", cell: (t) => formatSpec(t.mpgCombined) },
  { label: "Drivetrain", cell: (t) => formatSpec(t.drivetrain) },
];

/** Trim-index columns, dropping any column that no trim has a value for. */
export function buildTrimIndexColumns(trims: TrimSpec[]): IndexColumn[] {
  return INDEX_COLUMNS.filter((col) => trims.some((t) => col.cell(t) !== null));
}

/** The compare UI only makes sense with at least two trims. */
export function canCompareTrims(trims: unknown[]): boolean {
  return trims.length > 1;
}
