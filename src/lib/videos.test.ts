import { describe, expect, it } from "vitest";
import {
  getCuratedYearVideo,
  parseYoutubeId,
  youtubeThumbUrl,
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

  it("prefers maxres YouTube posters for sharper desktop embeds", () => {
    expect(youtubeThumbUrl("ZWBfNCv2Vps")).toContain("/maxresdefault.jpg");
    expect(youtubeThumbUrl("ZWBfNCv2Vps", "hqdefault")).toContain(
      "/hqdefault.jpg",
    );
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

  it("loads curated mazda and tesla year videos", () => {
    const miata = getCuratedYearVideo("mazda", "miata", 2025);
    expect(miata?.youtubeId).toMatch(/^[\w-]{11}$/);
    expect(miata?.title?.toLowerCase()).toMatch(/miata|mx-5|mx5/);

    const modelY = getCuratedYearVideo("tesla", "model-y", 2026);
    expect(modelY?.youtubeId).toMatch(/^[\w-]{11}$/);
    expect(modelY?.title?.toLowerCase()).toContain("model y");
  });

  it("loads mercedes and volkswagen year videos", () => {
    const glc = getCuratedYearVideo("mercedes-benz", "glc", 2024);
    expect(glc?.youtubeId).toMatch(/^[\w-]{11}$/);
    expect(glc?.title?.toLowerCase()).toContain("glc");

    const gti = getCuratedYearVideo("volkswagen", "gti", 2025);
    expect(gti?.youtubeId).toMatch(/^[\w-]{11}$/);
    expect(gti?.title?.toLowerCase()).toContain("gti");
  });
});
