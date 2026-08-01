/**
 * Blueprint-style dimension schematic geometry from catalog specs.
 * Abstract outline only — proportions from published inches, not brand styling.
 */
import type { VehicleSpecs } from "@/data/catalog";

export type VehicleDimensions = {
  lengthIn: number;
  heightIn: number;
  wheelbaseIn?: number;
  widthIn?: number;
};

export type SchematicVehicle = {
  id: string;
  label: string;
  dims: VehicleDimensions;
};

export type DimLine = {
  axis: "x" | "y";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  labelX: number;
  labelY: number;
};

export type SchematicLayout = {
  viewBox: string;
  width: number;
  height: number;
  pxPerInch: number;
  vehicles: Array<{
    id: string;
    label: string;
    bodyPath: string;
    cabinPath: string;
    wheels: Array<{ cx: number; cy: number; r: number }>;
    stroke: string;
    fill: string;
  }>;
  dimLines: DimLine[];
  diffs: Array<{ label: string; value: string }>;
  caption: string;
};

const PAD = { left: 56, right: 24, top: 36, bottom: 52 };
const DRAW_W = 560;
const DRAW_H = 200;

function parseInches(value: string | number | undefined | null): number | undefined {
  if (value == null || value === "") return undefined;
  const n = typeof value === "number" ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(n) || n <= 0 || n > 400) return undefined;
  return n;
}

/** Extract usable dimensions from VehicleSpecs (string inches in catalog). */
export function dimensionsFromSpecs(
  specs: VehicleSpecs | undefined | null,
): VehicleDimensions | undefined {
  if (!specs) return undefined;
  const lengthIn = parseInches(specs.overallLengthIn);
  const heightIn = parseInches(specs.overallHeightIn);
  if (lengthIn == null || heightIn == null) return undefined;
  const wheelbaseIn = parseInches(specs.wheelbaseIn);
  const widthIn = parseInches(specs.overallWidthIn);
  const wb =
    wheelbaseIn != null &&
    wheelbaseIn < lengthIn * 0.98 &&
    wheelbaseIn > lengthIn * 0.35
      ? wheelbaseIn
      : undefined;
  return { lengthIn, heightIn, wheelbaseIn: wb, widthIn };
}

export function formatInches(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded} in` : `${rounded.toFixed(1)} in`;
}

const STROKES = ["#3d9cf0", "#9aa3b5"] as const;
const FILLS = ["rgba(61, 156, 240, 0.14)", "rgba(154, 163, 181, 0.12)"] as const;

type Silhouette = {
  bodyPath: string;
  cabinPath: string;
  wheels: Array<{ cx: number; cy: number; r: number }>;
  frontAxleX: number;
  rearAxleX: number;
  lengthPx: number;
  heightPx: number;
};

/** Map inches → SVG pixels (origin front-bottom on ground line). */
function buildSilhouette(
  dims: VehicleDimensions,
  originX: number,
  groundY: number,
  pxPerInch: number,
): Silhouette {
  const L = dims.lengthIn;
  const H = dims.heightIn;
  const s = pxPerInch;
  const wb = dims.wheelbaseIn ?? L * 0.58;
  const frontOverhang = (L - wb) * 0.42;
  const wheelR = Math.min(H * 0.22, L * 0.06, 16) * s;

  const x = (inches: number) => originX + inches * s;
  const y = (inchesFromGround: number) => groundY - inchesFromGround * s;

  const nose = x(L * 0.02);
  const tail = x(L * 0.98);
  const bodyBottom = y(Math.min(H * 0.08, dims.wheelbaseIn ? 8 : 6));
  const bodyTop = y(H * 0.55);
  const cabinFront = x(L * 0.32);
  const cabinRear = x(L * 0.78);
  const cabinTop = y(H * 0.92);
  const cabinBottom = y(H * 0.53);

  const bodyPath = [
    `M ${nose.toFixed(1)} ${bodyTop.toFixed(1)}`,
    `L ${(cabinFront - L * 0.02 * s).toFixed(1)} ${bodyTop.toFixed(1)}`,
    `L ${(cabinRear + L * 0.02 * s).toFixed(1)} ${bodyTop.toFixed(1)}`,
    `L ${tail.toFixed(1)} ${(bodyTop + (groundY - bodyTop) * 0.08).toFixed(1)}`,
    `L ${tail.toFixed(1)} ${bodyBottom.toFixed(1)}`,
    `L ${nose.toFixed(1)} ${bodyBottom.toFixed(1)}`,
    "Z",
  ].join(" ");

  const cabinPath = [
    `M ${cabinFront.toFixed(1)} ${cabinBottom.toFixed(1)}`,
    `L ${(cabinFront + L * 0.06 * s).toFixed(1)} ${cabinTop.toFixed(1)}`,
    `L ${(cabinRear - L * 0.04 * s).toFixed(1)} ${cabinTop.toFixed(1)}`,
    `L ${cabinRear.toFixed(1)} ${cabinBottom.toFixed(1)}`,
    "Z",
  ].join(" ");

  const frontAxleX = x(frontOverhang);
  const rearAxleX = x(frontOverhang + wb);
  const wheelCy = groundY - wheelR;

  return {
    bodyPath,
    cabinPath,
    wheels: [
      { cx: frontAxleX, cy: wheelCy, r: wheelR },
      { cx: rearAxleX, cy: wheelCy, r: wheelR },
    ],
    frontAxleX,
    rearAxleX,
    lengthPx: L * s,
    heightPx: H * s,
  };
}

export function buildSchematicLayout(
  vehicles: SchematicVehicle[],
  opts?: { showDiffs?: boolean },
): SchematicLayout | undefined {
  const usable = vehicles.filter((v) => v.dims.lengthIn > 0 && v.dims.heightIn > 0);
  if (!usable.length) return undefined;

  const maxL = Math.max(...usable.map((v) => v.dims.lengthIn));
  const maxH = Math.max(...usable.map((v) => v.dims.heightIn));
  const pxPerInch = Math.min(DRAW_W / maxL, DRAW_H / maxH);

  const originX = PAD.left;
  const groundY = PAD.top + DRAW_H;
  const svgW = PAD.left + DRAW_W + PAD.right;
  const svgH = PAD.top + DRAW_H + PAD.bottom;

  const laidOut = usable.map((v, i) => {
    const sil = buildSilhouette(v.dims, originX, groundY, pxPerInch);
    return {
      id: v.id,
      label: v.label,
      bodyPath: sil.bodyPath,
      cabinPath: sil.cabinPath,
      wheels: sil.wheels,
      stroke: STROKES[i % STROKES.length]!,
      fill: FILLS[i % FILLS.length]!,
      dims: v.dims,
      sil,
    };
  });

  const primary = laidOut[0]!;
  const pDims = primary.dims;
  const bodyTopY = groundY - primary.sil.heightPx;
  const bodyEndX = originX + primary.sil.lengthPx;

  const dimLines: DimLine[] = [
    {
      axis: "x",
      x1: originX,
      y1: groundY + 30,
      x2: bodyEndX,
      y2: groundY + 30,
      label: `Length ${formatInches(pDims.lengthIn)}`,
      labelX: (originX + bodyEndX) / 2,
      labelY: groundY + 46,
    },
    {
      axis: "y",
      x1: originX - 30,
      y1: groundY,
      x2: originX - 30,
      y2: bodyTopY,
      label: `Height ${formatInches(pDims.heightIn)}`,
      labelX: originX - 42,
      labelY: (groundY + bodyTopY) / 2,
    },
  ];

  if (pDims.wheelbaseIn != null) {
    dimLines.push({
      axis: "x",
      x1: primary.sil.frontAxleX,
      y1: groundY + 12,
      x2: primary.sil.rearAxleX,
      y2: groundY + 12,
      label: `Wheelbase ${formatInches(pDims.wheelbaseIn)}`,
      labelX: (primary.sil.frontAxleX + primary.sil.rearAxleX) / 2,
      labelY: groundY + 24,
    });
  }

  const diffs: Array<{ label: string; value: string }> = [];
  if (opts?.showDiffs && laidOut.length >= 2) {
    const a = laidOut[0]!.dims;
    const b = laidOut[1]!.dims;
    const lenDelta = a.lengthIn - b.lengthIn;
    const hDelta = a.heightIn - b.heightIn;
    diffs.push({
      label: "Length (A − B)",
      value:
        Math.abs(lenDelta) < 0.05
          ? "same length"
          : lenDelta > 0
            ? `${formatInches(lenDelta)} longer`
            : `${formatInches(Math.abs(lenDelta))} shorter`,
    });
    diffs.push({
      label: "Height (A − B)",
      value:
        Math.abs(hDelta) < 0.05
          ? "same height"
          : hDelta > 0
            ? `${formatInches(hDelta)} taller`
            : `${formatInches(Math.abs(hDelta))} shorter`,
    });
    if (a.wheelbaseIn != null && b.wheelbaseIn != null) {
      const wbDelta = a.wheelbaseIn - b.wheelbaseIn;
      diffs.push({
        label: "Wheelbase (A − B)",
        value:
          Math.abs(wbDelta) < 0.05
            ? "same wheelbase"
            : wbDelta > 0
              ? `${formatInches(wbDelta)} longer`
              : `${formatInches(Math.abs(wbDelta))} shorter`,
      });
    }
  }

  return {
    viewBox: `0 0 ${svgW} ${svgH}`,
    width: svgW,
    height: svgH,
    pxPerInch,
    vehicles: laidOut.map(({ dims: _d, sil: _s, ...rest }) => rest),
    dimLines,
    diffs,
    caption:
      "Schematic diagram, not to exact styling — based on published dimensions",
  };
}
