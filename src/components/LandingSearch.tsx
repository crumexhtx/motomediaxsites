/**
 * Compact GET form → /search. Server-rendered (no JS required).
 */
export function LandingSearch({
  className = "",
  tone = "hero",
}: {
  className?: string;
  tone?: "hero" | "page";
}) {
  const inputClass =
    tone === "hero"
      ? "focus-ring w-full rounded-md border border-white/25 bg-black/45 px-4 py-3 text-base text-white outline-none placeholder:text-white/45"
      : "focus-ring w-full rounded-md border border-line bg-elevated px-4 py-3 text-base outline-none placeholder:text-muted";

  const buttonClass =
    tone === "hero"
      ? "focus-ring shrink-0 rounded-md bg-accent px-5 py-3 text-sm font-semibold text-[#071018] transition hover:brightness-110"
      : "focus-ring shrink-0 rounded-md bg-accent px-5 py-3 text-sm font-semibold text-[#071018] transition hover:brightness-110";

  return (
    <form
      action="/search"
      method="get"
      role="search"
      className={`flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:items-stretch ${className}`}
    >
      <label className="sr-only" htmlFor="landing-search-q">
        Search makes, models, or years
      </label>
      <input
        id="landing-search-q"
        type="search"
        name="q"
        placeholder="Try F-150, f150, Camry, 2024…"
        className={inputClass}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
      />
      <button type="submit" className={buttonClass}>
        Search
      </button>
    </form>
  );
}
