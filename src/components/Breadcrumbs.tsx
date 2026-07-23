import Link from "next/link";

export type Crumb = {
  label: string;
  href?: string;
};

type Props = {
  items: Crumb[];
  /** Use on photo heroes so crumbs stay readable over dark media. */
  tone?: "default" | "onDark";
};

export function Breadcrumbs({ items, tone = "default" }: Props) {
  const onDark = tone === "onDark";

  return (
    <nav
      aria-label="Breadcrumb"
      className={onDark ? "text-sm text-white/70" : "text-sm text-muted"}
    >
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className={
                    onDark
                      ? "focus-ring hover:text-white"
                      : "focus-ring hover:text-foreground"
                  }
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={
                    isLast
                      ? onDark
                        ? "text-white"
                        : "text-foreground"
                      : undefined
                  }
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className={onDark ? "text-white/40" : undefined}
                >
                  /
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
