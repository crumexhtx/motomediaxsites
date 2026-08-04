import { describe, expect, it } from "vitest";
import { normalizeComponent, pickBestNhtsaModel } from "./nhtsa-safety";

describe("nhtsa-safety helpers", () => {
  it("normalizes component labels to top-level categories", () => {
    expect(normalizeComponent("ELECTRICAL SYSTEM:BODY CONTROL MODULE:SOFTWARE")).toBe(
      "Electrical System",
    );
    expect(normalizeComponent("ENGINE, POWER TRAIN")).toBe("Engine");
  });

  it("prefers bare Explorer over EXPLORER GAS and Mach-E over Mustang", () => {
    const ford2026 = [
      "MUSTANG",
      "MUSTANG MACH-E BEV BEV",
      "EXPLORER GAS",
      "BRONCO 4DR",
    ];
    expect(pickBestNhtsaModel("Explorer", ford2026)).toBe("EXPLORER GAS");
    expect(pickBestNhtsaModel("Mustang Mach-E", ford2026)).toBe(
      "MUSTANG MACH-E BEV BEV",
    );
    expect(pickBestNhtsaModel("Mustang", ford2026)).toBe("MUSTANG");
  });
});
