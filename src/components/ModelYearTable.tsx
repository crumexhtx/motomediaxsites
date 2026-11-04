import Link from "next/link";
import { yearHref } from "@/lib/catalog";
import { formatUsd } from "@/lib/pricing";
import type { YearHubRow } from "@/lib/yearComparison";

type Props = {
  makeSlug: string;
  makeName: string;
  modelSlug: string;
  modelName: string;
  rows: YearHubRow[];
};

function CellValue({ value }: { value: number | null }) {
  if (value == null) {
    return <span className="text-muted">Not published</span>;
  }
  return <>{value}</>;
}

/**
 * Model hub "Best used year" table. Data-only: counts from NHTSA, est. used
 * price from our pricing model, MPG from EPA, changes from catalog diffs.
 * The highlighted row is whichever year(s) have the fewest recalls + complaints
 * per dollar of est. used price in our data — not an editorial verdict.
 */
export function ModelYearTable({
  makeSlug,
  makeName,
  modelSlug,
  modelName,
  rows,
}: Props) {
  if (rows.length < 2) return null;
  const hasHighlight = rows.some((r) => r.highlight);

  return (
    <section className="mt-10" aria-labelledby="best-used-year-heading">
      <h2
        id="best-used-year-heading"
        className="font-display text-2xl tracking-tight"
      >
        Best used {modelName} year: recalls, complaints &amp; price by year
      </h2>
      <p className="mt-2 max-w-3xl text-sm text-muted md:text-base">
        One row per model year from our {makeName} {modelName} catalog.
        {hasHighlight
          ? " The highlighted row has the fewest recalls and complaints per dollar in our data."
          : ""}
      </p>

      <div className="mt-5 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <caption className="sr-only">
            {makeName} {modelName} model years compared by NHTSA recalls, owner
            complaints, estimated used price, combined MPG, and changes
          </caption>
          <thead>
            <tr className="border-b border-line bg-soft text-xs uppercase tracking-[0.12em] text-muted">
              <th scope="col" className="px-3 py-2.5 font-medium">
                Year
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                Recalls
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                Complaints
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                Est. used price
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                Combined MPG
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Major changes vs prior year
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.slug}
                className={`border-b border-line/60 align-top last:border-0 ${
                  row.highlight ? "bg-accent/10" : ""
                }`}
              >
                <th scope="row" className="px-3 py-3 font-medium">
                  <Link
                    href={yearHref(makeSlug, modelSlug, row.slug)}
                    className="text-foreground underline-offset-2 hover:underline"
                  >
                    {row.year}
                  </Link>
                  {row.highlight ? (
                    <span className="mt-1 block text-xs font-normal text-accent">
                      Fewest recalls and complaints per dollar in our data
                    </span>
                  ) : null}
                </th>
                <td className="px-3 py-3 text-right tabular-nums">
                  <CellValue value={row.recalls} />
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  <CellValue value={row.complaints} />
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {row.usedPrice != null ? (
                    formatUsd(row.usedPrice)
                  ) : (
                    <span className="text-muted">Not published</span>
                  )}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  <CellValue value={row.mpgCombined} />
                </td>
                <td className="px-3 py-3 text-muted">
                  {row.changes.length > 0 ? (
                    <ul className="space-y-0.5">
                      {row.changes.map((change) => (
                        <li key={change}>{change}</li>
                      ))}
                    </ul>
                  ) : index === rows.length - 1 ? (
                    "Earliest year in our catalog"
                  ) : (
                    "No tracked changes"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 max-w-3xl text-xs text-muted">
        Recalls and complaints are NHTSA counts from our last refresh. Est. used
        price is a labeled estimate (listing average where available, otherwise
        an MSRP-retention estimate) — not an appraisal. Per-dollar ranking
        divides recalls plus complaints by est. used price; newer years have had
        less time to collect complaints. “Not published” means we have no data
        for that field.
      </p>
    </section>
  );
}
