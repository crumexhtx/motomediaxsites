import { describe, expect, it } from "vitest";
import { metadata as searchMeta } from "@/app/search/page";
import { metadata as compareMeta } from "@/app/compare/page";

describe("static page meta descriptions", () => {
  it.each([
    ["/search", searchMeta],
    ["/compare", compareMeta],
  ])("%s description is 120–155 chars", (_path, meta) => {
    const len = String(meta.description).length;
    expect(len).toBeGreaterThanOrEqual(120);
    expect(len).toBeLessThanOrEqual(155);
  });
});
