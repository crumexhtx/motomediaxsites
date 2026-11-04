import { describe, expect, it } from "vitest";
import type { MakeEntry } from "../../src/data/catalog";
import {
  newestRecallFetchedAt,
  recallFreshnessIssue,
} from "./catalog-report";

function catalogWith(...fetchedAt: Array<string | undefined>): MakeEntry[] {
  return [
    {
      name: "Toyota",
      slug: "toyota",
      models: [
        {
          name: "Camry",
          slug: "camry",
          years: fetchedAt.map((at, i) => ({
            year: 2020 + i,
            slug: String(2020 + i),
            summary: "s",
            description: "d",
            images: [],
            safetyStatus: at
              ? { recalls: "ok", complaints: "ok", fetchedAt: at }
              : undefined,
          })),
        },
      ],
    },
  ] as unknown as MakeEntry[];
}

const NOW = new Date("2026-11-04T12:00:00.000Z");

describe("recall freshness", () => {
  it("picks the newest fetchedAt across years", () => {
    const catalog = catalogWith(
      "2026-08-19T14:00:00.000Z",
      "2026-09-22T20:38:07.173Z",
      undefined,
    );
    expect(newestRecallFetchedAt(catalog)).toBe("2026-09-22T20:38:07.173Z");
  });

  it("passes when newest fetch is within 7 days", () => {
    const catalog = catalogWith("2026-10-30T12:00:00.000Z");
    expect(recallFreshnessIssue(catalog, { now: NOW, isCi: true })).toBeNull();
  });

  it("warns locally when the newest fetch is older than 7 days", () => {
    const catalog = catalogWith("2026-09-22T20:38:07.173Z");
    const issue = recallFreshnessIssue(catalog, { now: NOW, isCi: false });
    expect(issue?.level).toBe("warn");
    expect(issue?.message).toMatch(/stale/i);
    expect(issue?.message).toContain("2026-09-22");
  });

  it("errors in CI when the newest fetch is older than 7 days", () => {
    const catalog = catalogWith("2026-09-22T20:38:07.173Z");
    const issue = recallFreshnessIssue(catalog, { now: NOW, isCi: true });
    expect(issue?.level).toBe("error");
  });

  it("flags a catalog with no fetch timestamps at all", () => {
    const issue = recallFreshnessIssue(catalogWith(undefined), {
      now: NOW,
      isCi: true,
    });
    expect(issue?.level).toBe("error");
  });
});
