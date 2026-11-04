import { RENTAL_OWNER_DISCLOSURE } from "@/lib/rentals";

/** Owner disclosure shown on every /rentals page. */
export function RentalOwnerDisclosure({ className = "" }: { className?: string }) {
  return (
    <aside
      aria-label={RENTAL_OWNER_DISCLOSURE.heading}
      className={`max-w-3xl rounded-lg border border-line bg-elevated/40 px-4 py-3 text-sm leading-relaxed text-muted ${className}`}
    >
      <strong className="font-medium text-foreground">
        {RENTAL_OWNER_DISCLOSURE.heading}:
      </strong>{" "}
      {RENTAL_OWNER_DISCLOSURE.body}
    </aside>
  );
}
