"use client";

import { CatalogImage } from "@/components/CatalogImage";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { GalleryImage } from "@/data/catalog";

export function Gallery({ images }: { images: GalleryImage[] }) {
  const [active, setActive] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  const close = useCallback(() => setActive(null), []);
  const showPrev = useCallback(() => {
    setActive((current) => {
      if (current === null) return current;
      return (current - 1 + images.length) % images.length;
    });
  }, [images.length]);
  const showNext = useCallback(() => {
    setActive((current) => {
      if (current === null) return current;
      return (current + 1) % images.length;
    });
  }, [images.length]);

  useEffect(() => {
    if (active === null) {
      lastFocusedRef.current?.focus();
      lastFocusedRef.current = null;
      return;
    }

    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPrev();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        showNext();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;

      if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [active, close, showNext, showPrev]);

  if (!images.length) {
    return (
      <p className="text-sm text-muted">No photos available for this entry yet.</p>
    );
  }

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((image, index) => (
          <li key={`${image.src}-${index}`}>
            <button
              type="button"
              className="focus-ring group relative block aspect-[3/2] w-full overflow-hidden rounded-lg border border-line bg-elevated"
              onClick={() => setActive(index)}
              aria-label={`Open photo ${index + 1}: ${image.alt}`}
            >
              <CatalogImage
                src={image.src}
                alt={image.alt}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition duration-500 group-hover:scale-[1.03]"
              />
            </button>
          </li>
        ))}
      </ul>

      {active !== null ? (
        <div
          ref={dialogRef}
          className="gallery-enter fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={close}
        >
          <p id={titleId} className="sr-only">
            Photo viewer: {images[active].alt}
          </p>
          <button
            ref={closeButtonRef}
            type="button"
            className="focus-ring absolute right-4 top-4 rounded-md border border-line bg-elevated px-3 py-2 text-sm"
            onClick={close}
            aria-label="Close photo viewer"
          >
            Close
          </button>
          <button
            type="button"
            className="focus-ring absolute left-4 top-1/2 -translate-y-1/2 rounded-md border border-line bg-elevated px-3 py-2 text-sm"
            onClick={(event) => {
              event.stopPropagation();
              showPrev();
            }}
            aria-label="Previous photo"
          >
            Prev
          </button>
          <button
            type="button"
            className="focus-ring absolute right-4 top-1/2 -translate-y-1/2 rounded-md border border-line bg-elevated px-3 py-2 text-sm"
            onClick={(event) => {
              event.stopPropagation();
              showNext();
            }}
            aria-label="Next photo"
          >
            Next
          </button>
          <div
            className="relative h-[70vh] w-full max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            <CatalogImage
              src={images[active].src}
              alt={images[active].alt}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>
          <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm text-muted">
            {active + 1} / {images.length}
          </p>
        </div>
      ) : null}
    </>
  );
}
