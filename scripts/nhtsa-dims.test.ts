import { describe, expect, it } from "vitest";
import {
  mergeCvsDimsIntoSpecs,
  parseCvsDims,
  yearNeedsCvsDims,
} from "./nhtsa-dims";

describe("nhtsa-dims", () => {
  it("parses CVS OL/OW/OH/WB/CW into inch/lb strings", () => {
    const dims = parseCvsDims([
      {
        Specs: [
          { Name: "OL", Value: "181.8898" },
          { Name: "OW", Value: "74.0157" },
          { Name: "OH", Value: "73.622" },
          { Name: "WB", Value: "118.5039" },
          { Name: "CW", Value: "5000.0782" },
        ],
      },
    ]);
    expect(dims).toEqual({
      overallLengthIn: "181.9",
      overallWidthIn: "74.0",
      overallHeightIn: "73.6",
      wheelbaseIn: "118.5",
      curbWeightLb: "5000.1",
    });
  });

  it("merges dims without clobbering existing values unless overwrite", () => {
    const base = { overallLengthIn: "100.0", mpgCombined: 20 };
    const dims = {
      overallLengthIn: "181.9",
      overallWidthIn: "74.0",
      wheelbaseIn: "118.5",
    };
    expect(mergeCvsDimsIntoSpecs(base, dims)).toMatchObject({
      overallLengthIn: "100.0",
      overallWidthIn: "74.0",
      wheelbaseIn: "118.5",
      mpgCombined: 20,
    });
    expect(mergeCvsDimsIntoSpecs(base, dims, { overwrite: true })).toMatchObject(
      {
        overallLengthIn: "181.9",
        overallWidthIn: "74.0",
      },
    );
  });

  it("detects years that still need CVS dims", () => {
    expect(yearNeedsCvsDims(undefined)).toBe(true);
    expect(yearNeedsCvsDims({ available: true })).toBe(true);
    expect(yearNeedsCvsDims({ overallLengthIn: "181.9" })).toBe(false);
  });

  it("expands known CVS model aliases", async () => {
    const { cvsModelCandidates } = await import("./nhtsa-dims");
    expect(cvsModelCandidates("Mustang Mach-E")).toEqual([
      "Mustang Mach-E",
      "Mustang Mach E",
      "Mach-E",
    ]);
    expect(cvsModelCandidates("C-Class")[1]).toBe("C Class");
  });
});
