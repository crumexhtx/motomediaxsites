import Link from "next/link";
import { yearHref } from "@/lib/catalog";
import { formatUsd } from "@/lib/pricing";
import type { YearSiblingComparison } from "@/lib/yearComparison";

type Props = {
  comparison: YearSiblingComparison;
  makeSlug: string;
  modelSlug: string;
  makeName: string;
  modelName: string;
};

function signed(value: number | null, fmt: (n: number) => string): string {
  if (value == null) return "";
  if (value === 0) return "same";
  return `${value > 0 ? "+" : "−"}${fmt(Math.abs(value))}`;
}

function rangeText(
  r: [number, number] | null,
  fmt: (n: number) => string,
): string | null {
  if (!r) return null;
  return r[0] === r[1] ? fmt(r[0]) : `${fmt(r[0])}–${fmt(r[1])}`;
}

function Cell({
  value,
  delta,
  fmt,
}: {
  value: number | null;
  delta: number | null;
  fmt: (n: number) => string;
}) {
  if (value == null) return <span className="text-muted">Not published</span>;
  const d = signed(delta, fmt);
  return (
    <>
      {fmt(value)}
      {d ? <span className="ml-1.5 text-xs text-muted">({d})</span> : null}
    </>
  );
}

const plain = (n: number) => String(n);

/**
 * Year-page block comparing this year to its model-year siblings.
 * Numbers only (NHTSA counts, est. used price); no subjective verdicts.
 * Deltas are sibling minus this year.
 */
export function YearComparedWithOthers({
  comparison,
  makeSlug,
  modelSlug,
  makeName,
  modelName,
}: Props) {
  const { current, siblings, ranges } = comparison;
  if (!siblings.length) return null;

  const parts: string[] = [];
  if (current.recalls != null) {
    parts.push(`${current.recalls} recall${current.recalls === 1 ? "" : "s"}`);
  }
  if (current.complaints != null) {
    parts.push(
      `${current.complaints} owner complaint${current.complaints === 1 ? "" : "s"}`,
    );
  }
  if (current.usedPrice != null) {
    parts.push(`an est. used price of ${formatUsd(current.usedPrice)}`);
  }

  const rr = rangeText(ranges.recalls, plain);
  const cr = rangeText(ranges.complaints, plain);
  const pr = rangeText(ranges.price, formatUsd);
  const otherParts = [
    rr ? `recalls ${rr}` : null,
    cr ? `complaints ${cr}` : null,
    pr ? `est. used price ${pr}` : null,
  ].filter(Boolean);

  return (
    <section className="mb-12 max-w-4xl" aria-labelledby="compared-years-heading">
      <h2
        id="compared-years-heading"
        className="font-display text-2xl tracking-tight"
      >
        Compared with other {modelName} years
      </h2>
      <p className="mt-2 max-w-3xl text-sm text-muted md:text-base">
        {parts.length
          ? `The ${current.year} ${makeName} ${modelName} has ${parts.join(", ")}.`
          : `Our catalog has limited recall, complaint, and price data for the ${current.year} ${makeName} ${modelName}.`}
        {otherParts.length
          ? ` Across the other ${comparison.siblings.length === 1 ? "year" : `${comparison.siblings.length} years`} listed below: ${otherParts.join("; ")}.`
          : ""}
      </p>

      <div className="mt-5 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
          <caption className="sr-only">
            {current.year} {makeName} {modelName} compared with other model
            years on recalls, complaints, and estimated used price
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
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-line/60 bg-accent/10">
              <th scope="row" className="px-3 py-3 font-medium">
                {current.year} <span className="text-xs text-muted">(this page)</span>
              </th>
              <td className="px-3 py-3 text-right tabular-nums">
                {current.recalls != null ? (
                  current.recalls
                ) : (
                  <span className="text-muted">Not published</span>
                )}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">
                {current.complaints != null ? (
                  current.complaints
                ) : (
                  <span className="text-muted">Not published</span>
                )}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">
                {current.usedPrice != null ? (
                  formatUsd(current.usedPrice)
                ) : (
                  <span className="text-muted">Not published</span>
                )}
              </td>
            </tr>
            {siblings.map((s) => (
              <tr
                key={s.slug}
                className="border-b border-line/60 last:border-0"
              >
                <th scope="row" className="px-3 py-3 font-medium">
                  <Link
                    href={yearHref(makeSlug, modelSlug, s.slug)}
                    className="text-foreground underline-offset-2 hover:underline"
                  >
                    {s.year} {modelName}
                  </Link>
                </th>
                <td className="px-3 py-3 text-right tabular-nums">
                  <Cell value={s.recalls} delta={s.recallsDelta} fmt={plain} />
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  <Cell
                    value={s.complaints}
                    delta={s.complaintsDelta}
                    fmt={plain}
                  />
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  <Cell
                    value={s.usedPrice}
                    delta={s.priceDelta}
                    fmt={formatUsd}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted">
        Figures in parentheses are the other year minus the {current.year}.{" "}
        <Link
          href={`/makes/${makeSlug}/${modelSlug}`}
          className="underline-offset-2 hover:underline"
        >
          See every {makeName} {modelName} year
        </Link>
        . Recalls and complaints are NHTSA counts; used prices are estimates,
        not appraisals.
      </p>
    </section>
  );
}
