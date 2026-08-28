import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EfficiencyFinder } from "@/components/EfficiencyFinder";
import { SITE } from "@/data/catalog";
import {
  clampMinMpg,
  DEFAULT_MIN_MPG,
  efficiencyMpgBounds,
} from "@/lib/efficiency";
import { getEfficiencyCandidates } from "@/lib/efficiency.server";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Find cars by MPG",
  description: `Slide to a minimum combined MPG and see ${SITE.name} models that meet or beat it — newest qualifying year first.`,
  alternates: { canonical: "/efficiency" },
};

type Props = {
  searchParams: Promise<{ minMpg?: string | string[] }>;
};

function parseMinMpgParam(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return DEFAULT_MIN_MPG;
  const n = Number(value);
  return Number.isFinite(n) ? n : DEFAULT_MIN_MPG;
}

export default async function EfficiencyPage({ searchParams }: Props) {
  const params = await searchParams;
  const candidates = getEfficiencyCandidates();
  const bounds = efficiencyMpgBounds(candidates);
  const initialMinMpg = clampMinMpg(parseMinMpgParam(params.minMpg), bounds);

  return (
    <div className="container-wide py-10 md:py-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Find cars by MPG", path: "/efficiency" },
        ])}
      />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Find cars by MPG" },
        ]}
      />
      <header className="mt-6 max-w-3xl">
        <h1 className="font-display text-4xl tracking-tight md:text-5xl">
          Find cars by MPG
        </h1>
        <p className="mt-3 text-muted md:text-lg">
          Set the combined MPG floor you care about. We list models that meet or
          exceed it, using the newest qualifying year in the catalog.
        </p>
      </header>

      <EfficiencyFinder
        candidates={candidates}
        bounds={bounds}
        initialMinMpg={initialMinMpg}
      />
    </div>
  );
}
