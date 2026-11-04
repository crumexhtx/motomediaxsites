import type { TrimSpec } from "@/data/catalog";

type LabelInput = Pick<TrimSpec, "id" | "name" | "engine" | "drivetrain">;

/** "SR5 (hybrid available)" → "SR5": availability notes belong in trim notes. */
function stripAvailabilityNote(name: string): string {
  return name.replace(/\s*\([^)]*\bavailable\b[^)]*\)/i, "").trim() || name;
}

/** Remainder that is only a powertrain tag, e.g. "i-FORCE MAX", "4xe", "Hybrid". */
const POWERTRAIN_ONLY_RE =
  /^(i-?force(\s+max)?(\s+hybrid)?|hybrid|phev|plug-?in(\s+hybrid)?|4xe|e-?power|ev|electric)$/i;

function norm(label: string) {
  return label.trim().toLowerCase();
}

function qualifier(trim: LabelInput): string | undefined {
  return trim.engine?.trim() || trim.drivetrain?.trim() || undefined;
}

/**
 * Unique, non-confusing display labels for a year's trims.
 *
 * Fixes pairs like "SR5" vs "SR5 i-FORCE MAX" (one name is the other plus a
 * powertrain tag) and identical names, using only the trim's own curated
 * engine / drivetrain text — no invented specs.
 */
export function trimDisplayLabels(trims: LabelInput[]): Record<string, string> {
  const cleaned = trims.map((t) => ({ trim: t, label: stripAvailabilityNote(t.name) }));
  const result: Record<string, string> = {};

  for (const { trim, label } of cleaned) {
    const me = norm(label);
    const clashes = cleaned.some(({ trim: other, label: otherLabel }) => {
      if (other.id === trim.id) return false;
      const them = norm(otherLabel);
      if (them === me) return true;
      if (them.startsWith(`${me} `)) {
        return POWERTRAIN_ONLY_RE.test(them.slice(me.length + 1).trim());
      }
      return false;
    });
    const q = qualifier(trim);
    result[trim.id] =
      clashes && q && !norm(label).includes(norm(q)) ? `${label} (${q})` : label;
  }

  // Last resort: still-identical labels get a numeric suffix so selects stay distinct.
  const seen = new Map<string, number>();
  for (const trim of trims) {
    const key = norm(result[trim.id]);
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    if (n > 1) result[trim.id] = `${result[trim.id]} (${n})`;
  }
  return result;
}

/**
 * Default "Trim B" for comparison: first trim that differs from Trim A by id
 * AND by display label.
 */
export function pickCompareTrimId(
  trims: LabelInput[],
  trimAId: string | undefined,
  labels: Record<string, string> = trimDisplayLabels(trims),
): string | undefined {
  const a = trims.find((t) => t.id === trimAId);
  const aLabel = a ? norm(labels[a.id] ?? a.name) : undefined;
  return (
    trims.find(
      (t) => t.id !== trimAId && norm(labels[t.id] ?? t.name) !== aLabel,
    )?.id ?? trims.find((t) => t.id !== trimAId)?.id
  );
}
