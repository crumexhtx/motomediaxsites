import type { ImageConfidence } from "@/data/catalog";

/** Normalize for loose matching against Commons titles. */
export function normalizeImageToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Suggest confidence from Commons metadata. Never auto-returns `verified` —
 * that requires an explicit human mark in the trim image map.
 */
export function suggestTrimImageConfidence(input: {
  trimId: string;
  trimName: string;
  pageYear: number;
  commonsTitle?: string;
  explicit?: ImageConfidence;
}): ImageConfidence {
  if (
    input.explicit === "verified" ||
    input.explicit === "unverified" ||
    input.explicit === "yearOnly"
  ) {
    return input.explicit;
  }

  return "unverified";
}

/** Only verified trim photos may replace the year hero / OG image. */
export function isTrustedHeroPhoto(
  confidence: ImageConfidence | undefined,
): boolean {
  return confidence === "verified";
}

/**
 * Lightweight sanity check used by audits: does the Commons title look like
 * it mentions this trim and a nearby model year?
 */
export function commonsTitleLooksPlausible(input: {
  trimId: string;
  trimName: string;
  pageYear: number;
  commonsTitle?: string;
}): { ok: boolean; reasons: string[] } {
  const title = input.commonsTitle ?? "";
  const reasons: string[] = [];
  if (!title) {
    return { ok: false, reasons: ["missing commonsTitle"] };
  }

  const normTitle = normalizeImageToken(title);
  const trimTokens = normalizeImageToken(input.trimName)
    .split(" ")
    .filter((t) => t.length > 1 && t !== "trim");
  const idTokens = normalizeImageToken(input.trimId)
    .split(" ")
    .filter(Boolean);

  const tokens = [...new Set([...trimTokens, ...idTokens])];
  const missing = tokens.filter((t) => !normTitle.includes(t));
  if (missing.length === tokens.length && tokens.length > 0) {
    reasons.push(`title lacks trim tokens (${missing.join(", ")})`);
  }

  const years = [...title.matchAll(/\b(20\d{2})\b/g)].map((m) =>
    Number(m[1]),
  );
  if (years.length) {
    const nearest = years.reduce((best, y) =>
      Math.abs(y - input.pageYear) < Math.abs(best - input.pageYear) ? y : best,
    );
    if (Math.abs(nearest - input.pageYear) > 2) {
      reasons.push(`title year ${nearest} far from page year ${input.pageYear}`);
    }
  }

  return { ok: reasons.length === 0, reasons };
}

export function photoConfidenceLabel(
  confidence: ImageConfidence | undefined,
): string {
  switch (confidence) {
    case "verified":
      return "Verified trim photo";
    case "yearOnly":
      return "Model-year reference photo";
    case "unverified":
    default:
      return "Unverified trim photo — may not match this trim exactly";
  }
}
