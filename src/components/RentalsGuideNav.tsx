import Link from "next/link";
import { RENTAL_GUIDES } from "@/lib/rentals";

type Props = {
  /** Current path, e.g. `/rentals/houston`. Hub uses `/rentals`. */
  currentPath: string;
};

/** In-section links between rentals guides (compare-index card pattern). */
export function RentalsGuideNav({ currentPath }: Props) {
  return (
    <nav aria-label="Rentals guides" className="mt-10">
      <p className="mb-3 text-xs uppercase tracking-[0.16em] text-muted">
        In this section
      </p>
      <ul className="grid gap-3 md:grid-cols-3">
        {RENTAL_GUIDES.map((guide) => {
          const active = currentPath === guide.href;
          return (
            <li key={guide.href}>
              <Link
                href={guide.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "focus-ring block rounded-lg border border-accent bg-[var(--accent-soft)] px-4 py-4"
                    : "focus-ring block rounded-lg border border-line bg-elevated/40 px-4 py-4 transition hover:border-accent/40"
                }
              >
                <p className="font-display text-lg tracking-tight">
                  {guide.shortTitle}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {guide.description}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
