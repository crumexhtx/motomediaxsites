import { valuationPartnerLabel, valuationUrl } from "@/lib/valuation";

type Props = {
  year: number;
  makeName: string;
  modelName: string;
};

/**
 * Affiliate-ready valuation CTA. Uses Edmunds appraisal (program available via
 * CJ / FlexOffers). Set NEXT_PUBLIC_EDMUNDS_AFFILIATE_ID when enrolled; until
 * then the link is a plain outbound with disclosure — never a fake estimate.
 */
export function YearValuationCta({ year, makeName, modelName }: Props) {
  const href = valuationUrl({ year, makeName, modelName });
  const partner = valuationPartnerLabel();

  return (
    <section className="mb-12 max-w-3xl rounded-lg border border-line bg-elevated/40 px-5 py-5 md:px-6">
      <h2 className="font-display text-xl tracking-tight md:text-2xl">
        Get a market valuation
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted md:text-base">
        We don&apos;t invent prices. Check what a {year} {makeName} {modelName}{" "}
        is trading for on {partner} — useful when deciding if a newer year is
        worth the jump.
      </p>
      <a
        href={href}
        className="focus-ring mt-4 inline-flex items-center rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-[#071018] transition hover:brightness-110"
        rel="noopener noreferrer sponsored"
        target="_blank"
      >
        Get an instant valuation
      </a>
      <p className="mt-3 text-xs text-muted">
        Opens {partner}. We may earn a referral commission if you use their
        tools — it doesn&apos;t change the price you see.
      </p>
    </section>
  );
}
