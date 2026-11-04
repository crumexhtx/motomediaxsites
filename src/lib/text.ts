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

/** SEO / social title for a year page (root layout template appends · MotoMediaX). */
export function yearSeoTitle(input: {
  year: number;
  makeName: string;
  modelName: string;
}): string {
  return `${input.year} ${input.makeName} ${input.modelName}: Recalls, Specs & Used Price Guide`;
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
