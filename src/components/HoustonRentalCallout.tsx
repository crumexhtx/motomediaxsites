import Link from "next/link";
import { HOBBY_AIRPORT_PATH, TURO_HOST } from "@/lib/rentals";

/**
 * Small, secondary callout on catalog pages for models the site owner also
 * rents out in Houston. Links to the on-site rental page (not straight to Turo).
 */
export function HoustonRentalCallout({
  makeName,
  modelName,
  className = "",
}: {
  makeName: string;
  modelName: string;
  className?: string;
}) {
  return (
    <aside
      aria-label={`Rent a ${makeName} ${modelName} in Houston`}
      className={`max-w-3xl rounded-lg border border-line bg-elevated/40 px-4 py-3 text-sm leading-relaxed text-muted ${className}`}
    >
      Want to try one first?{" "}
      <Link
        href={HOBBY_AIRPORT_PATH}
        className="focus-ring font-medium text-accent underline-offset-2 hover:underline"
      >
        Rent one in Houston (near Hobby Airport)
      </Link>{" "}
      from {TURO_HOST.name}, a {TURO_HOST.rating.toFixed(1)}-star Turo host
      with {TURO_HOST.tripsCompleted} completed trips.
    </aside>
  );
}
