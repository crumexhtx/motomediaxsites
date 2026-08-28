import { describe, expect, it } from "vitest";
import {
  estimateOwnershipCost,
  formatUsd,
  OWNERSHIP_ASSUMPTIONS,
  resolvePowertrainKind,
} from "@/lib/ownership";

describe("ownership estimates", () => {
  it("estimates gas running cost from combined MPG", () => {
    const est = estimateOwnershipCost({ mpgCombined: 30 });
    expect(est?.kind).toBe("gas");
    const gallons = OWNERSHIP_ASSUMPTIONS.milesPerYear / 30;
    const annual = gallons * OWNERSHIP_ASSUMPTIONS.gasUsdPerGallon;
    expect(est?.annualUsd).toBe(Math.round(annual));
    expect(est?.horizonUsd).toBe(Math.round(annual * 5));
    expect(est?.horizonYears).toBe(5);
    expect(est?.efficiencyLabel).toBe("30 mpg combined");
  });

  it("honors interactive assumption overrides", () => {
    const est = estimateOwnershipCost({
      mpgCombined: 30,
      assumptions: {
        milesPerYear: 15_000,
        gasUsdPerGallon: 4,
        years: 3,
      },
    });
    expect(est?.kind).toBe("gas");
    const annual = (15_000 / 30) * 4;
    expect(est?.annualUsd).toBe(Math.round(annual));
    expect(est?.horizonUsd).toBe(Math.round(annual * 3));
    expect(est?.horizonYears).toBe(3);
    expect(est?.assumptionsLabel).toContain("15,000");
    expect(est?.assumptionsLabel).toContain("$4.00/gal");
  });

  it("scales EV cost with electricity price and miles", () => {
    const base = estimateOwnershipCost({
      rangeMiles: 300,
      batteryKwh: 75,
      fuelTypePrimary: "Electric",
    });
    const denser = estimateOwnershipCost({
      rangeMiles: 300,
      batteryKwh: 75,
      fuelTypePrimary: "Electric",
      assumptions: {
        milesPerYear: 24_000,
        electricityUsdPerKwh: 0.32,
        years: 2,
      },
    });
    expect(base?.kind).toBe("ev");
    expect(denser?.kind).toBe("ev");
    expect(denser!.annualUsd).toBeGreaterThan(base!.annualUsd);
    expect(denser?.horizonYears).toBe(2);
  });

  it("estimates EV cost from range and battery", () => {
    const est = estimateOwnershipCost({
      rangeMiles: 300,
      batteryKwh: 75,
      fuelTypePrimary: "Electric",
      electrificationLevel: "Battery Electric Vehicle (BEV)",
    });
    expect(est?.kind).toBe("ev");
    expect(est?.annualUsd).toBeGreaterThan(0);
    expect(est?.efficiencyLabel).toContain("mi/kWh");
  });

  it("uses gas MPG for PHEVs instead of all-electric math", () => {
    const kind = resolvePowertrainKind({
      mpgCombined: 38,
      rangeMiles: 42,
      batteryKwh: 18.1,
      electrificationLevel: "Plug-in Hybrid",
      engine: "2.5L Hybrid",
    });
    expect(kind).toBe("phev");
    const est = estimateOwnershipCost({
      mpgCombined: 38,
      rangeMiles: 42,
      batteryKwh: 18.1,
      electrificationLevel: "Plug-in Hybrid",
      engine: "2.5L Hybrid",
    });
    expect(est?.kind).toBe("phev");
    expect(est?.efficiencyLabel).toContain("38 mpg");
    expect(est?.efficiencyLabel.toLowerCase()).toContain("phev");
    // Must not be the EV annual cost from 42mi/18.1kWh.
    const evMiPerKwh = 42 / 18.1;
    const fakeEvAnnual =
      (OWNERSHIP_ASSUMPTIONS.milesPerYear / evMiPerKwh) *
      OWNERSHIP_ASSUMPTIONS.electricityUsdPerKwh;
    expect(est?.annualUsd).not.toBe(Math.round(fakeEvAnnual));
  });

  it("uses hybrid gas MPG when hybrid has a small battery", () => {
    const est = estimateOwnershipCost({
      mpgCombined: 52,
      batteryKwh: 1.6,
      electrificationLevel: "Strong Hybrid",
      engine: "2.5L Hybrid",
    });
    expect(est?.kind).toBe("hybrid");
    expect(est?.efficiencyLabel).toContain("52 mpg");
  });

  it("returns null without usable efficiency data", () => {
    expect(estimateOwnershipCost({})).toBeNull();
  });

  it("formats usd without cents", () => {
    expect(formatUsd(1500)).toMatch(/\$1,500/);
  });
});
