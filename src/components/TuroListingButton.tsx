"use client";

import { track } from "@vercel/analytics";
import { TURO_LINK_REL, TURO_PARTNER_LABEL } from "@/lib/rentals";

type Props = {
  href: string;
  /** Short car key for analytics + data-car ("venue" | "trax"). */
  car: "venue" | "trax";
  className?: string;
  children?: React.ReactNode;
};

/**
 * Outbound Turo CTA with sponsored rel + Vercel Analytics `turo_click`.
 */
export function TuroListingButton({
  href,
  car,
  className = "focus-ring inline-flex items-center rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-[#071018] transition hover:brightness-110",
  children = `Check dates & price on ${TURO_PARTNER_LABEL}`,
}: Props) {
  return (
    <a
      href={href}
      className={className}
      rel={TURO_LINK_REL}
      target="_blank"
      data-track="turo-click"
      data-car={car}
      onClick={() => {
        track("turo_click", { car });
      }}
    >
      {children}
    </a>
  );
}
