"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SITE } from "@/data/catalog";

const links = [
  { href: "/makes", label: "Makes" },
  { href: "/search", label: "Search" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-line/50 bg-[var(--bg)]/95 backdrop-blur-md">
      <div className="container-wide flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="focus-ring flex items-baseline gap-2.5"
          onClick={() => setOpen(false)}
          aria-label={SITE.name}
        >
          <span className="font-display text-xs font-bold tracking-[0.22em] text-accent">
            {SITE.shortName}
          </span>
          <span className="hidden font-display text-xl tracking-tight sm:inline">
            {SITE.name}
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {links.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`focus-ring text-sm transition-colors ${
                  active ? "text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md border border-line text-sm md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <span aria-hidden="true">{open ? "✕" : "☰"}</span>
        </button>
      </div>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 top-16 z-30 bg-black/55 md:hidden"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <nav
            id="mobile-nav"
            className="relative z-40 border-t border-line bg-[var(--bg)] md:hidden"
            aria-label="Mobile"
          >
            <div className="container-wide flex flex-col gap-1 py-3">
              {links.map((link) => {
                const active =
                  pathname === link.href ||
                  pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`focus-ring rounded-md px-2 py-3 text-sm transition-colors ${
                      active
                        ? "bg-soft text-foreground"
                        : "text-muted hover:bg-soft hover:text-foreground"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </>
      ) : null}
    </header>
  );
}
