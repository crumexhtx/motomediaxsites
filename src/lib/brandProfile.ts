import brandProfiles from "@/data/brand-profiles.json";

export type BrandProfile = {
  founded: string;
  headquarters: string;
  parent?: string;
  focus: string;
  history: string;
};

const BY_SLUG = brandProfiles as Record<string, BrandProfile>;

export function getBrandProfile(makeSlug: string): BrandProfile | undefined {
  return BY_SLUG[makeSlug.toLowerCase()];
}
