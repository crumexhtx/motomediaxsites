export default function ModelLoading() {
  return (
    <div className="container-wide py-10 md:py-14" aria-busy="true">
      <div className="h-4 w-52 animate-pulse rounded bg-soft" />
      <div className="mt-6 h-10 w-56 animate-pulse rounded bg-soft" />
      <div className="mt-4 h-4 w-full max-w-lg animate-pulse rounded bg-soft" />
      <div className="mt-8 flex flex-wrap gap-2">
        <div className="h-8 w-16 animate-pulse rounded-md bg-soft" />
        <div className="h-8 w-16 animate-pulse rounded-md bg-soft" />
        <div className="h-8 w-16 animate-pulse rounded-md bg-soft" />
      </div>
      <div className="mt-10 space-y-3">
        <div className="h-28 animate-pulse rounded-xl bg-soft" />
        <div className="h-28 animate-pulse rounded-xl bg-soft" />
        <div className="h-28 animate-pulse rounded-xl bg-soft" />
      </div>
    </div>
  );
}
