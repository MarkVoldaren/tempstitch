import {
  AppData,
  PersistedAppEnvelope,
  Project,
  TemperatureRangeColor,
  WeatherCacheEntry,
} from "@/types/models";
import { fillBlankRangeLabels, mapTemperatureToRange, roundTemp } from "@/utils/temperature";

export const APP_DATA_VERSION = 3;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

function normalizeProject(project: Record<string, unknown>): Project {
  return {
    id: String(project.id ?? ""),
    name: String(project.name ?? "Untitled Project"),
    locationName: String(project.locationName ?? "Unknown location"),
    latitude: Number(project.latitude ?? 0),
    longitude: Number(project.longitude ?? 0),
    unit: project.unit === "celsius" ? "celsius" : "fahrenheit",
    tempMode:
      project.tempMode === "high" || project.tempMode === "low" ? project.tempMode : "avg",
    startDate: String(project.startDate ?? new Date().toISOString().slice(0, 10)),
    endDate: String(project.endDate ?? new Date().toISOString().slice(0, 10)),
    stitchesPerRow: Number(project.stitchesPerRow ?? 180),
    rowHeight: Number(project.rowHeight ?? 12),
    craftType: project.craftType === "knit" ? "knit" : "crochet",
    stitchName: String(project.stitchName ?? "Single crochet"),
    previewOrientation: project.previewOrientation === "vertical" ? "vertical" : "horizontal",
    notes: typeof project.notes === "string" ? project.notes : "",
    allowRangeGaps: Boolean(project.allowRangeGaps),
    preferredYarnBrandId:
      typeof project.preferredYarnBrandId === "string" ? project.preferredYarnBrandId : null,
    recommendationMode:
      project.recommendationMode === "brand-palette-only" ||
      project.recommendationMode === "manual-only"
        ? project.recommendationMode
        : "exact-nearest",
    weatherSource:
      project.weatherSource === "open-meteo" ||
      project.weatherSource === "mock" ||
      project.weatherSource === "cached" ||
      project.weatherSource === "demo"
        ? project.weatherSource
        : "demo",
    weatherSourceLabel: String(project.weatherSourceLabel ?? "Demo data"),
    weatherStatusMessage:
      typeof project.weatherStatusMessage === "string" ? project.weatherStatusMessage : null,
    archivedAt: typeof project.archivedAt === "string" ? project.archivedAt : null,
    createdAt: String(project.createdAt ?? new Date().toISOString()),
    updatedAt: String(project.updatedAt ?? new Date().toISOString()),
  };
}

function normalizeRange(range: Record<string, unknown>): TemperatureRangeColor {
  return {
    id: String(range.id ?? ""),
    projectId: String(range.projectId ?? ""),
    minTemp: Number(range.minTemp ?? 0),
    maxTemp: Number(range.maxTemp ?? 0),
    hexColor: String(range.hexColor ?? "#A98467"),
    label: String(range.label ?? ""),
    yarnName: String(range.yarnName ?? "Shade"),
    notes: typeof range.notes === "string" ? range.notes : "",
    recommendedYarnColorId:
      typeof range.recommendedYarnColorId === "string" ? range.recommendedYarnColorId : null,
    recommendedYarnBrandId:
      typeof range.recommendedYarnBrandId === "string" ? range.recommendedYarnBrandId : null,
    lockedToRecommendedYarn: Boolean(range.lockedToRecommendedYarn),
    userOverrodeRecommendation: Boolean(range.userOverrodeRecommendation),
    sortOrder: Number(range.sortOrder ?? 0),
  };
}

function normalizeWeatherCache(entry: Record<string, unknown>): WeatherCacheEntry {
  return {
    key: String(entry.key ?? ""),
    projectId: typeof entry.projectId === "string" ? entry.projectId : undefined,
    fetchedAt: String(entry.fetchedAt ?? new Date().toISOString()),
    startDate: String(entry.startDate ?? new Date().toISOString().slice(0, 10)),
    endDate: String(entry.endDate ?? new Date().toISOString().slice(0, 10)),
    latitude: Number(entry.latitude ?? 0),
    longitude: Number(entry.longitude ?? 0),
    unit: entry.unit === "celsius" ? "celsius" : "fahrenheit",
    source:
      entry.source === "open-meteo" ||
      entry.source === "mock" ||
      entry.source === "cached" ||
      entry.source === "demo"
        ? entry.source
        : "demo",
    providerLabel: String(entry.providerLabel ?? "Demo data"),
    missingDays: Number(entry.missingDays ?? 0),
    warningMessage: typeof entry.warningMessage === "string" ? entry.warningMessage : null,
    fallbackReason: typeof entry.fallbackReason === "string" ? entry.fallbackReason : null,
    daily: Array.isArray(entry.daily)
      ? entry.daily.map((day) => ({
          date: String((day as Record<string, unknown>).date ?? ""),
          tempHigh: toNullableNumber((day as Record<string, unknown>).tempHigh),
          tempLow: toNullableNumber((day as Record<string, unknown>).tempLow),
          tempAvg: toNullableNumber((day as Record<string, unknown>).tempAvg),
        }))
      : [],
  };
}

export function migrateAppData(raw: unknown): AppData {
  if (!isObject(raw)) {
    throw new Error("Saved data was not a valid object.");
  }

  const maybeEnvelope = raw as Partial<PersistedAppEnvelope>;
  const container = isObject(maybeEnvelope.data) ? maybeEnvelope.data : raw;

  if (!isObject(container)) {
    throw new Error("Saved data was missing the expected structure.");
  }

  const projects = Array.isArray(container.projects)
    ? container.projects.filter(isObject).map(normalizeProject)
    : [];

  const ranges = Array.isArray(container.ranges)
    ? container.ranges.filter(isObject).map(normalizeRange)
    : [];

  const temperatureDays = Array.isArray(container.temperatureDays)
    ? container.temperatureDays
        .filter(isObject)
        .map((day) => ({
          id: String(day.id ?? ""),
          projectId: String(day.projectId ?? ""),
          date: String(day.date ?? ""),
          tempHigh: toNullableNumber(day.tempHigh),
          tempLow: toNullableNumber(day.tempLow),
          tempAvg: toNullableNumber(day.tempAvg),
          selectedTemp: toNullableNumber(day.selectedTemp),
          mappedRangeId: typeof day.mappedRangeId === "string" ? day.mappedRangeId : null,
          mappedColor: typeof day.mappedColor === "string" ? day.mappedColor : null,
          missingData: Boolean(day.missingData),
        }))
    : [];

  const progressRows = Array.isArray(container.progressRows)
    ? container.progressRows
        .filter(isObject)
        .map((row) => ({
          id: String(row.id ?? ""),
          projectId: String(row.projectId ?? ""),
          date: String(row.date ?? ""),
          rowNumber: Number(row.rowNumber ?? 0),
          completed: Boolean(row.completed),
          completedAt: typeof row.completedAt === "string" ? row.completedAt : null,
        }))
    : [];

  const weatherCache = Array.isArray(container.weatherCache)
    ? container.weatherCache.filter(isObject).map(normalizeWeatherCache)
    : [];

  const rangeMapByProject = new Map<string, TemperatureRangeColor[]>();
  ranges.forEach((range) => {
    const current = rangeMapByProject.get(range.projectId) ?? [];
    current.push(range);
    rangeMapByProject.set(range.projectId, current);
  });

  const projectMap = new Map(projects.map((project) => [project.id, project]));
  const remappedTemperatureDays = temperatureDays.map((day) => {
    const project = projectMap.get(day.projectId);
    if (!project) {
      return day;
    }

    const projectRanges = fillBlankRangeLabels(
      (rangeMapByProject.get(day.projectId) ?? []).sort((left, right) => left.sortOrder - right.sortOrder),
    );
    const sourceValue =
      project.tempMode === "high"
        ? day.tempHigh
        : project.tempMode === "low"
          ? day.tempLow
          : day.tempAvg;
    const selectedTemp = roundTemp(sourceValue);
    const mappedRange = mapTemperatureToRange(selectedTemp, projectRanges);

    return {
      ...day,
      selectedTemp,
      mappedRangeId: mappedRange?.id ?? null,
      mappedColor: mappedRange?.hexColor ?? null,
    };
  });

  return {
    projects,
    ranges,
    temperatureDays: remappedTemperatureDays,
    progressRows,
    weatherCache,
  };
}

export function serializeAppData(data: AppData): PersistedAppEnvelope {
  return {
    version: APP_DATA_VERSION,
    savedAt: new Date().toISOString(),
    data,
  };
}
