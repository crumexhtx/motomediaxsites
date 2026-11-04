import Image from "next/image";
import { TURO_HOST, TURO_PARTNER_LABEL } from "@/lib/rentals";

type Props = {
  className?: string;
  /** Compact one-liner under fleet cards vs. a fuller intro block. */
  compact?: boolean;
};

/**
 * Visible host trust signals from Turo. Plain HTML only — never AggregateRating
 * or Review JSON-LD for off-site ratings.
 */
export function RentalHostCard({ className = "", compact = false }: Props) {
  const { name, rating, tripsCompleted, hostingLabel, photo } = TURO_HOST;

  return (
    <aside
      aria-label={`Hosted by ${name} on ${TURO_PARTNER_LABEL}`}
      className={`overflow-hidden rounded-lg border border-line bg-elevated/40 ${className}`}
    >
      <div className="relative w-full bg-soft" style={{ aspectRatio: "758 / 150" }}>
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes="(max-width: 768px) 100vw, 720px"
          className="object-contain object-left"
        />
      </div>
      <div className={compact ? "px-4 py-3" : "px-5 py-4"}>
        <p className="font-display text-lg tracking-tight">
          Hosted by {name} on {TURO_PARTNER_LABEL}
        </p>
        <p className="mt-1 text-sm text-muted">
          <span className="font-medium text-foreground">
            {rating.toFixed(1)}★
          </span>
          {" · "}
          {tripsCompleted} trips completed
          {" · "}
          {hostingLabel}
        </p>
        {!compact ? (
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Ratings and trip counts come from {TURO_PARTNER_LABEL} and can
            change. Confirm the current host profile on the live listing before
            you book.
          </p>
        ) : null}
      </div>
    </aside>
  );
}
