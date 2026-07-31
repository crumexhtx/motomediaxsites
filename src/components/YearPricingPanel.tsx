import {
  formatRetainedPct,
  formatUsd,
  type YearPricing,
} from "@/lib/pricing";
import { valuationPartnerLabel, valuationUrl } from "@/lib/valuation";

type Props = {
  pricing: YearPricing;
  year: number;
  makeName: string;
  modelName: string;
};

/**
 * Original MSRP vs typical used asking, plus outbound valuation CTA.
 * Listing averages are preferred; retention estimates are clearly labeled.
 */
export function YearPricingPanel({
  pricing,
  year,
  makeName,
  modelName,
}: Props) {
  const href = valuationUrl({ year, makeName, modelName });
  const partner = valuationPartnerLabel();
  const retainedLabel = formatRetainedPct(pricing.retainedPct);
  const usedWider = Math.min(100, Math.round(pricing.retainedPct * 100));

  return (
    <section className="mb-12 max-w-3xl rounded-lg border border-line bg-elevated/40 px-5 py-5 md:px-6">
      <h2 className="font-display text-xl tracking-tight md:text-2xl">
        How much does a used {year} {modelName} cost vs original MSRP?
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted md:text-base">
        Expect about {formatUsd(pricing.usedAverage)} in typical used asking
        against a {formatUsd(pricing.msrpBase)} starting MSRP — roughly{" "}
        {retainedLabel} retained
        {pricing.method === "listing-average"
          ? " based on dealer listing samples"
          : " on our labeled retention estimate"}
        . Use that gap to decide whether a newer year is worth the jump.
      </p>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="border-b border-line/60 pb-3 sm:border-b-0 sm:pb-0">
          <dt className="text-xs uppercase tracking-[0.14em] text-muted">
            Original MSRP
          </dt>
          <dd className="mt-1 font-display text-2xl tracking-tight tabular-nums">
            {formatUsd(pricing.msrpBase)}
          </dd>
          <dd className="mt-1 text-xs text-muted">{pricing.msrpNote}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-muted">
            {pricing.method === "listing-average"
              ? "Avg. used asking"
              : "Est. used asking"}
          </dt>
          <dd className="mt-1 font-display text-2xl tracking-tight tabular-nums text-accent">
            {formatUsd(pricing.usedAverage)}
          </dd>
          <dd className="mt-1 text-xs text-muted">
            {pricing.usedNote}
            {pricing.sampleSize
              ? ` Sample size: ${pricing.sampleSize}.`
              : ""}{" "}
            As of {pricing.asOf}.
          </dd>
        </div>
      </dl>

      <div className="mt-5">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <p className="text-muted">
            Retains about{" "}
            <span className="font-medium text-foreground">{retainedLabel}</span>{" "}
            of MSRP
          </p>
          <p className="tabular-nums text-muted">
            ~{formatUsd(pricing.depreciationUsd)} below MSRP
          </p>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-soft"
          role="img"
          aria-label={`Used asking is about ${retainedLabel} of original MSRP`}
        >
          <div
            className="h-full rounded-full bg-accent transition-[width]"
            style={{ width: `${usedWider}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[11px] uppercase tracking-[0.12em] text-muted">
          <span>$0</span>
          <span>MSRP {formatUsd(pricing.msrpBase)}</span>
        </div>
      </div>

      <a
        href={href}
        className="focus-ring mt-5 inline-flex items-center rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-[#071018] transition hover:brightness-110"
        rel="noopener noreferrer sponsored"
        target="_blank"
      >
        Get a live valuation on {partner}
      </a>
      <p className="mt-3 text-xs text-muted">
        Opens {partner}. We may earn a referral commission if you use their
        tools — it doesn&apos;t change the price you see. Figures above are
        model-year starting MSRP and typical asking, not a guaranteed sale
        price for a specific VIN.
      </p>
    </section>
  );
}
