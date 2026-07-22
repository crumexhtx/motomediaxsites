import { describe, expect, it } from "vitest";
import {
  getCuratedYearVideo,
  parseYoutubeId,
  youtubeWatchUrl,
} from "@/lib/videos";

describe("videos", () => {
  it("parses bare ids and watch urls", () => {
    expect(parseYoutubeId("ZWBfNCv2Vps")).toBe("ZWBfNCv2Vps");
    expect(
      parseYoutubeId("https://www.youtube.com/watch?v=ZWBfNCv2Vps"),
    ).toBe("ZWBfNCv2Vps");
    expect(parseYoutubeId("https://youtu.be/ymm4Ej0ocBw")).toBe("ymm4Ej0ocBw");
  });

  it("loads curated toyota year videos", () => {
    const camry = getCuratedYearVideo("toyota", "camry", 2026);
    expect(camry?.youtubeId).toBe("ZWBfNCv2Vps");
    expect(camry?.owner).toBe("Toyota USA");
    expect(youtubeWatchUrl(camry!.youtubeId)).toContain("ZWBfNCv2Vps");

    const four = getCuratedYearVideo("toyota", "4runner", 2025);
    expect(four?.youtubeId).toBe("ymm4Ej0ocBw");
  });

  it("loads curated ford year videos", () => {
    const mustang = getCuratedYearVideo("ford", "mustang", 2025);
    expect(mustang?.youtubeId).toMatch(/^[\w-]{11}$/);
    expect(mustang?.owner).toBeTruthy();
    expect(mustang?.title?.toLowerCase()).toContain("mustang");

    const bronco = getCuratedYearVideo("ford", "bronco", 2025);
    expect(bronco?.youtubeId).toMatch(/^[\w-]{11}$/);
  });

  it("loads partial chevrolet videos when present", () => {
    const corvette = getCuratedYearVideo("chevrolet", "corvette", 2025);
    expect(corvette?.youtubeId).toMatch(/^[\w-]{11}$/);
    expect(corvette?.title?.toLowerCase()).toContain("corvette");
  });
});
