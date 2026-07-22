import { describe, expect, it } from "vitest";
import {
  lookupEpaSummary,
  mergeEpaIntoSpecs,
  type EpaIndex,
  type EpaVehicle,
} from "../scripts/epa";

function row(partial: Partial<EpaVehicle> & Pick<EpaVehicle, "model">): EpaVehicle {
  return {
    year: 2025,
    make: "Toyota",
    baseModel: partial.baseModel ?? partial.model.split(" ")[0],
    cityMpg: 30,
    highwayMpg: 38,
    combinedMpg: 33,
    ...partial,
  };
}

describe("EPA lookup", () => {
  const index: EpaIndex = {
    byMakeYear: new Map([
      [
        "toyota|2025",
        [
          row({
            model: "Camry LE",
            baseModel: "Camry",
            cityMpg: 53,
            highwayMpg: 50,
            combinedMpg: 51,
            atvType: "Hybrid",
            fuelType: "Regular Gasoline",
            drive: "Front-Wheel Drive",
          }),
          row({
            model: "Camry XSE AWD",
            baseModel: "Camry",
            cityMpg: 46,
            highwayMpg: 46,
            combinedMpg: 46,
            atvType: "Hybrid",
            drive: "All-Wheel Drive",
          }),
          row({
            model: "RAV4 Hybrid XLE",
            baseModel: "RAV4",
            cityMpg: 41,
            highwayMpg: 38,
            combinedMpg: 40,
            atvType: "Hybrid",
          }),
          row({
            model: "GR Supra 3.0",
            baseModel: "GR Supra",
            cityMpg: 23,
            highwayMpg: 31,
            combinedMpg: 26,
          }),
        ],
      ],
    ]),
  };

  it("matches Camry and prefers hybrid mpg", () => {
    const s = lookupEpaSummary(index, "Toyota", "Camry", 2025);
    expect(s?.mpgCombined).toBe(51);
    expect(s?.variantCount).toBe(2);
    expect(s?.electrificationLevel).toBe("Hybrid");
  });

  it("matches RAV4 and Supra aliases", () => {
    expect(lookupEpaSummary(index, "Toyota", "RAV4", 2025)?.mpgCombined).toBe(
      40,
    );
    expect(lookupEpaSummary(index, "Toyota", "Supra", 2025)?.mpgCombined).toBe(
      26,
    );
  });

  it("merges into specs without overwriting existing mpg", () => {
    const merged = mergeEpaIntoSpecs(
      { mpgCombined: 99, overallLengthIn: "193" },
      lookupEpaSummary(index, "Toyota", "Camry", 2025),
    );
    expect(merged?.mpgCombined).toBe(99);
    expect(merged?.mpgCity).toBe(53);
    expect(merged?.overallLengthIn).toBe("193");
  });

  it("overwrites mpg when overwriteMpg is set", () => {
    const merged = mergeEpaIntoSpecs(
      { mpgCombined: 99 },
      lookupEpaSummary(index, "Toyota", "Camry", 2025),
      { overwriteMpg: true },
    );
    expect(merged?.mpgCombined).toBe(51);
  });
});

describe("EPA performance-variant matching", () => {
  const index: EpaIndex = {
    byMakeYear: new Map([
      [
        "honda|2025",
        [
          row({
            make: "Honda",
            model: "Civic Hybrid Sport",
            baseModel: "Civic",
            cityMpg: 50,
            highwayMpg: 47,
            combinedMpg: 49,
            atvType: "Hybrid",
            fuelType: "Regular Gasoline",
          }),
          row({
            make: "Honda",
            model: "Civic 4Dr",
            baseModel: "Civic",
            cityMpg: 30,
            highwayMpg: 37,
            combinedMpg: 33,
            fuelType: "Regular Gasoline",
          }),
          row({
            make: "Honda",
            model: "Civic 5Dr",
            baseModel: "Civic",
            cityMpg: 22,
            highwayMpg: 28,
            combinedMpg: 24,
            fuelType: "Premium Gasoline",
          }),
          row({
            make: "Honda",
            model: "Civic 5Dr",
            baseModel: "Civic",
            cityMpg: 30,
            highwayMpg: 37,
            combinedMpg: 33,
            fuelType: "Regular Gasoline",
          }),
        ],
      ],
      [
        "hyundai|2025",
        [
          row({
            make: "Hyundai",
            model: "Elantra Hybrid Blue",
            baseModel: "Elantra",
            cityMpg: 51,
            highwayMpg: 58,
            combinedMpg: 54,
            atvType: "Hybrid",
            fuelType: "Regular Gasoline",
          }),
          row({
            make: "Hyundai",
            model: "Elantra N",
            baseModel: "Elantra N",
            cityMpg: 20,
            highwayMpg: 29,
            combinedMpg: 23,
            fuelType: "Premium Gasoline",
          }),
        ],
      ],
    ]),
  };

  it("maps Civic Type R to premium Civic 5Dr, not hybrid", () => {
    const s = lookupEpaSummary(index, "Honda", "Civic Type R", 2025);
    expect(s?.mpgCombined).toBe(24);
    expect(s?.electrificationLevel).toBeUndefined();
  });

  it("does not assign Elantra Hybrid mpg to Elantra N", () => {
    const s = lookupEpaSummary(index, "Hyundai", "Elantra N", 2025);
    expect(s?.mpgCombined).toBe(23);
    expect(s?.electrificationLevel).toBeUndefined();
  });
});
