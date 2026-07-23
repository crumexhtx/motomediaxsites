import { describe, expect, it } from "vitest";
import {
  estimateOwnershipCost,
  formatUsd,
  OWNERSHIP_ASSUMPTIONS,
} from "@/lib/ownership";

describe("ownership estimates", () => {
  it("estimates gas running cost from combined MPG", () => {
    const est = estimateOwnershipCost({ mpgCombined: 30 });
    expect(est?.kind).toBe("gas");
    const gallons = OWNERSHIP_ASSUMPTIONS.milesPerYear / 30;
    const annual = gallons * OWNERSHIP_ASSUMPTIONS.gasUsdPerGallon;
    expect(est?.annualUsd).toBe(Math.round(annual));
    expect(est?.fiveYearUsd).toBe(Math.round(annual * 5));
    expect(est?.efficiencyLabel).toBe("30 mpg combined");
  });

  it("estimates EV cost from range and battery", () => {
    const est = estimateOwnershipCost({
      rangeMiles: 300,
      batteryKwh: 75,
      preferEv: true,
    });
    expect(est?.kind).toBe("ev");
    expect(est?.annualUsd).toBeGreaterThan(0);
    expect(est?.efficiencyLabel).toContain("mi/kWh");
  });

  it("returns null without usable efficiency data", () => {
    expect(estimateOwnershipCost({})).toBeNull();
  });

  it("formats usd without cents", () => {
    expect(formatUsd(1500)).toMatch(/\$1,500/);
  });
});
