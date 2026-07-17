"use client";

import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import {
  applyRangesToDays, applyYarnRecommendationsToRanges, autoGenerateRanges, createDemoAppData,
  createId, createWeatherService, fillBlankRangeLabels, getProjectDays, getProjectLocations,
  getProjectProgressRows, getProjectRanges, getTemperatureSpan, migrateAppData, sortProjects,
  type AppData, type BuildProgressRow, type FetchWeatherResult, type LocatedWeatherDayRecord,
  type LocationSuggestion, type Project, type ProjectDraftInput, type ProjectExportBundle,
  type ProjectLocationAssignment, type ProjectLocationDraft, type TemperatureRangeColor,
  type WeatherCacheEntry, type WeatherDayRecord, type WeatherFallbackMode,
} from "@temperature-blanket/core";
import { useAuth } from "./AuthProvider";
import { createWebStorageAdapter } from "@/lib/storage";

type SaveProjectOptions = { fallbackMode?: WeatherFallbackMode };
type LocationFetch = { location: ProjectLocationDraft; result: FetchWeatherResult };
type CombinedWeather = Omit<FetchWeatherResult, "daily"> & { daily: LocatedWeatherDayRecord[]; locationResults: LocationFetch[] };

type AppDataContextValue = {
  data: AppData; initializing: boolean; busy: boolean; error: string | null; clearError: () => void;
  searchLocations: (query: string) => Promise<LocationSuggestion[]>;
  previewWeather: (input: ProjectDraftInput, fallbackMode?: WeatherFallbackMode) => Promise<FetchWeatherResult>;
  saveProject: (input: ProjectDraftInput, options?: SaveProjectOptions) => Promise<{ projectId: string; weather: FetchWeatherResult }>;
  saveRanges: (projectId: string, ranges: TemperatureRangeColor[], allowRangeGaps: boolean) => Promise<void>;
  toggleRowCompleted: (projectId: string, rowId: string, completed: boolean) => Promise<void>;
  resetProjectProgress: (projectId: string) => Promise<void>;
  duplicateProject: (projectId: string) => Promise<string>;
  resyncProjectWeather: (projectId: string, fallbackMode?: WeatherFallbackMode, projectLocationId?: string) => Promise<void>;
  exportProjectJson: (projectId: string) => string;
  importProjectsFromJson: (payload: string) => Promise<number>;
  archiveProject: (projectId: string) => Promise<void>;
  restoreProject: (projectId: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  getProjectById: (projectId: string) => Project | undefined;
};

const defaultData: AppData = { projects: [], projectLocations: [], ranges: [], temperatureDays: [], progressRows: [], weatherCache: [] };
const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);
const weatherService = createWeatherService();

function buildCacheKey(latitude: number, longitude: number, startDate: string, endDate: string, unit: Project["unit"]) {
  return [latitude.toFixed(3), longitude.toFixed(3), startDate, endDate, unit].join(":");
}

function createProgressRows(projectId: string, days: WeatherDayRecord[], existingRows: BuildProgressRow[] = []) {
  const byDate = new Map(existingRows.map((row) => [row.date, row]));
  return days.map<BuildProgressRow>((day, index) => {
    const existing = byDate.get(day.date);
    return { id: existing?.id ?? createId("progress"), projectId, date: day.date, rowNumber: index + 1,
      completed: existing?.completed ?? false, completedAt: existing?.completedAt ?? null };
  });
}

function parseImportPayload(raw: string) {
  const parsed = JSON.parse(raw) as unknown;
  if (Array.isArray(parsed)) return parsed as ProjectExportBundle[];
  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { projects?: unknown[] }).projects)) {
    return (parsed as { projects: ProjectExportBundle[] }).projects;
  }
  return [parsed as ProjectExportBundle];
}

function projectToDraft(project: Project, locations: ProjectLocationAssignment[], ranges: TemperatureRangeColor[]): ProjectDraftInput {
  return {
    id: project.id, name: project.name, unit: project.unit, tempMode: project.tempMode,
    startDate: project.startDate, endDate: project.endDate, stitchesPerRow: project.stitchesPerRow,
    rowHeight: project.rowHeight, craftType: project.craftType, stitchName: project.stitchName,
    previewOrientation: project.previewOrientation, notes: project.notes, allowRangeGaps: project.allowRangeGaps,
    preferredYarnBrandId: project.preferredYarnBrandId, recommendationMode: project.recommendationMode,
    colorScaleMode: project.colorScaleMode, ranges,
    locations: locations.map((location) => ({ id: location.id, sortOrder: location.sortOrder,
      startDate: location.startDate, endDate: location.endDate,
      location: { query: location.locationName, name: location.locationName, latitude: location.latitude, longitude: location.longitude } })),
  };
}

export function AppDataProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [data, setData] = useState<AppData>(defaultData);
  const [initializing, setInitializing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const storageAdapter = useMemo(() => createWebStorageAdapter(), []);
  const userId = user?.id ?? "demo-user";

  useEffect(() => {
    let mounted = true;
    void storageAdapter.loadAppData(userId).then((stored) => { if (mounted) setData(stored ?? createDemoAppData()); })
      .catch(() => { if (mounted) { setData(createDemoAppData()); setError("Saved data could not be recovered, so demo projects were loaded instead."); } })
      .finally(() => { if (mounted) setInitializing(false); });
    return () => { mounted = false; };
  }, [storageAdapter, userId]);

  useEffect(() => {
    if (!initializing) storageAdapter.saveAppData(userId, data).catch(() => setError("Changes were made, but saving failed."));
  }, [data, initializing, storageAdapter, userId]);

  async function withBusy<T>(work: () => Promise<T>) {
    setBusy(true); setError(null);
    try { return await work(); }
    catch (cause) { const message = cause instanceof Error ? cause.message : "Something unexpected happened."; setError(message); throw cause; }
    finally { setBusy(false); }
  }

  function cachedWeather(location: ProjectLocationDraft, unit: Project["unit"]) {
    const key = buildCacheKey(location.location.latitude, location.location.longitude, location.startDate, location.endDate, unit);
    const cached = data.weatherCache.find((entry) => entry.key === key);
    if (!cached) return null;
    return { cacheKey: key, daily: cached.daily, source: "cached" as const, providerLabel: `Cached ${cached.providerLabel}`,
      missingDays: cached.missingDays, warningMessage: cached.warningMessage, fallbackReason: cached.fallbackReason };
  }

  async function fetchCombined(input: ProjectDraftInput, fallbackMode: WeatherFallbackMode, ignoreCache = false): Promise<CombinedWeather> {
    const locationResults = await Promise.all(input.locations.map(async (location) => {
      const result = !ignoreCache ? cachedWeather(location, input.unit) : null;
      return { location, result: result ?? await weatherService.fetchDailyTemperatures({
        latitude: location.location.latitude, longitude: location.location.longitude,
        startDate: location.startDate, endDate: location.endDate, unit: input.unit,
      }, { fallbackMode }) };
    }));
    const daily = locationResults.flatMap(({ location, result }) => result.daily.map((day) => ({ ...day, projectLocationId: location.id ?? "" })))
      .sort((a, b) => a.date.localeCompare(b.date));
    const labels = Array.from(new Set(locationResults.map(({ result }) => result.providerLabel)));
    const sources = new Set(locationResults.map(({ result }) => result.source));
    return { cacheKey: locationResults.map(({ result }) => result.cacheKey).join("|"), daily,
      source: sources.size === 1 ? locationResults[0]?.result.source ?? "demo" : "cached",
      providerLabel: labels.length === 1 ? labels[0] : "Multiple weather sources",
      missingDays: locationResults.reduce((sum, item) => sum + item.result.missingDays, 0),
      warningMessage: locationResults.map((item) => item.result.warningMessage).filter(Boolean).join(" ") || null,
      fallbackReason: locationResults.map((item) => item.result.fallbackReason).filter(Boolean).join(" ") || null,
      locationResults };
  }

  function cacheEntries(projectId: string, unit: Project["unit"], weather: CombinedWeather): WeatherCacheEntry[] {
    return weather.locationResults.map(({ location, result }) => ({
      key: buildCacheKey(location.location.latitude, location.location.longitude, location.startDate, location.endDate, unit),
      projectId, fetchedAt: new Date().toISOString(), startDate: location.startDate, endDate: location.endDate,
      latitude: location.location.latitude, longitude: location.location.longitude, unit, daily: result.daily,
      source: result.source === "cached" ? "open-meteo" : result.source,
      providerLabel: result.providerLabel.replace(/^Cached\s+/, ""), missingDays: result.missingDays,
      warningMessage: result.warningMessage, fallbackReason: result.fallbackReason,
    }));
  }

  const value = useMemo<AppDataContextValue>(() => ({
    data: { ...data, projects: sortProjects(data.projects) }, initializing, busy, error,
    clearError: () => setError(null),
    searchLocations: (query) => withBusy(async () => query.trim() ? weatherService.searchLocations(query) : []),
    previewWeather: (input, fallbackMode = "allowMock") => withBusy(async () => fetchCombined(input, fallbackMode)),
    saveProject: (input, options) => withBusy(async () => {
      const projectId = input.id ?? createId("project");
      const now = new Date().toISOString();
      const existingProject = data.projects.find((item) => item.id === projectId);
      const existingRanges = getProjectRanges(projectId, data.ranges);
      const existingProgress = getProjectProgressRows(projectId, data.progressRows);
      const locations = input.locations.map((location, index) => ({ ...location, id: location.id ?? `${projectId}:location:${index + 1}`, sortOrder: index }));
      if (!locations.length) throw new Error("Add at least one location.");
      const weather = await fetchCombined({ ...input, locations }, options?.fallbackMode ?? "allowMock");
      const first = locations[0];
      const project: Project = { ...(existingProject ?? {} as Project), id: projectId, name: input.name.trim(),
        locationName: first.location.name, latitude: first.location.latitude, longitude: first.location.longitude,
        unit: input.unit, tempMode: input.tempMode, startDate: input.startDate, endDate: input.endDate,
        stitchesPerRow: input.stitchesPerRow, rowHeight: input.rowHeight, craftType: input.craftType,
        stitchName: input.stitchName.trim(), previewOrientation: input.previewOrientation, notes: input.notes?.trim(),
        allowRangeGaps: input.allowRangeGaps, preferredYarnBrandId: input.preferredYarnBrandId ?? null,
        recommendationMode: input.recommendationMode, colorScaleMode: input.colorScaleMode,
        weatherSource: weather.source, weatherSourceLabel: weather.providerLabel,
        weatherStatusMessage: weather.warningMessage ?? weather.fallbackReason ?? null,
        archivedAt: existingProject?.archivedAt ?? null, createdAt: existingProject?.createdAt ?? now, updatedAt: now };
      const assignments: ProjectLocationAssignment[] = weather.locationResults.map(({ location, result }, index) => ({
        id: location.id!, projectId, locationName: location.location.name, latitude: location.location.latitude,
        longitude: location.location.longitude, startDate: location.startDate, endDate: location.endDate, sortOrder: index,
        weatherSource: result.source, weatherSourceLabel: result.providerLabel,
        weatherStatusMessage: result.warningMessage ?? result.fallbackReason ?? null }));
      let baseRanges = input.ranges?.length ? input.ranges : existingRanges;
      if (!baseRanges.length) baseRanges = input.colorScaleMode === "shared"
        ? autoGenerateRanges(projectId, getTemperatureSpan(weather.daily) ?? { min: 0, max: 100 })
        : assignments.flatMap((location) => autoGenerateRanges(projectId,
            getTemperatureSpan(weather.daily.filter((day) => day.projectLocationId === location.id)) ?? { min: 0, max: 100 }, 8, location.id));
      if (input.colorScaleMode === "shared") {
        baseRanges = baseRanges.filter((range) => range.projectLocationId === null);
      } else {
        const locationIds = new Set(assignments.map((location) => location.id));
        baseRanges = baseRanges.filter((range) => range.projectLocationId && locationIds.has(range.projectLocationId));
        assignments.forEach((location) => {
          if (!baseRanges.some((range) => range.projectLocationId === location.id)) {
            baseRanges = [...baseRanges, ...autoGenerateRanges(projectId,
              getTemperatureSpan(weather.daily.filter((day) => day.projectLocationId === location.id)) ?? { min: 0, max: 100 },
              8, location.id)];
          }
        });
      }
      const normalizedRanges = fillBlankRangeLabels(baseRanges.map((range, index) => ({ ...range, projectId, sortOrder: index })));
      const ranges = applyYarnRecommendationsToRanges(normalizedRanges, { brandId: project.preferredYarnBrandId,
        recommendationMode: project.recommendationMode, preserveLocked: Boolean(existingProject) });
      const days = applyRangesToDays(project, weather.daily, ranges);
      const progressRows = createProgressRows(projectId, weather.daily, existingProgress);
      const nextCache = cacheEntries(projectId, input.unit, weather);
      setData((current) => ({
        projects: [...current.projects.filter((item) => item.id !== projectId), project],
        projectLocations: [...current.projectLocations.filter((item) => item.projectId !== projectId), ...assignments],
        ranges: [...current.ranges.filter((item) => item.projectId !== projectId), ...ranges],
        temperatureDays: [...current.temperatureDays.filter((item) => item.projectId !== projectId), ...days],
        progressRows: [...current.progressRows.filter((item) => item.projectId !== projectId), ...progressRows],
        weatherCache: [...current.weatherCache.filter((item) => !nextCache.some((entry) => entry.key === item.key)), ...nextCache],
      }));
      return { projectId, weather };
    }),
    saveRanges: (projectId, ranges, allowRangeGaps) => withBusy(async () => {
      const project = data.projects.find((item) => item.id === projectId);
      if (!project) throw new Error("That project could not be found.");
      const updatedProject = { ...project, allowRangeGaps, updatedAt: new Date().toISOString() };
      const normalized = applyYarnRecommendationsToRanges(fillBlankRangeLabels(ranges.map((range, index) => ({ ...range, projectId, sortOrder: index }))),
        { brandId: project.preferredYarnBrandId, recommendationMode: project.recommendationMode, preserveLocked: true });
      const rawDays = getProjectDays(projectId, data.temperatureDays).map((day) => ({ ...day }));
      const mapped = applyRangesToDays(updatedProject, rawDays, normalized);
      setData((current) => ({ ...current, projects: current.projects.map((item) => item.id === projectId ? updatedProject : item),
        ranges: [...current.ranges.filter((item) => item.projectId !== projectId), ...normalized],
        temperatureDays: [...current.temperatureDays.filter((item) => item.projectId !== projectId), ...mapped] }));
    }),
    toggleRowCompleted: (projectId, rowId, completed) => withBusy(async () => setData((current) => ({ ...current,
      progressRows: current.progressRows.map((row) => row.projectId === projectId && row.id === rowId
        ? { ...row, completed, completedAt: completed ? new Date().toISOString() : null } : row) }))),
    resetProjectProgress: (projectId) => withBusy(async () => setData((current) => ({ ...current,
      progressRows: current.progressRows.map((row) => row.projectId === projectId ? { ...row, completed: false, completedAt: null } : row) }))),
    duplicateProject: (projectId) => withBusy(async () => {
      const project = data.projects.find((item) => item.id === projectId); if (!project) throw new Error("That project could not be found.");
      const nextId = createId("project"); const now = new Date().toISOString();
      const locationMap = new Map<string, string>();
      const locations = getProjectLocations(projectId, data.projectLocations).map((location, index) => {
        const id = `${nextId}:location:${index + 1}`; locationMap.set(location.id, id); return { ...location, id, projectId: nextId };
      });
      const rangeMap = new Map<string, string>();
      const ranges = getProjectRanges(projectId, data.ranges).map((range) => { const id = createId("range"); rangeMap.set(range.id, id);
        return { ...range, id, projectId: nextId, projectLocationId: range.projectLocationId ? locationMap.get(range.projectLocationId) ?? null : null }; });
      const days = getProjectDays(projectId, data.temperatureDays).map((day) => ({ ...day, id: `${nextId}:${day.date}`, projectId: nextId,
        projectLocationId: locationMap.get(day.projectLocationId) ?? locations[0]?.id ?? "", mappedRangeId: day.mappedRangeId ? rangeMap.get(day.mappedRangeId) ?? null : null }));
      const progress = getProjectProgressRows(projectId, data.progressRows).map((row) => ({ ...row, id: createId("progress"), projectId: nextId, completed: false, completedAt: null }));
      setData((current) => ({ ...current, projects: [...current.projects, { ...project, id: nextId, name: `${project.name} Copy`, archivedAt: null, createdAt: now, updatedAt: now }],
        projectLocations: [...current.projectLocations, ...locations], ranges: [...current.ranges, ...ranges], temperatureDays: [...current.temperatureDays, ...days], progressRows: [...current.progressRows, ...progress] }));
      return nextId;
    }),
    resyncProjectWeather: (projectId, fallbackMode = "allowMock", projectLocationId) => withBusy(async () => {
      const project = data.projects.find((item) => item.id === projectId); if (!project) throw new Error("That project could not be found.");
      const allLocations = getProjectLocations(projectId, data.projectLocations);
      const targetLocations = projectLocationId ? allLocations.filter((item) => item.id === projectLocationId) : allLocations;
      const targetDraft = projectToDraft(project, targetLocations, getProjectRanges(projectId, data.ranges));
      const refreshed = await fetchCombined(targetDraft, fallbackMode, true);
      const refreshedById = new Map(refreshed.locationResults.map((item) => [item.location.id, item]));
      const existingDays = getProjectDays(projectId, data.temperatureDays);
      const combinedDays: LocatedWeatherDayRecord[] = allLocations.flatMap((location) => {
        const next = refreshedById.get(location.id);
        return next ? next.result.daily.map((day) => ({ ...day, projectLocationId: location.id }))
          : existingDays.filter((day) => day.projectLocationId === location.id).map((day) => ({ ...day, projectLocationId: location.id }));
      }).sort((a, b) => a.date.localeCompare(b.date));
      const mapped = applyRangesToDays(project, combinedDays, getProjectRanges(projectId, data.ranges));
      const progress = createProgressRows(projectId, combinedDays, getProjectProgressRows(projectId, data.progressRows));
      const cache = cacheEntries(projectId, project.unit, refreshed);
      setData((current) => ({ ...current,
        projects: current.projects.map((item) => item.id === projectId ? { ...item, weatherSource: refreshed.source, weatherSourceLabel: refreshed.providerLabel,
          weatherStatusMessage: refreshed.warningMessage ?? refreshed.fallbackReason ?? null, updatedAt: new Date().toISOString() } : item),
        projectLocations: current.projectLocations.map((item) => { const next = refreshedById.get(item.id); return next ? { ...item,
          weatherSource: next.result.source, weatherSourceLabel: next.result.providerLabel,
          weatherStatusMessage: next.result.warningMessage ?? next.result.fallbackReason ?? null } : item; }),
        temperatureDays: [...current.temperatureDays.filter((item) => item.projectId !== projectId), ...mapped],
        progressRows: [...current.progressRows.filter((item) => item.projectId !== projectId), ...progress],
        weatherCache: [...current.weatherCache.filter((item) => !cache.some((entry) => entry.key === item.key)), ...cache] }));
    }),
    exportProjectJson: (projectId) => {
      const project = data.projects.find((item) => item.id === projectId); if (!project) return "";
      const bundle: ProjectExportBundle = { version: 4, exportedAt: new Date().toISOString(), project,
        projectLocations: getProjectLocations(projectId, data.projectLocations), ranges: getProjectRanges(projectId, data.ranges),
        temperatureDays: getProjectDays(projectId, data.temperatureDays), progressRows: getProjectProgressRows(projectId, data.progressRows) };
      return JSON.stringify(bundle, null, 2);
    },
    importProjectsFromJson: (payload) => withBusy(async () => {
      const bundles = parseImportPayload(payload); const next = migrateAppData({ projects: bundles.map((item) => item.project),
        projectLocations: bundles.flatMap((item) => item.projectLocations ?? []), ranges: bundles.flatMap((item) => item.ranges ?? []),
        temperatureDays: bundles.flatMap((item) => item.temperatureDays ?? []), progressRows: bundles.flatMap((item) => item.progressRows ?? []), weatherCache: [] });
      const imports: AppData = { ...defaultData };
      next.projects.forEach((project) => {
        const nextId = createId("project"); const locationMap = new Map<string, string>(); const rangeMap = new Map<string, string>();
        imports.projects.push({ ...project, id: nextId, name: `${project.name} Imported`, archivedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        getProjectLocations(project.id, next.projectLocations).forEach((location, index) => { const id = `${nextId}:location:${index + 1}`; locationMap.set(location.id, id); imports.projectLocations.push({ ...location, id, projectId: nextId }); });
        getProjectRanges(project.id, next.ranges).forEach((range) => { const id = createId("range"); rangeMap.set(range.id, id); imports.ranges.push({ ...range, id, projectId: nextId, projectLocationId: range.projectLocationId ? locationMap.get(range.projectLocationId) ?? null : null }); });
        getProjectDays(project.id, next.temperatureDays).forEach((day) => imports.temperatureDays.push({ ...day, id: `${nextId}:${day.date}`, projectId: nextId,
          projectLocationId: locationMap.get(day.projectLocationId) ?? imports.projectLocations.find((item) => item.projectId === nextId)?.id ?? "", mappedRangeId: day.mappedRangeId ? rangeMap.get(day.mappedRangeId) ?? null : null }));
        getProjectProgressRows(project.id, next.progressRows).forEach((row) => imports.progressRows.push({ ...row, id: createId("progress"), projectId: nextId }));
      });
      setData((current) => ({ projects: [...current.projects, ...imports.projects], projectLocations: [...current.projectLocations, ...imports.projectLocations],
        ranges: [...current.ranges, ...imports.ranges], temperatureDays: [...current.temperatureDays, ...imports.temperatureDays], progressRows: [...current.progressRows, ...imports.progressRows], weatherCache: current.weatherCache }));
      return imports.projects.length;
    }),
    archiveProject: (projectId) => withBusy(async () => setData((current) => ({ ...current, projects: current.projects.map((project) => project.id === projectId ? { ...project, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : project) }))),
    restoreProject: (projectId) => withBusy(async () => setData((current) => ({ ...current, projects: current.projects.map((project) => project.id === projectId ? { ...project, archivedAt: null, updatedAt: new Date().toISOString() } : project) }))),
    deleteProject: (projectId) => withBusy(async () => setData((current) => ({ projects: current.projects.filter((item) => item.id !== projectId),
      projectLocations: current.projectLocations.filter((item) => item.projectId !== projectId), ranges: current.ranges.filter((item) => item.projectId !== projectId),
      temperatureDays: current.temperatureDays.filter((item) => item.projectId !== projectId), progressRows: current.progressRows.filter((item) => item.projectId !== projectId),
      weatherCache: current.weatherCache.filter((item) => item.projectId !== projectId) }))),
    getProjectById: (projectId) => data.projects.find((project) => project.id === projectId),
  }), [busy, data, error, initializing]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) throw new Error("useAppData must be used inside AppDataProvider");
  return context;
}
