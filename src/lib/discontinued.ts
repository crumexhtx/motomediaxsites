import discontinued from "@/data/discontinued.json";

export type DiscontinuedInfo = {
  lastYear: number;
  /** Ghost catalog years that should 301 to lastYear. */
  ghostYears?: number[];
  message: string;
  /** Show discontinued banner on year pages (default true). */
  banner?: boolean;
};

export function shouldShowDiscontinuedBanner(
  info: DiscontinuedInfo | undefined,
): boolean {
  return Boolean(info && info.banner !== false);
}

const BY_KEY = discontinued as Record<string, DiscontinuedInfo>;

function key(makeSlug: string, modelSlug: string) {
  return `${makeSlug.toLowerCase()}/${modelSlug.toLowerCase()}`;
}

export function getDiscontinuedInfo(
  makeSlug: string,
  modelSlug: string,
): DiscontinuedInfo | undefined {
  return BY_KEY[key(makeSlug, modelSlug)];
}

/** If this year is a ghost year, return the last real year to redirect to. */
export function ghostYearRedirectTarget(
  makeSlug: string,
  modelSlug: string,
  yearSlug: string,
): number | undefined {
  const info = getDiscontinuedInfo(makeSlug, modelSlug);
  if (!info?.ghostYears?.length) return undefined;
  const year = Number.parseInt(yearSlug, 10);
  if (!Number.isFinite(year)) return undefined;
  if (!info.ghostYears.includes(year)) return undefined;
  return info.lastYear;
}
