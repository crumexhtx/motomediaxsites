"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

type Props = Omit<ImageProps, "src"> & {
  src: string;
  /** Shown if the primary src fails to load (e.g. missing local catalog file). */
  fallbackSrc?: string;
};

/**
 * Catalog photos often come from Wikimedia. Next's image optimizer proxies
 * those URLs and quickly hits HTTP 429. Local `/catalog/*` and `/brands/*`
 * assets stay optimized; remote URLs skip the optimizer.
 */
export function CatalogImage({ src, alt, fallbackSrc, ...rest }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const primaryFailed = failedSrc === src;
  const fallbackFailed = Boolean(fallbackSrc && failedSrc === fallbackSrc);
  const displaySrc =
    primaryFailed && fallbackSrc && !fallbackFailed ? fallbackSrc : src;
  const isRemote = /^https?:\/\//i.test(displaySrc);

  if (primaryFailed && (!fallbackSrc || fallbackFailed)) {
    return (
      <span
        className="absolute inset-0 bg-soft"
        aria-hidden={alt ? undefined : true}
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
      />
    );
  }

  return (
    <Image
      {...rest}
      src={displaySrc}
      alt={alt}
      unoptimized={isRemote}
      onError={() => setFailedSrc(displaySrc)}
    />
  );
}
