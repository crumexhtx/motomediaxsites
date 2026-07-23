type Props = {
  message: string;
  lastYear: number;
  modelName: string;
};

export function DiscontinuedBanner({ message, lastYear, modelName }: Props) {
  return (
    <aside
      className="mb-10 border-l-2 border-accent bg-[var(--accent-soft)]/50 px-4 py-3 md:px-5"
      role="note"
    >
      <p className="text-xs uppercase tracking-[0.16em] text-muted">
        Discontinued · Final catalog year {lastYear}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-foreground md:text-base">
        {message}
      </p>
      <p className="mt-1 text-sm text-muted">
        Showing the {lastYear} {modelName} overview for historical browsing.
      </p>
    </aside>
  );
}
