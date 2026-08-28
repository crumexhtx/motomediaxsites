"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import {
  clampMinMpg,
  filterModelsByMinMpg,
  type EfficiencyCandidate,
  type EfficiencyMpgBounds,
} from "@/lib/efficiency";

function powertrainLabel(
  kind: EfficiencyCandidate["powertrain"],
): string | null {
  switch (kind) {
    case "ev":
      return "EV";
    case "phev":
      return "PHEV";
    case "hybrid":
      return "Hybrid";
    case "gas":
      return "Gas";
    default:
      return null;
  }
}

type Props = {
  candidates: EfficiencyCandidate[];
  bounds: EfficiencyMpgBounds;
  initialMinMpg: number;
};

export function EfficiencyFinder({
  candidates,
  bounds,
  initialMinMpg,
}: Props) {
  const sliderId = useId();
  const [minMpg, setMinMpg] = useState(() =>
    clampMinMpg(initialMinMpg, bounds),
  );

  const results = useMemo(
    () => filterModelsByMinMpg(candidates, minMpg),
    [candidates, minMpg],
  );

  useEffect(() => {
    const url = new URL(window.location.href);
    if (String(minMpg) === url.searchParams.get("minMpg")) return;
    url.searchParams.set("minMpg", String(minMpg));
    window.history.replaceState(null, "", `${url.pathname}?${url.searchParams}`);
  }, [minMpg]);

  if (!candidates.length) {
    return (
      <p className="mt-10 text-muted">
        No combined MPG figures are in the catalog yet. Enrich EPA data, then
        refresh this tool.
      </p>
    );
  }

  return (
    <div className="mt-10">
      <div className="max-w-xl rounded-lg border border-line bg-elevated/40 px-5 py-5 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted">
              Minimum combined MPG
            </p>
            <p className="mt-1 font-display text-4xl tracking-tight tabular-nums text-accent">
              {minMpg}
              <span className="ml-1 text-lg text-muted">mpg+</span>
            </p>
          </div>
          <p className="text-sm text-muted">
            <span className="font-medium tabular-nums text-foreground">
              {results.length}
            </span>{" "}
            {results.length === 1 ? "model" : "models"}
          </p>
        </div>

        <label className="mt-5 block" htmlFor={sliderId}>
          <span className="sr-only">
            Minimum combined MPG from {bounds.min} to {bounds.max}
          </span>
          <input
            id={sliderId}
            type="range"
            min={bounds.min}
            max={bounds.max}
            step={1}
            value={minMpg}
            onChange={(e) =>
              setMinMpg(clampMinMpg(Number(e.target.value), bounds))
            }
            className="efficiency-slider w-full cursor-pointer"
          />
        </label>
        <div className="mt-1 flex justify-between text-[11px] uppercase tracking-[0.12em] text-muted">
          <span>{bounds.min} mpg</span>
          <span>{bounds.max} mpg</span>
        </div>
      </div>

      <p className="mt-4 max-w-2xl text-xs text-muted">
        Shows the newest model year in our catalog that meets or exceeds your
        number, using the best published combined MPG for that year (trim or
        year specs). Not real-world driving.
      </p>

      {results.length === 0 ? (
        <p className="mt-10 text-muted">
          Nothing hits {minMpg}+ mpg yet. Slide down to widen the list.
        </p>
      ) : (
        <ul className="mt-8 max-w-3xl divide-y divide-line/70">
          {results.map((r) => {
            const kind = powertrainLabel(r.powertrain);
            return (
              <li key={`${r.makeSlug}-${r.modelSlug}`} className="py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="font-medium text-foreground">
                    <Link
                      href={r.href}
                      className="underline-offset-2 hover:underline"
                    >
                      {r.year} {r.makeName} {r.modelName}
                    </Link>
                  </p>
                  <p className="font-display text-xl tabular-nums tracking-tight text-accent">
                    {r.mpgCombined}{" "}
                    <span className="text-sm font-sans text-muted">mpg</span>
                  </p>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {[kind, r.trimName ? `${r.trimName} trim` : null]
                    .filter(Boolean)
                    .join(" · ") || "Combined MPG from catalog specs"}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
