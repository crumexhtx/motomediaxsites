export default function YearLoading() {
  return (
    <div aria-busy="true">
      <div className="relative min-h-[42vh] overflow-hidden bg-soft md:min-h-[52vh]">
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-black/40 to-transparent" />
        <div className="container-wide relative flex min-h-[42vh] flex-col justify-end pb-10 pt-24 md:min-h-[52vh]">
          <div className="h-3 w-48 animate-pulse rounded bg-white/20" />
          <div className="mt-5 h-10 w-2/3 max-w-lg animate-pulse rounded bg-white/25" />
          <div className="mt-4 h-4 w-full max-w-md animate-pulse rounded bg-white/15" />
        </div>
      </div>
      <div className="container-wide py-10 md:py-14">
        <div className="h-3 w-28 animate-pulse rounded bg-soft" />
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="h-8 w-16 animate-pulse rounded-md bg-soft" />
          <div className="h-8 w-16 animate-pulse rounded-md bg-soft" />
          <div className="h-8 w-16 animate-pulse rounded-md bg-soft" />
        </div>
        <div className="mt-10 h-8 w-40 animate-pulse rounded bg-soft" />
        <div className="mt-4 space-y-3">
          <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-soft" />
          <div className="h-4 w-full max-w-xl animate-pulse rounded bg-soft" />
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="aspect-[3/2] animate-pulse rounded-lg bg-soft" />
          <div className="aspect-[3/2] animate-pulse rounded-lg bg-soft" />
          <div className="aspect-[3/2] animate-pulse rounded-lg bg-soft" />
        </div>
      </div>
    </div>
  );
}
