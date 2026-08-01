import type { SchematicLayout } from "@/lib/dimensionSchematic";

type Props = {
  layout: SchematicLayout;
  title?: string;
  /** When comparing, show A/B legend + numeric deltas. */
  compare?: boolean;
};

function DimTicks({
  axis,
  x1,
  y1,
  x2,
  y2,
}: {
  axis: "x" | "y";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}) {
  const tick = 6;
  if (axis === "x") {
    return (
      <>
        <line x1={x1} y1={y1 - tick} x2={x1} y2={y1 + tick} stroke="currentColor" strokeWidth="1" />
        <line x1={x2} y1={y2 - tick} x2={x2} y2={y2 + tick} stroke="currentColor" strokeWidth="1" />
      </>
    );
  }
  return (
    <>
      <line x1={x1 - tick} y1={y1} x2={x1 + tick} y2={y1} stroke="currentColor" strokeWidth="1" />
      <line x1={x2 - tick} y1={y2} x2={x2 + tick} y2={y2} stroke="currentColor" strokeWidth="1" />
    </>
  );
}

/**
 * Server-renderable SVG blueprint schematic from published dimensions.
 * No client JS — present in prerendered HTML for crawlers.
 */
export function DimensionSchematic({
  layout,
  title = "Dimension schematic",
  compare = false,
}: Props) {
  return (
    <section className="mb-12 max-w-3xl">
      <h2 className="font-display text-2xl tracking-tight">{title}</h2>
      <p className="mt-2 text-sm text-muted md:text-base">
        {compare
          ? "Abstract side profiles at the same scale — proportions follow published length and height, not brand styling."
          : "How long, tall, and wheelbase-spaced this year is on paper, as a blueprint outline."}
      </p>

      {compare && layout.vehicles.length >= 2 ? (
        <ul className="mt-3 flex flex-wrap gap-4 text-sm">
          {layout.vehicles.map((v) => (
            <li key={v.id} className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ background: v.stroke }}
                aria-hidden
              />
              <span>{v.label}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-elevated/30 px-2 py-3 text-muted">
        <svg
          viewBox={layout.viewBox}
          width="100%"
          height="auto"
          role="img"
          aria-label={layout.caption}
          className="mx-auto max-w-full"
        >
          {/* Ground line */}
          <line
            x1="40"
            y1={layout.height - 52}
            x2={layout.width - 16}
            y2={layout.height - 52}
            stroke="currentColor"
            strokeOpacity="0.25"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {layout.vehicles.map((v) => (
            <g key={v.id}>
              <path d={v.bodyPath} fill={v.fill} stroke={v.stroke} strokeWidth="1.75" />
              <path
                d={v.cabinPath}
                fill="transparent"
                stroke={v.stroke}
                strokeWidth="1.25"
                strokeOpacity="0.85"
              />
              {v.wheels.map((w, i) => (
                <circle
                  key={`${v.id}-w-${i}`}
                  cx={w.cx}
                  cy={w.cy}
                  r={w.r}
                  fill="transparent"
                  stroke={v.stroke}
                  strokeWidth="1.5"
                />
              ))}
              {compare ? (
                <text
                  x={v.wheels[0]?.cx ?? 80}
                  y={(v.wheels[0]?.cy ?? 100) - (v.wheels[0]?.r ?? 10) - 8}
                  fill={v.stroke}
                  fontSize="11"
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                >
                  {v.label}
                </text>
              ) : null}
            </g>
          ))}

          {layout.dimLines.map((d) => (
            <g key={d.label} className="text-muted">
              <line
                x1={d.x1}
                y1={d.y1}
                x2={d.x2}
                y2={d.y2}
                stroke="currentColor"
                strokeWidth="1"
              />
              <DimTicks axis={d.axis} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} />
              <text
                x={d.labelX}
                y={d.labelY}
                fill="currentColor"
                fontSize="11"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
                textAnchor={d.axis === "y" ? "middle" : "middle"}
                transform={
                  d.axis === "y"
                    ? `rotate(-90 ${d.labelX} ${d.labelY})`
                    : undefined
                }
              >
                {d.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {layout.diffs.length > 0 ? (
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          {layout.diffs.map((d) => (
            <div key={d.label} className="border-b border-line/60 pb-2">
              <dt className="text-xs uppercase tracking-[0.12em] text-muted">
                {d.label}
              </dt>
              <dd className="mt-1 font-medium tabular-nums">{d.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <p className="mt-3 text-xs text-muted">{layout.caption}</p>
    </section>
  );
}
