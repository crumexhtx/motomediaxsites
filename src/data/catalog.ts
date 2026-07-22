/** Trust level for catalog / trim photos. */
export type ImageConfidence = "verified" | "unverified" | "yearOnly";

export type GalleryImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /**
   * How much we trust this photo for the listed vehicle.
   * - verified: human-confirmed trim + generation match
   * - yearOnly: model-year / overview photo (not trim-specific)
   * - unverified: auto-fetched or unreviewed trim candidate
   */
  confidence?: ImageConfidence;
};
export type VehicleSpecs = {
  make?: string;
  model?: string;
  modelYear?: number;
  available?: boolean;
  bodyClass?: string;
  driveType?: string;
  fuelTypePrimary?: string;
  electrificationLevel?: string;
  plantCountry?: string;
  overallRating?: string;
  frontCrashRating?: string;
  sideCrashRating?: string;
  rolloverRating?: string;
  vehicleDescription?: string;
  trimCount?: number;
  trims?: string[];
  overallLengthIn?: string;
  overallWidthIn?: string;
  overallHeightIn?: string;
  wheelbaseIn?: string;
  curbWeightLb?: string;
  /** EPA / curated efficiency */
  mpgCity?: number;
  mpgHighway?: number;
  mpgCombined?: number;
  /** EV / PHEV */
  batteryKwh?: number;
  rangeMiles?: number;
  /** Practical */
  cargoCuFt?: number;
  cargoSeatsFoldedCuFt?: number;
  towingLb?: number;
  groundClearanceIn?: number;
  seatingCapacity?: number;
  fuelTankGal?: number;
};

/** Curated performance / trim row for hero stats + trim index. */
export type TrimSpec = {
  id: string;
  name: string;
  engine?: string;
  aspiration?: string;
  horsepower?: number;
  torqueLbFt?: number;
  zeroToSixtySec?: number;
  transmission?: string;
  drivetrain?: string;
  redlineRpm?: number;
  mpgCity?: number;
  mpgHighway?: number;
  mpgCombined?: number;
  batteryKwh?: number;
  rangeMiles?: number;
  cargoCuFt?: number;
  cargoSeatsFoldedCuFt?: number;
  towingLb?: number;
  groundClearanceIn?: number;
  seatingCapacity?: number;
  curbWeightLb?: number;
  fuelTankGal?: number;
  notes?: string;
  /** Local catalog path for this trim, e.g. /catalog/toyota--camry--hybrid-le.jpg */
  image?: string;
  /** Trust level for `image` — only `verified` may replace the year hero. */
  imageConfidence?: ImageConfidence;
};

export type YearPerformance = {
  defaultTrimId?: string;
  trims: TrimSpec[];
};

export type CatalogSources = {
  wikipedia?: string;
  nhtsa?: string;
  epa?: string;
  autodev?: string;
};

/** Optional curated YouTube overview for a model year (embedded, not rehosted). */
export type YearVideo = {
  youtubeId: string;
  title: string;
  /** Channel or rights holder shown in attribution */
  owner: string;
  /** Link to the owner’s channel or profile */
  ownerUrl?: string;
  /** Extra clarity when the YouTube title year differs slightly */
  note?: string;
};

export type YearEntry = {
  year: number;
  slug: string;
  summary: string;
  description: string;
  highlights?: string[];
  images: GalleryImage[];
  specs?: VehicleSpecs;
  performance?: YearPerformance;
  video?: YearVideo;
  sources?: CatalogSources;
};

export type ModelEntry = {
  name: string;
  slug: string;
  tagline: string;
  years: YearEntry[];
  sources?: CatalogSources;
};

export type MakeEntry = {
  name: string;
  slug: string;
  country: string;
  blurb: string;
  coverImage: GalleryImage;
  models: ModelEntry[];
};

export const SITE = {
  name: "motomediax",
  tagline: "All makes. All models. Clearer browsing.",
  description:
    "Browse high-quality car photos and model overviews by make, model, and year. motomediax is a fast, search-friendly catalog for enthusiasts.",
  /** Canonical site origin. Override with NEXT_PUBLIC_SITE_URL for previews/staging. */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://motomediax.com").replace(
    /\/$/,
    "",
  ),
};
