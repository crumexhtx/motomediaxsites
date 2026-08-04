import { describe, expect, it } from "vitest";
import { collectCampaigns, diffCampaigns } from "./recall-diff";
import type { MakeEntry } from "../src/data/catalog";

function catalogWith(
  recalls: Array<{ campaignNumber: string; date: string; component: string; summary: string }>,
): MakeEntry[] {
  return [
    {
      name: "Ford",
      slug: "ford",
      models: [
        {
          name: "Explorer",
          slug: "explorer",
          years: [
            {
              year: 2026,
              slug: "2026",
              recalls,
              safetyStatus: {
                recalls: "ok",
                complaints: "empty",
                fetchedAt: "2026-08-04T00:00:00.000Z",
              },
            },
          ],
        },
      ],
    },
  ] as MakeEntry[];
}

describe("recall-diff", () => {
  it("collects campaign keys and ignores fetchedAt for identity", () => {
    const campaigns = collectCampaigns(
      catalogWith([
        {
          campaignNumber: "26V470000",
          date: "2026-07-21",
          component: "Seats",
          summary: "Seat may recline",
        },
      ]),
    );
    expect(campaigns).toEqual([
      {
        key: "ford/explorer/2026/26V470000",
        date: "2026-07-21",
        component: "Seats",
        summary: "Seat may recline",
      },
    ]);
  });

  it("reports added, removed, and updated campaigns", () => {
    const before = collectCampaigns(
      catalogWith([
        {
          campaignNumber: "26V470000",
          date: "2026-07-21",
          component: "Seats",
          summary: "Old summary",
        },
        {
          campaignNumber: "26V001000",
          date: "2026-01-01",
          component: "Brakes",
          summary: "Gone tomorrow",
        },
      ]),
    );
    const after = collectCampaigns(
      catalogWith([
        {
          campaignNumber: "26V470000",
          date: "2026-07-21",
          component: "Seats",
          summary: "New summary",
        },
        {
          campaignNumber: "26V487000",
          date: "2026-07-30",
          component: "Structure",
          summary: "Trim may detach",
        },
      ]),
    );
    const diff = diffCampaigns(before, after);
    expect(diff.changed).toBe(true);
    expect(diff.added).toEqual(["ford/explorer/2026/26V487000"]);
    expect(diff.removed).toEqual(["ford/explorer/2026/26V001000"]);
    expect(diff.updated).toEqual(["ford/explorer/2026/26V470000"]);
  });

  it("treats identical campaign sets as unchanged", () => {
    const rows = [
      {
        campaignNumber: "26V470000",
        date: "2026-07-21",
        component: "Seats",
        summary: "Seat may recline",
      },
    ];
    const diff = diffCampaigns(
      collectCampaigns(catalogWith(rows)),
      collectCampaigns(catalogWith(rows)),
    );
    expect(diff.changed).toBe(false);
    expect(diff.addedCount + diff.removedCount + diff.updatedCount).toBe(0);
  });
});
