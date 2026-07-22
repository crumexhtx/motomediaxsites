import type { MetadataRoute } from "next";
import { SITE } from "@/data/catalog";
import {
  getAllMakeParams,
  getAllModelParams,
  getAllYearParams,
} from "@/lib/catalog";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE.url;

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    {
      url: `${base}/makes`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${base}/search`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${base}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  const makes = getAllMakeParams().map(({ make }) => ({
    url: `${base}/makes/${make}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const models = getAllModelParams().map(({ make, model }) => ({
    url: `${base}/makes/${make}/${model}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const years = getAllYearParams().map(({ make, model, year }) => ({
    url: `${base}/makes/${make}/${model}/${year}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.85,
  }));

  return [...staticRoutes, ...makes, ...models, ...years];
}
