import { describe, expect, it } from "vitest";
import { valuationPartnerLabel, valuationUrl } from "@/lib/valuation";

describe("valuation links", () => {
  it("builds an Edmunds appraisal URL with year context", () => {
    const url = valuationUrl({
      year: 2024,
      makeName: "BMW",
      modelName: "M2",
    });
    expect(url).toContain("edmunds.com/appraisal");
    expect(url).toContain("year=2024");
    expect(url).toContain("make=BMW");
    expect(url).toContain("model=M2");
    expect(valuationPartnerLabel()).toBe("Edmunds");
  });
});
