"use client";

import { useId, useState, type ReactNode } from "react";

const toggleClass =
  "focus-ring mt-1.5 text-xs font-medium text-accent underline-offset-2 hover:underline";

/**
 * Long prose with a CSS line clamp + show more / show less toggle.
 * The full text is always in the HTML (crawlable); nothing is cut with "…".
 */
export function ExpandableText({
  text,
  className = "",
  /** Show the toggle only when the text is longer than this many characters. */
  threshold = 220,
}: {
  text: string;
  className?: string;
  threshold?: number;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const long = text.length > threshold;

  return (
    <div>
      <p
        id={id}
        className={`${className} ${long && !open ? "line-clamp-3" : ""}`.trim()}
      >
        {text}
      </p>
      {long ? (
        <button
          type="button"
          className={toggleClass}
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

/**
 * A list that shows the first `initial` items and expands to all of them.
 */
export function ExpandableList({
  items,
  initial = 3,
  className = "",
  noun = "vehicles",
}: {
  items: ReactNode[];
  initial?: number;
  className?: string;
  noun?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const hidden = Math.max(0, items.length - initial);

  return (
    <div>
      <ul id={id} className={className}>
        {items.map((item, i) => (
          <li key={i} hidden={!open && i >= initial}>
            {item}
          </li>
        ))}
      </ul>
      {hidden > 0 ? (
        <button
          type="button"
          className={toggleClass}
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Show fewer" : `Show ${hidden} more ${noun}`}
        </button>
      ) : null}
    </div>
  );
}
