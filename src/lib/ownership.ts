/** Simple running-cost estimates for year pages (not quotes). */

export const OWNERSHIP_ASSUMPTIONS = {
  milesPerYear: 12_000,
  gasUsdPerGallon: 3.5,
  electricityUsdPerKwh: 0.16,
  /** Used when battery size is unknown for EVs. */
  defaultEvMilesPerKwh: 3.5,
  years: 5,
} as const;

export type OwnershipEstimate = {
  kind: "gas" | "ev";
  annualUsd: number;
  fiveYearUsd: number;
  /** Human-readable efficiency basis, e.g. "28 mpg" or "~3.5 mi/kWh". */
  efficiencyLabel: string;
  assumptionsLabel: string;
};

function roundMoney(n: number) {
  return Math.round(n);
}

export function estimateOwnershipCost(input: {
  mpgCombined?: number | null;
  rangeMiles?: number | null;
  batteryKwh?: number | null;
  /** Prefer EV math when true even if mpg is present (e.g. MPGe). */
  preferEv?: boolean;
}): OwnershipEstimate | null {
  const {
    milesPerYear,
    gasUsdPerGallon,
    electricityUsdPerKwh,
    defaultEvMilesPerKwh,
    years,
  } = OWNERSHIP_ASSUMPTIONS;

  const mpg = input.mpgCombined ?? undefined;
  const range = input.rangeMiles ?? undefined;
  const battery = input.batteryKwh ?? undefined;
  const looksEv =
    input.preferEv ||
    (range != null && range > 0) ||
    (battery != null && battery > 0);

  if (looksEv && (range != null || battery != null || input.preferEv)) {
    const miPerKwh =
      range != null && battery != null && battery > 0
        ? range / battery
        : defaultEvMilesPerKwh;
    if (!(miPerKwh > 0)) return null;
    const annualKwh = milesPerYear / miPerKwh;
    const annualUsd = annualKwh * electricityUsdPerKwh;
    return {
      kind: "ev",
      annualUsd: roundMoney(annualUsd),
      fiveYearUsd: roundMoney(annualUsd * years),
      efficiencyLabel:
        range != null && battery != null && battery > 0
          ? `~${miPerKwh.toFixed(1)} mi/kWh (${range} mi / ${battery} kWh)`
          : `~${defaultEvMilesPerKwh} mi/kWh (assumed)`,
      assumptionsLabel: `${milesPerYear.toLocaleString()} mi/yr · $${electricityUsdPerKwh.toFixed(2)}/kWh · ${years}-year horizon`,
    };
  }

  if (mpg != null && mpg > 0) {
    const annualGallons = milesPerYear / mpg;
    const annualUsd = annualGallons * gasUsdPerGallon;
    return {
      kind: "gas",
      annualUsd: roundMoney(annualUsd),
      fiveYearUsd: roundMoney(annualUsd * years),
      efficiencyLabel: `${mpg} mpg combined`,
      assumptionsLabel: `${milesPerYear.toLocaleString()} mi/yr · $${gasUsdPerGallon.toFixed(2)}/gal · ${years}-year horizon`,
    };
  }

  return null;
}

export function formatUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}
