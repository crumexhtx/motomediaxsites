export default function CatalogLoading() {
  return (
    <div className="container-wide py-10 md:py-14" aria-busy="true">
      <div className="h-4 w-48 animate-pulse rounded bg-soft" />
      <div className="mt-6 h-10 w-1/2 max-w-sm animate-pulse rounded bg-soft" />
      <div className="mt-4 h-4 w-full max-w-lg animate-pulse rounded bg-soft" />
      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="aspect-[3/2] animate-pulse rounded-lg bg-soft" />
        <div className="aspect-[3/2] animate-pulse rounded-lg bg-soft" />
        <div className="aspect-[3/2] animate-pulse rounded-lg bg-soft" />
      </div>
    </div>
  );
}
