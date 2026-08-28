"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { CatalogImage } from "@/components/CatalogImage";
import {
  clampMinMpg,
  filterModelsByMinMpg,
  groupEfficiencyResults,
  type EfficiencyCandidate,
  type EfficiencyMpgBounds,
} from "@/lib/efficiency";

type Props = {
  candidates: EfficiencyCandidate[];
  bounds: EfficiencyMpgBounds;
  initialMinMpg: number;
};

function ResultCard({ item }: { item: EfficiencyCandidate }) {
  const title = `${item.year} ${item.makeName} ${item.modelName}`;
  const isBadge = item.image.src.endsWith(".svg");

  return (
    <Link
      href={item.href}
      className="focus-ring group grid overflow-hidden rounded-xl border border-line bg-elevated transition hover:border-accent/50 sm:grid-cols-[160px_1fr]"
    >
      <div className="relative aspect-[16/10] bg-soft sm:aspect-auto sm:min-h-[110px]">
        {isBadge ? (
          <div className="flex h-full min-h-[110px] items-center justify-center p-6">
            <CatalogImage
              src={item.image.src}
              alt={item.image.alt || title}
              width={96}
              height={96}
              className="brand-badge h-16 w-16 object-contain opacity-80"
            />
          </div>
        ) : (
          <CatalogImage
            src={item.image.src}
            alt={item.image.alt || title}
            fill
            quality={45}
            sizes="(max-width: 640px) 100vw, 160px"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        )}
      </div>
      <div className="flex flex-col justify-center gap-1 p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className="font-display text-lg tracking-tight sm:text-xl">
            {title}
          </h3>
          <p className="font-display text-xl tabular-nums tracking-tight text-accent">
            {item.mpgCombined}{" "}
            <span className="text-sm font-sans text-muted">
              {item.powertrain === "ev" ? "MPGe" : "mpg"}
            </span>
          </p>
        </div>
        {item.trimName ? (
          <p className="text-sm text-muted">{item.trimName} trim</p>
        ) : (
          <p className="text-sm text-muted">Best combined figure for this year</p>
        )}
      </div>
    </Link>
  );
}

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
  const groups = useMemo(() => groupEfficiencyResults(results), [results]);

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
        Newest qualifying year per model, grouped by powertrain. Combined MPG
        (or MPGe for battery electric when published) — not real-world driving.
      </p>

      {results.length === 0 ? (
        <p className="mt-10 text-muted">
          Nothing hits {minMpg}+ mpg yet. Slide down to widen the list.
        </p>
      ) : (
        <div className="mt-10 space-y-12">
          {groups.map((group) => (
            <section key={group.id} aria-labelledby={`eff-${group.id}`}>
              <div className="mb-4 max-w-2xl">
                <h2
                  id={`eff-${group.id}`}
                  className="font-display text-2xl tracking-tight md:text-3xl"
                >
                  {group.title}
                  <span className="ml-2 text-base font-sans tabular-nums text-muted">
                    ({group.items.length})
                  </span>
                </h2>
                <p className="mt-1 text-sm text-muted">{group.lead}</p>
              </div>
              <ul className="grid gap-4">
                {group.items.map((item) => (
                  <li key={`${item.makeSlug}-${item.modelSlug}`}>
                    <ResultCard item={item} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
