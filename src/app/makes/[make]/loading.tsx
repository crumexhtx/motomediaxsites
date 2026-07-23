export default function MakeLoading() {
  return (
    <div className="container-wide py-10 md:py-14" aria-busy="true">
      <div className="h-4 w-40 animate-pulse rounded bg-soft" />
      <div className="mt-6 h-10 w-48 animate-pulse rounded bg-soft" />
      <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded bg-soft" />
      <div className="mt-10 space-y-3">
        <div className="h-28 animate-pulse rounded-xl bg-soft" />
        <div className="h-28 animate-pulse rounded-xl bg-soft" />
        <div className="h-28 animate-pulse rounded-xl bg-soft" />
        <div className="h-28 animate-pulse rounded-xl bg-soft" />
      </div>
    </div>
  );
}
