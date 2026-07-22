"use client";

import { useState } from "react";
import type { YearVideo } from "@/data/catalog";
import {
  youtubeEmbedUrl,
  youtubeThumbUrl,
  youtubeWatchUrl,
} from "@/lib/videos";

type Props = {
  video: YearVideo;
};

export function YearVideoEmbed({ video }: Props) {
  const [playing, setPlaying] = useState(false);
  const watchUrl = youtubeWatchUrl(video.youtubeId);
  const thumb = youtubeThumbUrl(video.youtubeId);

  return (
    <section className="mb-12">
      <h2 className="mb-2 font-display text-2xl tracking-tight">Video</h2>
      <p className="mb-4 max-w-2xl text-sm text-muted">
        Embedded from YouTube. We do not host or claim ownership of this video.
      </p>

      <div className="overflow-hidden rounded-lg border border-line bg-elevated">
        <div className="relative aspect-video w-full bg-black">
          {playing ? (
            <iframe
              title={video.title}
              src={`${youtubeEmbedUrl(video.youtubeId)}?autoplay=1&rel=0`}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="focus-ring group absolute inset-0 flex items-center justify-center"
              aria-label={`Play video: ${video.title}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumb}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-90 transition group-hover:opacity-100"
              />
              <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-accent text-[#071018] shadow-lg transition group-hover:scale-105">
                <svg
                  viewBox="0 0 24 24"
                  className="ml-1 h-7 w-7 fill-current"
                  aria-hidden
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </button>
          )}
        </div>

        <div className="space-y-2 border-t border-line px-4 py-3 text-sm md:px-5">
          <p className="font-medium text-foreground">{video.title}</p>
          <p className="text-muted">
            Video by{" "}
            {video.ownerUrl ? (
              <a
                href={video.ownerUrl}
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
          {video.note ? (
            <p className="text-xs text-muted">{video.note}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
