export default function CatalogLoading() {
  return (
    <div className="container-wide py-10 md:py-14" aria-busy="true">
      <div className="h-4 w-40 animate-pulse rounded bg-soft" />
      <div className="mt-6 h-10 w-2/3 max-w-md animate-pulse rounded bg-soft" />
      <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded bg-soft" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="aspect-[16/10] animate-pulse rounded-xl bg-soft" />
        <div className="aspect-[16/10] animate-pulse rounded-xl bg-soft" />
        <div className="aspect-[16/10] animate-pulse rounded-xl bg-soft" />
        <div className="aspect-[16/10] animate-pulse rounded-xl bg-soft" />
        <div className="aspect-[16/10] animate-pulse rounded-xl bg-soft" />
        <div className="aspect-[16/10] animate-pulse rounded-xl bg-soft" />
      </div>
    </div>
  );
}
