/** Simple running-cost estimates for year pages (not quotes). */

export const OWNERSHIP_ASSUMPTIONS = {
  milesPerYear: 12_000,
  gasUsdPerGallon: 3.5,
  electricityUsdPerKwh: 0.16,
  /** Used when battery size is unknown for pure BEVs. */
  defaultEvMilesPerKwh: 3.5,
  years: 5,
} as const;

export type OwnershipKind = "gas" | "hybrid" | "phev" | "ev";

export type OwnershipEstimate = {
  kind: OwnershipKind;
  annualUsd: number;
  fiveYearUsd: number;
  /** Human-readable efficiency basis, e.g. "28 mpg" or "~3.5 mi/kWh". */
  efficiencyLabel: string;
  assumptionsLabel: string;
};

function roundMoney(n: number) {
  return Math.round(n);
}

function blobOf(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

/**
 * Classify powertrain for cost math.
 * PHEV/hybrid with combined MPG use gas estimates (not all-electric).
 * Pure BEV uses electricity.
 */
export function resolvePowertrainKind(input: {
  mpgCombined?: number | null;
  rangeMiles?: number | null;
  batteryKwh?: number | null;
  fuelTypePrimary?: string | null;
  electrificationLevel?: string | null;
  engine?: string | null;
  aspiration?: string | null;
}): OwnershipKind | null {
  const blob = blobOf([
    input.fuelTypePrimary,
    input.electrificationLevel,
    input.engine,
    input.aspiration,
  ]);
  const mpg = input.mpgCombined ?? undefined;
  const range = input.rangeMiles ?? undefined;
  const battery = input.batteryKwh ?? undefined;

  const isPhev = /\bphev\b|plug[- ]?in/.test(blob);
  const isHybrid = /\bhybrid\b/.test(blob) && !isPhev;
  const isBev =
    /\bbattery electric\b|\bbev\b/.test(blob) ||
    (/^electric$|\belectric\b/.test(String(input.fuelTypePrimary ?? "").toLowerCase()) &&
      !isPhev &&
      !isHybrid) ||
    (/electric/i.test(input.engine ?? "") &&
      !mpg &&
      (range != null || battery != null) &&
      !isPhev &&
      !isHybrid);

  if (isBev) return "ev";
  if (isPhev) return mpg != null && mpg > 0 ? "phev" : range != null || battery != null ? "phev" : null;
  if (isHybrid) return mpg != null && mpg > 0 ? "hybrid" : null;
  if (mpg != null && mpg > 0) return "gas";
  if ((range != null && range > 0) || (battery != null && battery > 0)) return "ev";
  return null;
}

export function estimateOwnershipCost(input: {
  mpgCombined?: number | null;
  rangeMiles?: number | null;
  batteryKwh?: number | null;
  fuelTypePrimary?: string | null;
  electrificationLevel?: string | null;
  engine?: string | null;
  aspiration?: string | null;
  /** @deprecated Prefer powertrain fields; kept for call-site compat. */
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

  let kind = resolvePowertrainKind(input);
  // Legacy preferEv only forces EV when there is no usable gas MPG.
  if (!kind && input.preferEv && (range != null || battery != null || input.preferEv)) {
    kind = mpg != null && mpg > 0 ? "gas" : "ev";
  }
  if (input.preferEv && kind === "gas" && !(mpg != null && mpg > 0)) {
    kind = "ev";
  }

  if (!kind) return null;

  if (kind === "ev") {
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

  // gas | hybrid | phev — bill fuel at combined MPG when available.
  if (mpg == null || !(mpg > 0)) {
    // PHEV without MPG: don't pretend full-EV annual miles.
    return null;
  }
  const annualGallons = milesPerYear / mpg;
  const annualUsd = annualGallons * gasUsdPerGallon;
  const kindLabel =
    kind === "phev"
      ? `${mpg} mpg combined (PHEV gas estimate; electric range not modeled)`
      : kind === "hybrid"
        ? `${mpg} mpg combined (hybrid)`
        : `${mpg} mpg combined`;
  return {
    kind,
    annualUsd: roundMoney(annualUsd),
    fiveYearUsd: roundMoney(annualUsd * years),
    efficiencyLabel: kindLabel,
    assumptionsLabel: `${milesPerYear.toLocaleString()} mi/yr · $${gasUsdPerGallon.toFixed(2)}/gal · ${years}-year horizon`,
  };
}

export function formatUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}
