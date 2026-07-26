import { describe, expect, it } from "vitest";
import { normalizeComponent } from "./nhtsa-safety";

describe("nhtsa-safety helpers", () => {
  it("normalizes component labels to top-level categories", () => {
    expect(normalizeComponent("ELECTRICAL SYSTEM:BODY CONTROL MODULE:SOFTWARE")).toBe(
      "Electrical System",
    );
    expect(normalizeComponent("ENGINE, POWER TRAIN")).toBe("Engine");
  });
});
