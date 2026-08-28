"use client";

import { useId, useMemo, useState } from "react";
import {
  estimateOwnershipCost,
  formatUsd,
  OWNERSHIP_ASSUMPTIONS,
  type OwnershipKind,
} from "@/lib/ownership";

export type OwnershipCostCalculatorProps = {
  yearLabel: string;
  mpgCombined?: number | null;
  rangeMiles?: number | null;
  batteryKwh?: number | null;
  fuelTypePrimary?: string | null;
  electrificationLevel?: string | null;
  engine?: string | null;
  aspiration?: string | null;
};

function powertrainLabel(kind: OwnershipKind) {
  switch (kind) {
    case "ev":
      return "Battery electric";
    case "phev":
      return "Plug-in hybrid";
    case "hybrid":
      return "Hybrid";
    default:
      return "Gas";
  }
}

const inputClass =
  "focus-ring w-full rounded-md border border-line bg-elevated px-3 py-2 text-sm tabular-nums outline-none";

/**
 * Interactive energy-cost estimate for the selected trim.
 * Uses catalog efficiency; user controls miles, horizon, and local energy price.
 */
export function OwnershipCostCalculator({
  yearLabel,
  mpgCombined,
  rangeMiles,
  batteryKwh,
  fuelTypePrimary,
  electrificationLevel,
  engine,
  aspiration,
}: OwnershipCostCalculatorProps) {
  const baseId = useId();
  const [milesPerYear, setMilesPerYear] = useState(
    OWNERSHIP_ASSUMPTIONS.milesPerYear,
  );
  const [years, setYears] = useState(OWNERSHIP_ASSUMPTIONS.years);
  const [gasUsdPerGallon, setGasUsdPerGallon] = useState(
    OWNERSHIP_ASSUMPTIONS.gasUsdPerGallon,
  );
  const [electricityUsdPerKwh, setElectricityUsdPerKwh] = useState(
    OWNERSHIP_ASSUMPTIONS.electricityUsdPerKwh,
  );

  const vehicle = useMemo(
    () => ({
      mpgCombined,
      rangeMiles,
      batteryKwh,
      fuelTypePrimary,
      electrificationLevel,
      engine,
      aspiration,
    }),
    [
      mpgCombined,
      rangeMiles,
      batteryKwh,
      fuelTypePrimary,
      electrificationLevel,
      engine,
      aspiration,
    ],
  );

  const ownership = useMemo(
    () =>
      estimateOwnershipCost({
        ...vehicle,
        assumptions: {
          milesPerYear: Math.max(1, milesPerYear || 0),
          years: Math.max(1, Math.min(15, years || 1)),
          gasUsdPerGallon: Math.max(0.01, gasUsdPerGallon || 0),
          electricityUsdPerKwh: Math.max(0.01, electricityUsdPerKwh || 0),
        },
      }),
    [vehicle, milesPerYear, years, gasUsdPerGallon, electricityUsdPerKwh],
  );

  if (!ownership) return null;

  const isEv = ownership.kind === "ev";
  const defaults =
    milesPerYear === OWNERSHIP_ASSUMPTIONS.milesPerYear &&
    years === OWNERSHIP_ASSUMPTIONS.years &&
    gasUsdPerGallon === OWNERSHIP_ASSUMPTIONS.gasUsdPerGallon &&
    electricityUsdPerKwh === OWNERSHIP_ASSUMPTIONS.electricityUsdPerKwh;

  const reset = () => {
    setMilesPerYear(OWNERSHIP_ASSUMPTIONS.milesPerYear);
    setYears(OWNERSHIP_ASSUMPTIONS.years);
    setGasUsdPerGallon(OWNERSHIP_ASSUMPTIONS.gasUsdPerGallon);
    setElectricityUsdPerKwh(OWNERSHIP_ASSUMPTIONS.electricityUsdPerKwh);
  };

  return (
    <section className="mb-10 max-w-2xl">
      <h2 className="font-display text-2xl tracking-tight">
        What will fuel or charging roughly cost?
      </h2>
      <p className="mt-2 text-sm text-muted">
        Adjust your miles and local energy price for the {yearLabel} selected
        trim ({ownership.efficiencyLabel}). Energy only — not insurance, tires,
        or a VIN appraisal.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <label className="block text-sm" htmlFor={`${baseId}-miles`}>
          <span className="mb-1.5 block text-xs uppercase tracking-[0.14em] text-muted">
            Miles / year
          </span>
          <input
            id={`${baseId}-miles`}
            type="number"
            min={1_000}
            max={50_000}
            step={500}
            value={milesPerYear}
            onChange={(e) => setMilesPerYear(Number(e.target.value) || 0)}
            className={inputClass}
          />
        </label>
        <label className="block text-sm" htmlFor={`${baseId}-years`}>
          <span className="mb-1.5 block text-xs uppercase tracking-[0.14em] text-muted">
            Years kept
          </span>
          <input
            id={`${baseId}-years`}
            type="number"
            min={1}
            max={15}
            step={1}
            value={years}
            onChange={(e) => setYears(Number(e.target.value) || 1)}
            className={inputClass}
          />
        </label>
        {isEv ? (
          <label className="block text-sm" htmlFor={`${baseId}-kwh`}>
            <span className="mb-1.5 block text-xs uppercase tracking-[0.14em] text-muted">
              Electricity ($/kWh)
            </span>
            <input
              id={`${baseId}-kwh`}
              type="number"
              min={0.05}
              max={0.8}
              step={0.01}
              value={electricityUsdPerKwh}
              onChange={(e) =>
                setElectricityUsdPerKwh(Number(e.target.value) || 0)
              }
              className={inputClass}
            />
          </label>
        ) : (
          <label className="block text-sm" htmlFor={`${baseId}-gas`}>
            <span className="mb-1.5 block text-xs uppercase tracking-[0.14em] text-muted">
              Fuel ($/gal)
            </span>
            <input
              id={`${baseId}-gas`}
              type="number"
              min={1}
              max={10}
              step={0.1}
              value={gasUsdPerGallon}
              onChange={(e) =>
                setGasUsdPerGallon(Number(e.target.value) || 0)
              }
              className={inputClass}
            />
          </label>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-md border border-line bg-elevated/50 px-3 py-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
            Per year
          </p>
          <p className="mt-1 font-display text-2xl tracking-tight tabular-nums">
            {formatUsd(ownership.annualUsd)}
          </p>
        </div>
        <div className="rounded-md border border-line bg-elevated/50 px-3 py-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
            {ownership.horizonYears}-year energy
          </p>
          <p className="mt-1 font-display text-2xl tracking-tight tabular-nums text-accent">
            {formatUsd(ownership.horizonUsd)}
          </p>
        </div>
      </div>

      <dl className="mt-4 divide-y divide-line/60 border-y border-line/60">
        <div className="flex justify-between gap-4 py-2 text-sm">
          <dt className="text-muted">Powertrain</dt>
          <dd className="text-right">{powertrainLabel(ownership.kind)}</dd>
        </div>
        <div className="flex justify-between gap-4 py-2 text-sm">
          <dt className="text-muted">Based on</dt>
          <dd className="max-w-[65%] text-right">{ownership.efficiencyLabel}</dd>
        </div>
        <div className="flex justify-between gap-4 py-2 text-sm">
          <dt className="text-muted">Your inputs</dt>
          <dd className="max-w-[65%] text-right tabular-nums">
            {ownership.assumptionsLabel}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">
          Compare signal only — local rates and driving mix will differ.
        </p>
        {!defaults ? (
          <button
            type="button"
            onClick={reset}
            className="focus-ring text-xs text-accent underline-offset-2 hover:underline"
          >
            Reset to defaults
          </button>
        ) : null}
      </div>
    </section>
  );
}
