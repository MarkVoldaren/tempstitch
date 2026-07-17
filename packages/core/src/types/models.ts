export type TemperatureUnit = "fahrenheit" | "celsius";
export type TemperatureMode = "avg" | "high" | "low";
export type CraftType = "crochet" | "knit";
export type PreviewOrientation = "vertical" | "horizontal";
export type WeatherDataSource = "open-meteo" | "mock" | "cached" | "demo";
export type WeatherFallbackMode = "none" | "allowMock" | "mockOnly";
export type RecommendationMode = "exact-nearest" | "brand-palette-only" | "manual-only";
export type ColorScaleMode = "shared" | "per-location";

export type LocationSuggestion = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
};

export type LocationDraft = {
  query: string;
  name: string;
  latitude: number;
  longitude: number;
};

export type Project = {
  id: string;
  name: string;
  locationName: string;
  latitude: number;
  longitude: number;
  unit: TemperatureUnit;
  tempMode: TemperatureMode;
  startDate: string;
  endDate: string;
  stitchesPerRow: number;
  rowHeight: number;
  craftType: CraftType;
  stitchName: string;
  previewOrientation: PreviewOrientation;
  notes?: string;
  allowRangeGaps: boolean;
  preferredYarnBrandId?: string | null;
  recommendationMode: RecommendationMode;
  colorScaleMode: ColorScaleMode;
  weatherSource: WeatherDataSource;
  weatherSourceLabel: string;
  weatherStatusMessage?: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectLocationAssignment = {
  id: string;
  projectId: string;
  locationName: string;
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
  sortOrder: number;
  weatherSource: WeatherDataSource;
  weatherSourceLabel: string;
  weatherStatusMessage?: string | null;
};

export type ProjectLocationDraft = {
  id?: string;
  location: LocationDraft;
  startDate: string;
  endDate: string;
  sortOrder: number;
};

export type TemperatureRangeColor = {
  id: string;
  projectId: string;
  projectLocationId: string | null;
  minTemp: number;
  maxTemp: number;
  hexColor: string;
  label: string;
  yarnName: string;
  notes?: string;
  recommendedYarnColorId?: string | null;
  recommendedYarnBrandId?: string | null;
  lockedToRecommendedYarn?: boolean;
  userOverrodeRecommendation?: boolean;
  sortOrder: number;
};

export type YarnBrand = {
  id: string;
  name: string;
  description: string;
  websiteUrl?: string;
  weightOptions?: string[];
  fiberNotes?: string;
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
};

export type YarnColor = {
  id: string;
  brandId: string;
  name: string;
  code?: string;
  hex: string;
  family?: string;
  brightness?: number;
  saturation?: number;
  seasonalTags?: string[];
  retired?: boolean;
  notes?: string;
};

export type YarnRecommendation = {
  yarnColorId: string;
  brandId: string;
  colorName: string;
  hex: string;
  score: number;
  distance: number;
  explanation: string;
  matchQuality: "close" | "fair" | "weak";
};

export type TemperatureDay = {
  id: string;
  projectId: string;
  projectLocationId: string;
  date: string;
  tempHigh: number | null;
  tempLow: number | null;
  tempAvg: number | null;
  selectedTemp: number | null;
  mappedRangeId: string | null;
  mappedColor: string | null;
  missingData?: boolean;
};

export type BuildProgressRow = {
  id: string;
  projectId: string;
  date: string;
  rowNumber: number;
  completed: boolean;
  completedAt: string | null;
};

export type WeatherDayRecord = {
  date: string;
  tempHigh: number | null;
  tempLow: number | null;
  tempAvg: number | null;
};

export type LocatedWeatherDayRecord = WeatherDayRecord & {
  projectLocationId: string;
};

export type WeatherSourceInfo = {
  source: WeatherDataSource;
  providerLabel: string;
  missingDays: number;
  warningMessage?: string | null;
  fallbackReason?: string | null;
};

export type WeatherCacheEntry = WeatherSourceInfo & {
  key: string;
  projectId?: string;
  fetchedAt: string;
  startDate: string;
  endDate: string;
  latitude: number;
  longitude: number;
  unit: TemperatureUnit;
  daily: WeatherDayRecord[];
};

export type AppData = {
  projects: Project[];
  projectLocations: ProjectLocationAssignment[];
  ranges: TemperatureRangeColor[];
  temperatureDays: TemperatureDay[];
  progressRows: BuildProgressRow[];
  weatherCache: WeatherCacheEntry[];
};

export type PersistedAppEnvelope = {
  version: number;
  savedAt: string;
  data: AppData;
};

export type ProjectDraftInput = {
  id?: string;
  name: string;
  locations: ProjectLocationDraft[];
  unit: TemperatureUnit;
  tempMode: TemperatureMode;
  startDate: string;
  endDate: string;
  stitchesPerRow: number;
  rowHeight: number;
  craftType: CraftType;
  stitchName: string;
  previewOrientation: PreviewOrientation;
  notes?: string;
  allowRangeGaps: boolean;
  preferredYarnBrandId?: string | null;
  recommendationMode: RecommendationMode;
  colorScaleMode: ColorScaleMode;
  ranges?: TemperatureRangeColor[];
};

export type RangeValidationResult = {
  overlaps: string[];
  gaps: string[];
  outOfSpan: boolean;
  adjacentDuplicateWarnings: string[];
  isValid: boolean;
};

export type ProjectExportBundle = {
  version: number;
  exportedAt: string;
  project: Project;
  projectLocations: ProjectLocationAssignment[];
  ranges: TemperatureRangeColor[];
  temperatureDays: TemperatureDay[];
  progressRows: BuildProgressRow[];
};
