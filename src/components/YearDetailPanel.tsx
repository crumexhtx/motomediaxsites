"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { TrimSpec, VehicleSpecs, YearPerformance } from "@/data/catalog";

type Props = {
  yearLabel: string;
  performance?: YearPerformance;
  specs?: VehicleSpecs;
  nhtsaUrl?: string;
  epaUrl?: string;
  /** Controlled trim selection (when provided with onTrimChange). */
  trimId?: string;
  onTrimChange?: (id: string) => void;
};

function fmt(value: number | string | undefined, suffix = "") {
  if (value === undefined || value === null || value === "") return null;
  return `${value}${suffix}`;
}

function StatBadge({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  if (!value) return null;
  return (
    <div className="min-w-0 rounded-lg border border-line bg-elevated/80 px-4 py-3">
      <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-xl tracking-tight md:text-2xl">
        {value}
      </p>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 border-b border-line/60 py-2.5 text-sm last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function Section({
  title,
  children,
  empty,
  className = "",
}: {
  title: string;
  children: ReactNode;
  empty?: boolean;
  className?: string;
}) {
  if (empty) return null;
  return (
    <section className={className}>
      <h2 className="font-display text-2xl tracking-tight">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function hasAny(...values: Array<string | null | undefined | false>) {
  return values.some(Boolean);
}

export function YearDetailPanel({
  yearLabel,
  performance,
  specs,
  nhtsaUrl,
  epaUrl,
  trimId: controlledTrimId,
  onTrimChange,
}: Props) {
  const trims = useMemo(() => performance?.trims ?? [], [performance?.trims]);
  const initialId =
    performance?.defaultTrimId &&
    trims.some((t) => t.id === performance.defaultTrimId)
      ? performance.defaultTrimId
      : trims[0]?.id;

  const [internalTrimId, setInternalTrimId] = useState(initialId);
  const trimId = controlledTrimId ?? internalTrimId;
  const setTrimId = (id: string) => {
    onTrimChange?.(id);
    if (controlledTrimId === undefined) setInternalTrimId(id);
  };
  const trim: TrimSpec | undefined = useMemo(
    () => trims.find((t) => t.id === trimId) ?? trims[0],
    [trims, trimId],
  );

  const hp = fmt(trim?.horsepower, " hp");
  const torque = fmt(trim?.torqueLbFt, " lb-ft");
  const zeroSixty = fmt(trim?.zeroToSixtySec, " s");
  const mpg =
    trim?.mpgCombined != null
      ? `${trim.mpgCombined} mpg`
      : specs?.mpgCombined != null
        ? `${specs.mpgCombined} mpg`
        : null;
  const range = fmt(trim?.rangeMiles ?? specs?.rangeMiles, " mi");

  const heroHasStats = hasAny(hp, torque, zeroSixty, mpg, range);

  const mechHas = hasAny(
    trim?.engine,
    trim?.aspiration,
    trim?.transmission,
    trim?.drivetrain ?? specs?.driveType,
    fmt(trim?.redlineRpm, " rpm"),
    specs?.fuelTypePrimary,
    specs?.electrificationLevel,
  );

  const dimHas = hasAny(
    fmt(specs?.overallLengthIn, " in"),
    fmt(specs?.overallWidthIn, " in"),
    fmt(specs?.overallHeightIn, " in"),
    fmt(specs?.wheelbaseIn, " in"),
    fmt(trim?.groundClearanceIn ?? specs?.groundClearanceIn, " in"),
    fmt(specs?.curbWeightLb ?? trim?.curbWeightLb, " lb"),
    fmt(trim?.seatingCapacity ?? specs?.seatingCapacity),
    fmt(trim?.cargoCuFt ?? specs?.cargoCuFt, " cu ft"),
    fmt(trim?.cargoSeatsFoldedCuFt ?? specs?.cargoSeatsFoldedCuFt, " cu ft"),
    fmt(trim?.towingLb ?? specs?.towingLb, " lb"),
  );

  const effHas = hasAny(
    fmt(trim?.mpgCity ?? specs?.mpgCity),
    fmt(trim?.mpgHighway ?? specs?.mpgHighway),
    fmt(trim?.mpgCombined ?? specs?.mpgCombined),
    fmt(trim?.batteryKwh ?? specs?.batteryKwh, " kWh"),
    fmt(trim?.rangeMiles ?? specs?.rangeMiles, " mi"),
    fmt(trim?.fuelTankGal ?? specs?.fuelTankGal, " gal"),
  );

  const safetyHas = hasAny(
    specs?.overallRating,
    specs?.frontCrashRating,
    specs?.sideCrashRating,
    specs?.rolloverRating,
  );

  if (!heroHasStats && !mechHas && !dimHas && !effHas && !safetyHas && !trims.length) {
    return null;
  }

  return (
    <div>
      {trims.length > 1 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-xs uppercase tracking-[0.16em] text-muted">
            Trim
          </h2>
          <div className="flex flex-wrap gap-2">
            {trims.map((t) => {
              const active = t.id === (trim?.id ?? trimId);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTrimId(t.id)}
                  aria-pressed={active}
                  className={
                    active
                      ? "focus-ring flex max-w-[11rem] flex-col overflow-hidden rounded-md border border-accent bg-[var(--accent-soft)] text-left text-sm"
                      : "focus-ring flex max-w-[11rem] flex-col overflow-hidden rounded-md border border-line bg-elevated/50 text-left text-sm text-muted transition hover:border-accent/50 hover:text-foreground"
                  }
                >
                  {t.name}
                </button>
              );
            })}
          </div>
          {trim?.notes ? (
            <p className="mt-3 text-sm text-muted">{trim.notes}</p>
          ) : null}
        </section>
      ) : trim?.notes ? (
        <p className="mb-6 text-sm text-muted">{trim.notes}</p>
      ) : null}

      <Section
        title={`${yearLabel} at a glance`}
        empty={!heroHasStats}
        className="mb-10"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          <StatBadge label="Horsepower" value={hp} />
          <StatBadge label="Torque" value={torque} />
          <StatBadge label="0–60" value={zeroSixty} />
          <StatBadge label="Combined MPG" value={mpg} />
          <StatBadge label="EV range" value={range} />
        </div>
      </Section>

      <div className="mb-10 grid gap-10 md:grid-cols-2 md:gap-x-12 md:gap-y-10">
        <Section title="Mechanical" empty={!mechHas}>
          <dl>
            <SpecRow label="Engine" value={trim?.engine ?? null} />
            <SpecRow label="Aspiration" value={trim?.aspiration ?? null} />
            <SpecRow label="Transmission" value={trim?.transmission ?? null} />
            <SpecRow
              label="Drivetrain"
              value={trim?.drivetrain ?? specs?.driveType ?? null}
            />
            <SpecRow
              label="Redline"
              value={fmt(trim?.redlineRpm, " rpm")}
            />
            <SpecRow
              label="Fuel type"
              value={specs?.fuelTypePrimary ?? null}
            />
            <SpecRow
              label="Electrification"
              value={specs?.electrificationLevel ?? null}
            />
          </dl>
        </Section>

        <Section title="Dimensions & capacity" empty={!dimHas}>
          <dl>
            <SpecRow
              label="Length"
              value={fmt(specs?.overallLengthIn, " in")}
            />
            <SpecRow
              label="Width"
              value={fmt(specs?.overallWidthIn, " in")}
            />
            <SpecRow
              label="Height"
              value={fmt(specs?.overallHeightIn, " in")}
            />
            <SpecRow label="Wheelbase" value={fmt(specs?.wheelbaseIn, " in")} />
            <SpecRow
              label="Ground clearance"
              value={fmt(
                trim?.groundClearanceIn ?? specs?.groundClearanceIn,
                " in",
              )}
            />
            <SpecRow
              label="Curb weight"
              value={fmt(specs?.curbWeightLb ?? trim?.curbWeightLb, " lb")}
            />
            <SpecRow
              label="Seating"
              value={fmt(trim?.seatingCapacity ?? specs?.seatingCapacity)}
            />
            <SpecRow
              label="Cargo (seats up)"
              value={fmt(trim?.cargoCuFt ?? specs?.cargoCuFt, " cu ft")}
            />
            <SpecRow
              label="Cargo (seats folded)"
              value={fmt(
                trim?.cargoSeatsFoldedCuFt ?? specs?.cargoSeatsFoldedCuFt,
                " cu ft",
              )}
            />
            <SpecRow
              label="Towing"
              value={fmt(trim?.towingLb ?? specs?.towingLb, " lb")}
            />
          </dl>
        </Section>

        <Section title="Efficiency" empty={!effHas}>
          <dl>
            <SpecRow
              label="City MPG"
              value={fmt(trim?.mpgCity ?? specs?.mpgCity)}
            />
            <SpecRow
              label="Highway MPG"
              value={fmt(trim?.mpgHighway ?? specs?.mpgHighway)}
            />
            <SpecRow
              label="Combined MPG"
              value={fmt(trim?.mpgCombined ?? specs?.mpgCombined)}
            />
            <SpecRow
              label="Battery"
              value={fmt(trim?.batteryKwh ?? specs?.batteryKwh, " kWh")}
            />
            <SpecRow
              label="Electric range"
              value={fmt(trim?.rangeMiles ?? specs?.rangeMiles, " mi")}
            />
            <SpecRow
              label="Fuel tank"
              value={fmt(trim?.fuelTankGal ?? specs?.fuelTankGal, " gal")}
            />
          </dl>
          {epaUrl ? (
            <p className="mt-3 text-sm text-muted">
              Efficiency figures are curated / EPA-oriented. Verify on{" "}
              <a
                href={epaUrl}
                className="underline-offset-2 hover:underline"
                rel="noreferrer"
                target="_blank"
              >
                FuelEconomy.gov
              </a>
              .
            </p>
          ) : null}
        </Section>

        <Section title="Safety ratings" empty={!safetyHas}>
          <dl>
            <SpecRow
              label="Overall"
              value={
                specs?.overallRating ? `${specs.overallRating} / 5` : null
              }
            />
            <SpecRow
              label="Front crash"
              value={
                specs?.frontCrashRating
                  ? `${specs.frontCrashRating} / 5`
                  : null
              }
            />
            <SpecRow
              label="Side crash"
              value={
                specs?.sideCrashRating ? `${specs.sideCrashRating} / 5` : null
              }
            />
            <SpecRow
              label="Rollover"
              value={
                specs?.rolloverRating ? `${specs.rolloverRating} / 5` : null
              }
            />
            <SpecRow
              label="Rated configuration"
              value={specs?.vehicleDescription ?? null}
            />
          </dl>
          {nhtsaUrl ? (
            <p className="mt-3 text-sm text-muted">
              Safety from{" "}
              <a
                href={nhtsaUrl}
                className="underline-offset-2 hover:underline"
                rel="noreferrer"
                target="_blank"
              >
                NHTSA
              </a>
              ; dimensions from vPIC where available.
            </p>
          ) : null}
        </Section>
      </div>

      {trims.length > 0 ? (
        <section className="mb-10">
          <h2 className="font-display text-2xl tracking-tight">Trim index</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted">
                  <th className="py-2 pr-4 font-medium">Trim</th>
                  <th className="py-2 pr-4 font-medium">HP</th>
                  <th className="py-2 pr-4 font-medium">Torque</th>
                  <th className="py-2 pr-4 font-medium">0–60</th>
                  <th className="py-2 pr-4 font-medium">MPG</th>
                  <th className="py-2 font-medium">Drivetrain</th>
                </tr>
              </thead>
              <tbody>
                {trims.map((t) => {
                  const active = t.id === trim?.id;
                  return (
                    <tr
                      key={t.id}
                      className={
                        active
                          ? "border-b border-line/60 bg-[var(--accent-soft)]"
                          : "border-b border-line/60"
                      }
                    >
                      <td className="py-2.5 pr-4">
                        <button
                          type="button"
                          onClick={() => setTrimId(t.id)}
                          aria-pressed={active}
                          className="focus-ring text-left underline-offset-2 hover:underline"
                        >
                          {t.name}
                        </button>
                      </td>
                      <td className="py-2.5 pr-4 tabular-nums">
                        {t.horsepower ?? "—"}
                      </td>
                      <td className="py-2.5 pr-4 tabular-nums">
                        {t.torqueLbFt ?? "—"}
                      </td>
                      <td className="py-2.5 pr-4 tabular-nums">
                        {t.zeroToSixtySec != null
                          ? `${t.zeroToSixtySec}s`
                          : "—"}
                      </td>
                      <td className="py-2.5 pr-4 tabular-nums">
                        {t.mpgCombined ?? "—"}
                      </td>
                      <td className="py-2.5">{t.drivetrain ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
