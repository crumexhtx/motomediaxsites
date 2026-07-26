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
  /** NHTSA recalls API used for this year entry. */
  recalls?: string;
  /** NHTSA complaints API used for this year entry. */
  complaints?: string;
};

/** Safety recall row from NHTSA (curated subset for used-buyer pages). */
export type YearRecall = {
  /** NHTSA campaign number, e.g. 20V771000 */
  campaignNumber: string;
  /** Report received date (YYYY-MM-DD when parseable). */
  date: string;
  component: string;
  summary: string;
};

/** Aggregated owner complaints for a model year (not raw narratives). */
export type YearComplaintSummary = {
  total: number;
  crashCount: number;
  fireCount: number;
  injuryCount: number;
  /** Top components by complaint count. */
  byComponent: Array<{ component: string; count: number }>;
};

/** Offline enrich status so failed fetches are visible, not silent gaps. */
export type YearSafetyStatus = {
  recalls: "ok" | "empty" | "error";
  complaints: "ok" | "empty" | "error";
  recallsError?: string;
  complaintsError?: string;
  fetchedAt?: string;
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
  recalls?: YearRecall[];
  complaints?: YearComplaintSummary;
  safetyStatus?: YearSafetyStatus;
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
  name: "MotoMediaX",
  /** Compact mark for nav monogram, favicon, and short credits. */
  shortName: "MMX",
  tagline: "Compare years. Check recalls. Buy used with confidence.",
  description:
    "Compare model years, check NHTSA recalls and owner complaints, and decide which used car year to buy — with photos, specs, and year-over-year changes.",
  /** Canonical site origin. Override with NEXT_PUBLIC_SITE_URL for previews/staging. */
  url: (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.motomediax.com"
  ).replace(/\/$/, ""),
};
