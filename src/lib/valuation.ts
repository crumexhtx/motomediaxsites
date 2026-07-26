/**
 * Outbound valuation links (affiliate-ready).
 *
 * Edmunds runs a public affiliate program (CJ / FlexOffers) for appraisal and
 * lead flows. We do not invent prices. When
 * `NEXT_PUBLIC_EDMUNDS_AFFILIATE_ID` is set, it is appended as a tracking
 * query param; otherwise the CTA is a plain Edmunds appraisal deep link.
 *
 * KBB Instant Cash / valuation affiliate availability was not confirmed as a
 * simple public deep-link program for this pivot — prefer Edmunds for now.
 */

export type ValuationTarget = {
  year: number;
  makeName: string;
  modelName: string;
};

function slugSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function valuationPartnerLabel(): string {
  return "Edmunds";
}

export function valuationUrl(target: ValuationTarget): string {
  // Edmunds appraisal hub accepts make/model/year context via query when present.
  const url = new URL("https://www.edmunds.com/appraisal/");
  url.searchParams.set("make", target.makeName);
  url.searchParams.set("model", target.modelName);
  url.searchParams.set("year", String(target.year));
  url.searchParams.set("utm_source", "motomediax");
  url.searchParams.set("utm_medium", "referral");
  url.searchParams.set(
    "utm_campaign",
    `valuation-${slugSegment(target.makeName)}-${slugSegment(target.modelName)}-${target.year}`,
  );

  const affiliateId = process.env.NEXT_PUBLIC_EDMUNDS_AFFILIATE_ID?.trim();
  if (affiliateId) {
    // Network-specific param names vary; CJ often uses `sid` / click tracking
    // after enrollment. Keep a stable custom param until the network ID is set.
    url.searchParams.set("afid", affiliateId);
  }

  return url.toString();
}
