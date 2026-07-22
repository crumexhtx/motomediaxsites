import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-wide flex min-h-[60vh] flex-col items-start justify-center py-16">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">404</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight md:text-5xl">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-muted">
        That make, model, or year isn’t in the catalog. Try browsing from the
        start.
      </p>
      <Link
        href="/makes"
        className="focus-ring mt-8 inline-flex rounded-md bg-accent px-5 py-3 text-sm font-semibold text-[#071018]"
      >
        Browse makes
      </Link>
    </div>
  );
}
