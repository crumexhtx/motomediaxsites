import { describe, expect, it } from "vitest";
import {
  buildSchematicLayout,
  dimensionsFromSpecs,
  formatInches,
} from "@/lib/dimensionSchematic";
import { getYear } from "@/lib/catalog";

describe("dimension schematic", () => {
  it("parses catalog string inches and skips incomplete specs", () => {
    expect(
      dimensionsFromSpecs({
        overallLengthIn: "241.3",
        overallHeightIn: "77.2",
        wheelbaseIn: "157.1",
        overallWidthIn: "79.9",
      }),
    ).toEqual({
      lengthIn: 241.3,
      heightIn: 77.2,
      wheelbaseIn: 157.1,
      widthIn: 79.9,
    });
    expect(
      dimensionsFromSpecs({
        overallLengthIn: "189.4",
        // height missing
        wheelbaseIn: "107.1",
      }),
    ).toBeUndefined();
    expect(dimensionsFromSpecs(undefined)).toBeUndefined();
  });

  it("scales F-150 longer/taller than Mustang at the same px/in", () => {
    const f150 = getYear("ford", "f-150", "2024");
    const mustang = getYear("ford", "mustang", "2024");
    expect(f150 && mustang).toBeTruthy();
    const a = dimensionsFromSpecs(f150!.year.specs)!;
    const b = dimensionsFromSpecs(mustang!.year.specs)!;
    expect(a.lengthIn).toBeGreaterThan(b.lengthIn);
    expect(a.heightIn).toBeGreaterThan(b.heightIn);

    const layout = buildSchematicLayout(
      [
        { id: "f150", label: "2024 Ford F-150", dims: a },
        { id: "mustang", label: "2024 Ford Mustang", dims: b },
      ],
      { showDiffs: true },
    );
    expect(layout).toBeTruthy();
    // Same scale — F-150 length in px must exceed Mustang.
    const fPath = layout!.vehicles[0]!.bodyPath;
    const mPath = layout!.vehicles[1]!.bodyPath;
    const fXs = [...fPath.matchAll(/([\d.]+)/g)].map((m) => Number(m[1]));
    const mXs = [...mPath.matchAll(/([\d.]+)/g)].map((m) => Number(m[1]));
    expect(Math.max(...fXs)).toBeGreaterThan(Math.max(...mXs));
    expect(layout!.diffs.some((d) => d.value.includes("longer"))).toBe(true);
    expect(formatInches(a.lengthIn - b.lengthIn)).toMatch(/in$/);
  });

  it("returns undefined layout when no dimensions exist (e.g. Mach-E)", () => {
    const mache = getYear("ford", "mustang-mach-e", "2024");
    expect(dimensionsFromSpecs(mache?.year.specs)).toBeUndefined();
    expect(buildSchematicLayout([])).toBeUndefined();
  });
});
