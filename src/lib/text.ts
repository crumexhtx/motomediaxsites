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

/** SEO / social description for a year page — never a thin “offered in the U.S. market” stub. */
export function yearSeoDescription(input: {
  year: number;
  makeName: string;
  modelName: string;
  summary?: string;
  description?: string;
  siteName?: string;
}): string {
  const {
    year,
    makeName,
    modelName,
    summary,
    description,
    siteName = "MotoMediaX",
  } = input;

  if (summary && !isThinYearSummary(summary)) {
    // Final-year stubs are intentional but thin for search — append wiki prose.
    if (/final u\.?s\.? catalog year/i.test(summary)) {
      const sentence = firstContentSentence(description, 200);
      if (
        sentence &&
        !/final model year covered/i.test(sentence) &&
        !/ended after \d{4}/i.test(sentence)
      ) {
        return truncateAtSentence(
          `${summary.replace(/\.$/, "")}. ${sentence}`,
          300,
        );
      }
    }
    return truncateAtSentence(summary, 300);
  }

  const sentence = firstContentSentence(description, 220);
  if (sentence) {
    const lead = `${year} ${makeName} ${modelName}`;
    if (sentence.toLowerCase().startsWith(lead.toLowerCase())) {
      return truncateAtSentence(sentence, 300);
    }
    return truncateAtSentence(`${lead} — ${sentence}`, 300);
  }

  return `${year} ${makeName} ${modelName} photos, overview, and specs on ${siteName}.`;
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
