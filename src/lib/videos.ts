/**
 * Curated year-page YouTube embeds.
 * Shape: makeSlug → modelSlug → year → YearVideo fields
 */
import type { YearVideo } from "@/data/catalog";
import bmwVideos from "@/data/videos/bmw.json";
import chevroletVideos from "@/data/videos/chevrolet.json";
import fordVideos from "@/data/videos/ford.json";
import gmcVideos from "@/data/videos/gmc.json";
import hondaVideos from "@/data/videos/honda.json";
import hyundaiVideos from "@/data/videos/hyundai.json";
import jeepVideos from "@/data/videos/jeep.json";
import kiaVideos from "@/data/videos/kia.json";
import mazdaVideos from "@/data/videos/mazda.json";
import mercedesVideos from "@/data/videos/mercedes-benz.json";
import nissanVideos from "@/data/videos/nissan.json";
import subaruVideos from "@/data/videos/subaru.json";
import teslaVideos from "@/data/videos/tesla.json";
import toyotaVideos from "@/data/videos/toyota.json";
import volkswagenVideos from "@/data/videos/volkswagen.json";

type VideosByYear = Record<string, YearVideo>;
type VideosByModel = Record<string, VideosByYear>;

const VIDEOS_BY_MAKE: Record<string, VideosByModel> = {
  toyota: toyotaVideos as VideosByModel,
  ford: fordVideos as VideosByModel,
  chevrolet: chevroletVideos as VideosByModel,
  honda: hondaVideos as VideosByModel,
  nissan: nissanVideos as VideosByModel,
  hyundai: hyundaiVideos as VideosByModel,
  kia: kiaVideos as VideosByModel,
  subaru: subaruVideos as VideosByModel,
  jeep: jeepVideos as VideosByModel,
  gmc: gmcVideos as VideosByModel,
  bmw: bmwVideos as VideosByModel,
  "mercedes-benz": mercedesVideos as VideosByModel,
  tesla: teslaVideos as VideosByModel,
  volkswagen: volkswagenVideos as VideosByModel,
  mazda: mazdaVideos as VideosByModel,
};

export function getCuratedYearVideo(
  makeSlug: string,
  modelSlug: string,
  year: number,
): YearVideo | undefined {
  const byModel = VIDEOS_BY_MAKE[makeSlug.toLowerCase()];
  if (!byModel) return undefined;
  const byYear = byModel[modelSlug.toLowerCase()];
  if (!byYear) return undefined;
  return byYear[String(year)];
}

export function youtubeWatchUrl(youtubeId: string): string {
  return `https://www.youtube.com/watch?v=${youtubeId}`;
}

export function youtubeEmbedUrl(youtubeId: string): string {
  return `https://www.youtube-nocookie.com/embed/${youtubeId}`;
}

export function youtubeThumbUrl(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

/** Extract an 11-char YouTube ID from a URL or bare ID. */
export function parseYoutubeId(input: string): string | undefined {
  const trimmed = input.trim();
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && /^[\w-]{11}$/.test(id) ? id : undefined;
    }
    const v = url.searchParams.get("v");
    if (v && /^[\w-]{11}$/.test(v)) return v;
    const embed = url.pathname.match(/\/embed\/([\w-]{11})/);
    if (embed) return embed[1];
  } catch {
    return undefined;
  }
  return undefined;
}
