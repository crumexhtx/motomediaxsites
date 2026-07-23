import type { MetadataRoute } from "next";
import { SITE } from "@/data/catalog";
import { getCatalogMtime } from "@/data/catalog.server";
import {
  getAllMakeParams,
  getAllModelParams,
  getAllYearParams,
} from "@/lib/catalog";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE.url;
  const lastModified = getCatalogMtime();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified, changeFrequency: "weekly", priority: 1 },
    {
      url: `${base}/makes`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${base}/search`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${base}/about`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  const makes = getAllMakeParams().map(({ make }) => ({
    url: `${base}/makes/${make}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const models = getAllModelParams().map(({ make, model }) => ({
    url: `${base}/makes/${make}/${model}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const years = getAllYearParams().map(({ make, model, year }) => ({
    url: `${base}/makes/${make}/${model}/${year}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.85,
  }));

  return [...staticRoutes, ...makes, ...models, ...years];
}
