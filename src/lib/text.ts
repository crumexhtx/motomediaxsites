/**
 * Text helpers for catalog copy and SEO descriptions.
 */

/** Truncate to a sentence boundary at or before maxLen (never mid-word mid-sentence). */
export function truncateAtSentence(text: string, maxLen: number): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  // Keep intact only when already within budget AND ends on a sentence.
  if (normalized.length <= maxLen && /[.!?]["']?$/.test(normalized)) {
    return normalized;
  }

  const window = normalized.slice(0, Math.min(maxLen, normalized.length));
  // Prefer last sentence end in the window over any mid-sentence cut.
  const sentenceEnds = [...window.matchAll(/[.!?]["']?(?=\s|$)/g)];
  if (sentenceEnds.length > 0) {
    const last = sentenceEnds[sentenceEnds.length - 1];
    const end = (last.index ?? 0) + last[0].length;
    // Keep even short leading sentences — better than "transferred to th".
    if (end >= 24) {
      return window.slice(0, end).trim();
    }
  }

  // Fall back to last word boundary so we never publish a dangling fragment.
  const boundary = window.lastIndexOf(" ");
  if (boundary >= 24) {
    return `${window.slice(0, boundary).trim()}…`;
  }
  return `${window.trim()}…`;
}

const THIN_SUMMARY_RE = /—\s*offered in the U\.S\. market\.?$/i;

export function isThinYearSummary(summary: string | undefined | null): boolean {
  if (!summary?.trim()) return true;
  const s = summary.trim();
  if (/final u\.?s\.? catalog year/i.test(s)) return false;
  if (/final model year/i.test(s)) return false;
  if (THIN_SUMMARY_RE.test(s)) return true;
  // Bare "YYYY Brand Model." stubs
  if (s.length < 36) return true;
  return false;
}

/** Strip catalog boilerplate leads from a year description. */
export function stripCatalogLead(description: string, year?: number): string {
  let next = description.trim();
  next = next.replace(
    /^The \d{4} .+? continues this nameplate in the MotoMediaX catalog\.\s*/i,
    "",
  );
  next = next.replace(
    /^The \d{4} .+? was the final model year covered in this catalog\.\s*/i,
    "",
  );
  next = next.replace(/^The .+? ended after \d{4}\.[^.]*\.\s*/i, "");
  if (year != null) {
    next = next.replace(
      new RegExp(
        `^The ${year} .+? continues this nameplate in the MotoMediaX catalog\\.\\s*`,
        "i",
      ),
      "",
    );
  }
  return next.trim();
}

/** First useful prose sentence from a year description (skips catalog boilerplate). */
export function firstContentSentence(
  description: string | undefined | null,
  maxLen = 220,
): string | undefined {
  if (!description?.trim()) return undefined;
  const cleaned = stripCatalogLead(description);
  if (!cleaned) return undefined;

  const match = cleaned.match(/^(.+?[.!?])(?:\s|$)/);
  const sentence = (match?.[1] || cleaned).trim();
  if (sentence.length < 28) return undefined;
  return truncateAtSentence(sentence, maxLen);
}

/** Longest full <title> (including the " · MotoMediaX" suffix) we want in results. */
export const SEO_TITLE_MAX = 60;

/**
 * SEO / social title for a year page. The root layout template appends
 * " · MotoMediaX", so the *rendered* title is what must fit `SEO_TITLE_MAX`.
 * "year make model" always comes first; when the long suffix would push the
 * rendered title past the limit it is shortened to "Recalls & Specs".
 */
export function yearSeoTitle(input: {
  year: number;
  makeName: string;
  modelName: string;
  siteName?: string;
}): string {
  const { year, makeName, modelName, siteName = "MotoMediaX" } = input;
  const lead = `${year} ${makeName} ${modelName}`;
  const long = `${lead}: Recalls, Specs & Used Price Guide`;
  const rendered = `${long} \u00b7 ${siteName}`;
  return rendered.length > SEO_TITLE_MAX ? `${lead}: Recalls & Specs` : long;
}

/** SEO / social description for a year page — never a thin “offered in the U.S. market” stub. */
export function yearSeoDescription(input: {
  year: number;
  makeName: string;
  modelName: string;
  summary?: string;
  description?: string;
  siteName?: string;
  recallCount?: number;
}): string {
  const {
    year,
    makeName,
    modelName,
    summary,
    description,
    siteName = "MotoMediaX",
    recallCount,
  } = input;

  const lead = `${year} ${makeName} ${modelName}`;
  const recallBit =
    typeof recallCount === "number" && recallCount > 0
      ? `${recallCount} NHTSA recall${recallCount === 1 ? "" : "s"} on record.`
      : "";

  let body: string | undefined;
  if (summary && !isThinYearSummary(summary)) {
    if (/final u\.?s\.? catalog year/i.test(summary)) {
      const sentence = firstContentSentence(description, 180);
      if (
        sentence &&
        !/final model year covered/i.test(sentence) &&
        !/ended after \d{4}/i.test(sentence)
      ) {
        body = `${summary.replace(/\.$/, "")}. ${sentence}`;
      } else {
        body = summary;
      }
    } else {
      body = summary;
    }
  } else {
    const sentence = firstContentSentence(description, 200);
    if (sentence) {
      body = sentence.toLowerCase().startsWith(lead.toLowerCase())
        ? sentence
        : `${lead} — ${sentence}`;
    }
  }

  if (!body) {
    body = `${lead} — compare years, check recalls, and review specs on ${siteName}.`;
  }

  // Put vehicle context first so truncateAtSentence cannot stop at a short
  // leading "N recalls on record." sentence and drop the rest.
  const combined = recallBit
    ? body.toLowerCase().includes("nhtsa recall")
      ? body
      : `${body.replace(/\.$/, "")}. ${recallBit}`
    : body;
  return truncateAtSentence(combined, 300);
}

/** Display / stored summary when the catalog stub is too thin. */
export function enrichYearSummary(input: {
  year: number;
  makeName: string;
  modelName: string;
  summary?: string;
  description?: string;
}): string {
  if (input.summary && !isThinYearSummary(input.summary)) {
    return input.summary;
  }
  return yearSeoDescription(input);
}

/** True when text looks cut mid-sentence / mid-word (catalog blurb bug). */
export function looksTruncatedMidSentence(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/[.!?]["']?$/.test(t)) return false;
  if (/…$/.test(t)) return false;
  // Ends with a dangling function word or mid-word fragment.
  if (/\b(the|th|an|a|to|of|and|or|for|with|by)$/i.test(t)) return true;
  if (/[a-zA-Z,;:]$/.test(t)) return true;
  return false;
}

/**
 * Repair UTF-8 mojibake where em-dash / ellipsis bytes were replaced with `???`
 * (common when a catalog JSON is piped through a non-UTF-8 shell on Windows).
 */
export function repairUtf8Mojibake(text: string): string {
  if (!text.includes("???")) return text;
  return text
    .replace(/\)\?\?\?(?=\S)/g, ")—")
    .replace(/\?\?\?\s*$/g, "…")
    .replace(/\?\?\?/g, "—")
    .replace(/\s+/g, " ")
    .trim();
}

/** NHTSA recall text often splits nameplates ("RAV 4", "4 Runner"). */
const MODEL_NAME_FIXES: Array<[RegExp, string]> = [
  [/\bRAV[\s-]4\b/gi, "RAV4"],
  [/\b4[\s-]Runner\b/gi, "4Runner"],
];

/** Normalize split / mis-spaced model names inside NHTSA recall copy. */
export function normalizeModelNames(text: string): string {
  let next = text;
  for (const [re, replacement] of MODEL_NAME_FIXES) {
    next = next.replace(re, replacement);
  }
  return next;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "2026-09-22" or full ISO timestamp → "Sep 22, 2026" (timezone-independent). */
export function formatIsoDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return iso;
  return `${MONTHS[month - 1]} ${Number(m[3])}, ${m[1]}`;
}

/** [2021, 2022, 2023, 2025] → "2021–2023, 2025". */
export function formatYearRanges(years: number[]): string {
  const sorted = [...new Set(years)].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (i === sorted.length - 1 || sorted[i + 1] !== sorted[i] + 1) {
      parts.push(
        sorted[start] === sorted[i]
          ? String(sorted[i])
          : `${sorted[start]}–${sorted[i]}`,
      );
      start = i + 1;
    }
  }
  return parts.join(", ");
}

/** Meta description budget for brand/make pages (Google shows ~155–160 chars). */
export const META_DESCRIPTION_MAX = 155;
/** Below this length we top up a description with data-only filler sentences. */
export const META_DESCRIPTION_TARGET = 120;

/** Split prose into sentences without breaking on "U.S." style abbreviations. */
export function splitSentences(text: string): string[] {
  const masked = text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b([A-Z])\.(?=[A-Z]\.)/g, "$1\u0000")
    .replace(/\b([A-Z])\.(?=\s[a-z])/g, "$1\u0000")
    .replace(/\u0000/g, "\u0001");
  const parts = masked.match(/[^.!?]+(?:[.!?]+["']?|$)/g) ?? [];
  return parts
    .map((p) => p.replace(/\u0001/g, ".").trim())
    .filter(Boolean);
}

/**
 * Build a meta description within [target, max]: whole sentences from `body`
 * first (never mid-sentence unless the first sentence alone is too long), then
 * data-only `fillers` (tried in order) while the result is under `target`.
 */
export function composeMetaDescription(input: {
  body: string;
  fillers?: Array<string | undefined | null>;
  max?: number;
  target?: number;
}): string {
  const max = input.max ?? META_DESCRIPTION_MAX;
  const target = input.target ?? META_DESCRIPTION_TARGET;
  const normalized = input.body.replace(/\s+/g, " ").trim();

  let out = "";
  for (const sentence of splitSentences(normalized)) {
    const next = out ? `${out} ${sentence}` : sentence;
    if (next.length > max) break;
    out = next;
  }
  if (!out) out = truncateAtSentence(normalized, max);

  for (const raw of input.fillers ?? []) {
    if (out.length >= target) break;
    const filler = raw?.replace(/\s+/g, " ").trim();
    if (!filler || out.includes(filler)) continue;
    const next = `${out} ${filler}`;
    if (next.length <= max) out = next;
  }
  return out;
}

/** Meta description for a year page: 110–155 chars, vehicle context first. */
export function yearMetaDescription(
  input: Parameters<typeof yearSeoDescription>[0],
): string {
  const siteName = input.siteName ?? "MotoMediaX";
  const recallBit =
    typeof input.recallCount === "number" && input.recallCount > 0
      ? `${input.recallCount} NHTSA recall${input.recallCount === 1 ? "" : "s"} on record.`
      : undefined;
  return composeMetaDescription({
    body: yearSeoDescription(input),
    fillers: [
      recallBit,
      `Compare recalls, owner complaints, specs, and est. used price by year on ${siteName}.`,
      `See recalls, complaints, and specs on ${siteName}.`,
      `Recalls and specs on ${siteName}.`,
    ],
  });
}

/** Meta description for a model hub page: 110–155 chars, purpose first. */
export function modelHubSeoDescription(input: {
  makeName: string;
  modelName: string;
  yearRange?: string;
  tagline?: string;
  siteName?: string;
}): string {
  const { makeName, modelName, yearRange, tagline, siteName = "MotoMediaX" } =
    input;
  const core = `Compare ${makeName} ${modelName} model years${yearRange ? ` (${yearRange})` : ""} for NHTSA recalls, owner complaints, and year-over-year changes on ${siteName}.`;
  const taglineSentence = tagline?.trim()
    ? `${tagline.trim().replace(/\.$/, "")}.`
    : undefined;
  return composeMetaDescription({
    body: core,
    fillers: [
      taglineSentence,
      "Includes estimated used price by year.",
      "Includes est. used prices.",
    ],
  });
}

/**
 * Brand/make page meta description: used-buyer purpose first, then an
 * optional model list. Never exceeds `META_DESCRIPTION_MAX` and never
 * leads with founding history.
 */
export function makeSeoDescription(input: {
  makeName: string;
  modelNames: string[];
  yearMin?: number;
  yearMax?: number;
  siteName?: string;
  maxLen?: number;
}): string {
  const { makeName, modelNames, yearMin, yearMax, siteName = "MotoMediaX" } =
    input;
  const maxLen = input.maxLen ?? META_DESCRIPTION_MAX;
  const n = modelNames.length;
  const range =
    yearMin != null && yearMax != null
      ? yearMin === yearMax
        ? ` (${yearMin})`
        : ` (${yearMin}–${yearMax})`
      : "";
  const count = n > 0 ? `${n} ` : "";
  const noun = n === 1 ? "model" : "models";
  const purpose = `Used ${makeName} buyer guide: compare ${count}${noun}${range} by NHTSA recalls, owner complaints, and year-to-year changes on ${siteName}.`;

  let out = purpose;
  const picked: string[] = [];
  for (const name of modelNames) {
    const candidate = `${purpose} Models include ${[...picked, name].join(", ")}.`;
    if (candidate.length > maxLen) break;
    picked.push(name);
  }
  // A one-name list out of many reads as misleading; only list when it is
  // the whole lineup or at least two names.
  if (picked.length >= 2 || (picked.length === 1 && n === 1)) {
    out = `${purpose} Models include ${picked.join(", ")}.`;
  }
  return truncateAtSentence(out, maxLen);
}
