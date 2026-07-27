"use client";

import { useState } from "react";
import type { YearVideo } from "@/data/catalog";
import {
  parseYoutubeId,
  YOUTUBE_THUMB_FALLBACKS,
  youtubeEmbedUrl,
  youtubeThumbUrl,
  youtubeWatchUrl,
  type YoutubeThumbQuality,
} from "@/lib/videos";

type Props = {
  video: YearVideo;
};

function safeOwnerUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

/** Internal fetch/QA notes must never ship in the public UI. */
function publicVideoNote(note: string | undefined): string | undefined {
  if (!note?.trim()) return undefined;
  const lower = note.toLowerCase();
  if (lower.includes("preferred review list")) return undefined;
  if (lower.includes("youtube title may not")) return undefined;
  if (lower.includes("title may not clearly match")) return undefined;
  if (lower.includes("channel is outside")) return undefined;
  return note.trim();
}

function YoutubePoster({
  youtubeId,
  playing,
  onPlay,
  title,
}: {
  youtubeId: string;
  playing: boolean;
  onPlay: () => void;
  title: string;
}) {
  const [qualityIndex, setQualityIndex] = useState(0);
  const quality = YOUTUBE_THUMB_FALLBACKS[
    Math.min(qualityIndex, YOUTUBE_THUMB_FALLBACKS.length - 1)
  ] as YoutubeThumbQuality;
  const thumb = youtubeThumbUrl(youtubeId, quality);

  function advanceFallback() {
    setQualityIndex((i) =>
      i < YOUTUBE_THUMB_FALLBACKS.length - 1 ? i + 1 : i,
    );
  }

  if (playing) {
    return (
      <iframe
        title={title}
        src={`${youtubeEmbedUrl(youtubeId)}?autoplay=1&rel=0`}
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={onPlay}
      className="focus-ring group absolute inset-0 flex items-center justify-center"
      aria-label={`Play video: ${title}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumb}
        alt=""
        width={1280}
        height={720}
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover opacity-90 transition group-hover:opacity-100"
        onError={advanceFallback}
        onLoad={(e) => {
          // Missing maxres often returns a tiny 120×90 placeholder instead of 404.
          if (e.currentTarget.naturalWidth <= 120) advanceFallback();
        }}
      />
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-accent text-[#071018] shadow-lg transition group-hover:scale-105 sm:h-16 sm:w-16">
        <svg
          viewBox="0 0 24 24"
          className="ml-1 h-6 w-6 fill-current sm:h-7 sm:w-7"
          aria-hidden
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
    </button>
  );
}

export function YearVideoEmbed({ video }: Props) {
  const [playing, setPlaying] = useState(false);
  const youtubeId = parseYoutubeId(video.youtubeId);
  if (!youtubeId) return null;

  const watchUrl = youtubeWatchUrl(youtubeId);
  const ownerUrl = safeOwnerUrl(video.ownerUrl);
  const note = publicVideoNote(video.note);

  return (
    <section className="mb-12">
      <h2 className="mb-2 font-display text-2xl tracking-tight">Video</h2>
      <p className="mb-4 max-w-2xl text-sm text-muted">
        Embedded from YouTube. We do not host or claim ownership of this video.
      </p>

      {/* Cap desktop width so the poster isn’t upscaled past native resolution. */}
      <div className="max-w-2xl overflow-hidden rounded-lg border border-line bg-elevated">
        <div className="relative aspect-video w-full bg-black">
          <YoutubePoster
            youtubeId={youtubeId}
            playing={playing}
            onPlay={() => setPlaying(true)}
            title={video.title}
          />
        </div>

        <div className="space-y-2 border-t border-line px-4 py-3 text-sm md:px-5">
          <p className="font-medium text-foreground">{video.title}</p>
          <p className="text-muted">
            Video by{" "}
            {ownerUrl ? (
              <a
                href={ownerUrl}
                className="text-foreground underline-offset-2 hover:underline"
                rel="noreferrer"
                target="_blank"
              >
                {video.owner}
              </a>
            ) : (
              <span className="text-foreground">{video.owner}</span>
            )}
            {" · "}
            <a
              href={watchUrl}
              className="underline-offset-2 hover:underline"
              rel="noreferrer"
              target="_blank"
            >
              Watch on YouTube
            </a>
          </p>
          {note ? <p className="text-xs text-muted">{note}</p> : null}
        </div>
      </div>
    </section>
  );
}
