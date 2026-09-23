import Link from "next/link";
import {
  getBrandReliabilityMeta,
  getCargurusTop10,
  getCatalogBrandReliabilityRanking,
  type CatalogBrandReliabilityRow,
} from "@/lib/brandReliability";

function RankBar({ rank, maxRank }: { rank: number; maxRank: number }) {
  const pct = Math.max(8, Math.round(((maxRank - rank + 1) / maxRank) * 100));
  return (
    <div
      className="mt-2 h-1.5 overflow-hidden rounded-full bg-soft"
      role="presentation"
    >
      <div
        className="h-full rounded-full bg-accent/80"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function CatalogRankRow({
  row,
  maxRank,
}: {
  row: CatalogBrandReliabilityRow;
  maxRank: number;
}) {
  return (
    <li className="border-b border-line/60 py-4 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-medium text-foreground">
          <span className="mr-3 tabular-nums text-muted">{row.rank}.</span>
          <Link href={row.href} className="underline-offset-2 hover:underline">
            {row.brand}
          </Link>
        </p>
        <p className="text-xs tabular-nums text-muted">
          {[
            row.crScore != null ? `CR ${row.crScore}` : null,
            row.jdPp100 != null ? `JD ${row.jdPp100} PP100` : null,
            row.cargurusRank != null ? `CG #${row.cargurusRank}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <RankBar rank={row.rank} maxRank={maxRank} />
    </li>
  );
}

/**
 * Sourced brand reliability ranking for the /reliability hub.
 * Catalog composite + CarGurus top 10 + citation notes.
 */
export function BrandReliabilityRanking() {
  const meta = getBrandReliabilityMeta();
  const catalogRows = getCatalogBrandReliabilityRanking();
  const cargurus = getCargurusTop10();
  const cargurusSource = meta.sources.find((s) => s.id === "cargurus-2025");
  const edmundsSource = meta.sources.find(
    (s) => s.id === "edmunds-most-reliable",
  );

  return (
    <section className="mt-12 max-w-3xl">
      <h2 className="font-display text-3xl tracking-tight md:text-4xl">
        Most to least reliable brands
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted md:text-base">
        Catalog brands ordered by the average of their Consumer Reports
        predicted-reliability rank and J.D. Power 2026 Vehicle Dependability
        Study (PP100) rank — the same primary inputs{" "}
        {cargurusSource ? (
          <a
            href={cargurusSource.url}
            className="text-accent underline-offset-2 hover:underline"
            rel="noreferrer"
            target="_blank"
          >
            CarGurus
          </a>
        ) : (
          "CarGurus"
        )}{" "}
        cites for its 2025 brand list. Scores are surveys, not guarantees.
      </p>

      <ol className="mt-6 list-none rounded-lg border border-line bg-elevated/40 px-5 py-2 md:px-6">
        {catalogRows.map((row) => (
          <CatalogRankRow
            key={row.makeSlug}
            row={row}
            maxRank={catalogRows.length}
          />
        ))}
      </ol>

      <p className="mt-3 text-xs text-muted">
        CR = predicted reliability score (higher better). JD = problems per 100
        vehicles (lower better). CG = CarGurus 2025 top-10 rank when listed. As
        of {meta.asOf}.
      </p>

      <div className="mt-10">
        <h3 className="font-display text-xl tracking-tight">
          CarGurus top 10 (2025)
        </h3>
        <ol className="mt-3 space-y-2 text-sm text-muted">
          {cargurus.map((row) => (
            <li key={`${row.rank}-${row.brand}`}>
              <span className="tabular-nums text-foreground">{row.rank}.</span>{" "}
              {row.makeSlug ? (
                <Link
                  href={`/makes/${row.makeSlug}`}
                  className="text-foreground underline-offset-2 hover:underline"
                >
                  {row.brand}
                </Link>
              ) : (
                <span className="text-foreground">{row.brand}</span>
              )}
              {!row.makeSlug ? (
                <span className="text-xs"> (not in our catalog)</span>
              ) : null}
            </li>
          ))}
        </ol>
        {cargurusSource ? (
          <p className="mt-3 text-xs text-muted">
            Source:{" "}
            <a
              href={cargurusSource.url}
              className="underline-offset-2 hover:underline"
              rel="noreferrer"
              target="_blank"
            >
              {cargurusSource.label}
            </a>
          </p>
        ) : null}
      </div>

      <p className="mt-8 text-xs leading-relaxed text-muted">
        {edmundsSource ? (
          <>
            <a
              href={edmundsSource.url}
              className="underline-offset-2 hover:underline"
              rel="noreferrer"
              target="_blank"
            >
              Edmunds
            </a>{" "}
            publishes vehicle reviews and Top Rated Awards, not a brand-level
            reliability ranking like CarGurus / CR / J.D. Power — so it is not
            folded into the composite order above.
          </>
        ) : null}{" "}
        Always read model-year guides and NHTSA recalls before you buy.
      </p>
    </section>
  );
}
