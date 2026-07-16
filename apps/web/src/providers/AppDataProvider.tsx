"use client";

import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  applyRangesToDays,
  applyYarnRecommendationsToRanges,
  autoGenerateRanges,
  createDemoAppData,
  createId,
  createWeatherService,
  fillBlankRangeLabels,
  getProjectDays,
  getProjectProgressRows,
  getProjectRanges,
  getTemperatureSpan,
  hasProjectWeatherSettingsChanged,
  sortProjects,
  type AppData,
  type BuildProgressRow,
  type FetchWeatherResult,
  type LocationSuggestion,
  type Project,
  type ProjectDraftInput,
  type ProjectExportBundle,
  type TemperatureRangeColor,
  type WeatherCacheEntry,
  type WeatherDayRecord,
  type WeatherFallbackMode,
} from "@temperature-blanket/core";

import { useAuth } from "./AuthProvider";
import { createWebStorageAdapter } from "@/lib/storage";

type SaveProjectOptions = {
  fallbackMode?: WeatherFallbackMode;
};

type AppDataContextValue = {
  data: AppData;
  initializing: boolean;
  busy: boolean;
  error: string | null;
  clearError: () => void;
  searchLocations: (query: string) => Promise<LocationSuggestion[]>;
  previewWeather: (
    input: ProjectDraftInput,
    fallbackMode?: WeatherFallbackMode,
  ) => Promise<FetchWeatherResult>;
  saveProject: (
    input: ProjectDraftInput,
    options?: SaveProjectOptions,
  ) => Promise<{ projectId: string; weather: FetchWeatherResult }>;
  saveRanges: (
    projectId: string,
    ranges: TemperatureRangeColor[],
    allowRangeGaps: boolean,
  ) => Promise<void>;
  toggleRowCompleted: (
    projectId: string,
    rowId: string,
    completed: boolean,
  ) => Promise<void>;
  resetProjectProgress: (projectId: string) => Promise<void>;
  duplicateProject: (projectId: string) => Promise<string>;
  resyncProjectWeather: (
    projectId: string,
    fallbackMode?: WeatherFallbackMode,
  ) => Promise<void>;
  exportProjectJson: (projectId: string) => string;
  importProjectsFromJson: (payload: string) => Promise<number>;
  archiveProject: (projectId: string) => Promise<void>;
  restoreProject: (projectId: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  getProjectById: (projectId: string) => Project | undefined;
};

const defaultData: AppData = {
  projects: [],
  ranges: [],
  temperatureDays: [],
  progressRows: [],
  weatherCache: [],
};

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);
const weatherService = createWeatherService();

function buildCacheKey(
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string,
  unit: Project["unit"],
) {
  return [latitude.toFixed(3), longitude.toFixed(3), startDate, endDate, unit].join(":");
}

function createProgressRows(
  projectId: string,
  days: WeatherDayRecord[],
  existingRows: BuildProgressRow[] = [],
) {
  const completedByDate = new Map(existingRows.map((row) => [row.date, row]));

  return days.map<BuildProgressRow>((day, index) => {
    const existing = completedByDate.get(day.date);
    return {
      id: existing?.id ?? createId("progress"),
      projectId,
      date: day.date,
      rowNumber: index + 1,
      completed: existing?.completed ?? false,
      completedAt: existing?.completedAt ?? null,
    };
  });
}

function buildProjectExportBundle(
  project: Project,
  ranges: TemperatureRangeColor[],
  temperatureDays: AppData["temperatureDays"],
  progressRows: AppData["progressRows"],
): ProjectExportBundle {
  return {
    version: 3,
    exportedAt: new Date().toISOString(),
    project,
    ranges: getProjectRanges(project.id, ranges),
    temperatureDays: getProjectDays(project.id, temperatureDays),
    progressRows: getProjectProgressRows(project.id, progressRows),
  };
}

function parseImportPayload(raw: string) {
  const parsed = JSON.parse(raw) as unknown;
  if (Array.isArray(parsed)) {
    return parsed as ProjectExportBundle[];
  }

  if (
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as { projects?: unknown[] }).projects)
  ) {
    return (parsed as { projects: ProjectExportBundle[] }).projects;
  }

  return [parsed as ProjectExportBundle];
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

    async function hydrate() {
      try {
        const stored = await storageAdapter.loadAppData(userId);
        if (!mounted) {
          return;
        }

        setData(stored ?? createDemoAppData());
      } catch (hydrateError) {
        console.warn("Unable to load saved data", hydrateError);
        if (mounted) {
          setData(createDemoAppData());
          setError("Saved data could not be recovered, so demo projects were loaded instead.");
        }
      } finally {
        if (mounted) {
          setInitializing(false);
        }
      }
    }

    void hydrate();

    return () => {
      mounted = false;
    };
  }, [storageAdapter, userId]);

  useEffect(() => {
    if (initializing) {
      return;
    }

    storageAdapter.saveAppData(userId, data).catch((saveError) => {
      console.warn("Unable to save app data", saveError);
      setError("Changes were made, but saving failed.");
    });
  }, [data, initializing, storageAdapter, userId]);

  async function withBusy<T>(callback: () => Promise<T>) {
    setBusy(true);
    setError(null);
    try {
      return await callback();
    } catch (actionError) {
      const message =
        actionError instanceof Error
          ? actionError.message
          : "Something unexpected happened.";
      setError(message);
      throw actionError;
    } finally {
      setBusy(false);
    }
  }

  function rememberWeatherCache(cacheEntry: WeatherCacheEntry, projectId?: string) {
    setData((current) => ({
      ...current,
      weatherCache: [
        ...current.weatherCache.filter((entry) => entry.key !== cacheEntry.key),
        {
          ...cacheEntry,
          projectId,
        },
      ],
    }));
  }

  function getCachedWeather(
    latitude: number,
    longitude: number,
    startDate: string,
    endDate: string,
    unit: Project["unit"],
  ): FetchWeatherResult | null {
    const key = buildCacheKey(latitude, longitude, startDate, endDate, unit);
    const cached = data.weatherCache.find((entry) => entry.key === key);

    if (!cached) {
      return null;
    }

    return {
      cacheKey: cached.key,
      daily: cached.daily,
      source: "cached",
      providerLabel: `Cached ${cached.providerLabel}`,
      missingDays: cached.missingDays,
      warningMessage: cached.warningMessage,
      fallbackReason: cached.fallbackReason,
    };
  }

  async function fetchWeatherForDraft(
    input: ProjectDraftInput,
    fallbackMode: WeatherFallbackMode = "allowMock",
  ) {
    const cached = getCachedWeather(
      input.location.latitude,
      input.location.longitude,
      input.startDate,
      input.endDate,
      input.unit,
    );

    if (cached) {
      return cached;
    }

    const result = await weatherService.fetchDailyTemperatures(
      {
        latitude: input.location.latitude,
        longitude: input.location.longitude,
        startDate: input.startDate,
        endDate: input.endDate,
        unit: input.unit,
      },
      { fallbackMode },
    );

    rememberWeatherCache({
      key: buildCacheKey(
        input.location.latitude,
        input.location.longitude,
        input.startDate,
        input.endDate,
        input.unit,
      ),
      projectId: input.id,
      fetchedAt: new Date().toISOString(),
      startDate: input.startDate,
      endDate: input.endDate,
      latitude: input.location.latitude,
      longitude: input.location.longitude,
      unit: input.unit,
      daily: result.daily,
      source: result.source,
      providerLabel: result.providerLabel,
      missingDays: result.missingDays,
      warningMessage: result.warningMessage,
      fallbackReason: result.fallbackReason,
    });

    return result;
  }

  const value = useMemo<AppDataContextValue>(
    () => ({
      data: {
        ...data,
        projects: sortProjects(data.projects),
      },
      initializing,
      busy,
      error,
      clearError: () => setError(null),
      async searchLocations(query) {
        return withBusy(async () => {
          if (!query.trim()) {
            return [];
          }

          return weatherService.searchLocations(query);
        });
      },
      async previewWeather(input, fallbackMode = "allowMock") {
        return withBusy(async () => fetchWeatherForDraft(input, fallbackMode));
      },
      async saveProject(input, options) {
        return withBusy(async () => {
          const projectId = input.id ?? createId("project");
          const existingProject = data.projects.find((project) => project.id === projectId);
          const existingRanges = getProjectRanges(projectId, data.ranges);
          const existingProgress = getProjectProgressRows(projectId, data.progressRows);
          const existingDays = getProjectDays(projectId, data.temperatureDays);
          const now = new Date().toISOString();

          const baselineProject: Project = existingProject ?? {
            id: projectId,
            name: input.name.trim(),
            locationName: input.location.name,
            latitude: input.location.latitude,
            longitude: input.location.longitude,
            unit: input.unit,
            tempMode: input.tempMode,
            startDate: input.startDate,
            endDate: input.endDate,
            stitchesPerRow: input.stitchesPerRow,
            rowHeight: input.rowHeight,
            craftType: input.craftType,
            stitchName: input.stitchName.trim(),
            previewOrientation: input.previewOrientation,
            notes: input.notes?.trim(),
            allowRangeGaps: input.allowRangeGaps,
            preferredYarnBrandId: input.preferredYarnBrandId ?? null,
            recommendationMode: input.recommendationMode,
            weatherSource: "demo",
            weatherSourceLabel: "Demo data",
            weatherStatusMessage: null,
            archivedAt: null,
            createdAt: now,
            updatedAt: now,
          };

          const weatherChanged = existingProject
            ? hasProjectWeatherSettingsChanged(existingProject, {
                locationName: input.location.name,
                latitude: input.location.latitude,
                longitude: input.location.longitude,
                startDate: input.startDate,
                endDate: input.endDate,
                tempMode: input.tempMode,
              })
            : true;
          const yarnPreferenceChanged = existingProject
            ? existingProject.preferredYarnBrandId !== (input.preferredYarnBrandId ?? null) ||
              existingProject.recommendationMode !== input.recommendationMode
            : true;

          const weather =
            weatherChanged || existingDays.length === 0
              ? await fetchWeatherForDraft(input, options?.fallbackMode ?? "allowMock")
              : {
                  cacheKey: buildCacheKey(
                    baselineProject.latitude,
                    baselineProject.longitude,
                    baselineProject.startDate,
                    baselineProject.endDate,
                    baselineProject.unit,
                  ),
                  daily: existingDays.map((day) => ({
                    date: day.date,
                    tempHigh: day.tempHigh,
                    tempLow: day.tempLow,
                    tempAvg: day.tempAvg,
                  })),
                  source: baselineProject.weatherSource,
                  providerLabel: baselineProject.weatherSourceLabel,
                  missingDays: existingDays.filter((day) => day.missingData).length,
                  warningMessage: baselineProject.weatherStatusMessage ?? null,
                  fallbackReason: null,
                };

          const project: Project = {
            ...baselineProject,
            id: projectId,
            name: input.name.trim(),
            locationName: input.location.name,
            latitude: input.location.latitude,
            longitude: input.location.longitude,
            unit: input.unit,
            tempMode: input.tempMode,
            startDate: input.startDate,
            endDate: input.endDate,
            stitchesPerRow: input.stitchesPerRow,
            rowHeight: input.rowHeight,
            craftType: input.craftType,
            stitchName: input.stitchName.trim(),
            previewOrientation: input.previewOrientation,
            notes: input.notes?.trim(),
            allowRangeGaps: input.allowRangeGaps,
            preferredYarnBrandId: input.preferredYarnBrandId ?? null,
            recommendationMode: input.recommendationMode,
            weatherSource: weather.source,
            weatherSourceLabel: weather.providerLabel,
            weatherStatusMessage: weather.warningMessage ?? weather.fallbackReason ?? null,
            createdAt: existingProject?.createdAt ?? now,
            updatedAt: now,
          };

          const baseRanges =
            input.ranges && input.ranges.length > 0
              ? fillBlankRangeLabels(
                  input.ranges.map((range, index) => ({
                    ...range,
                    projectId,
                    sortOrder: index,
                  })),
                )
              : existingRanges.length > 0
                ? fillBlankRangeLabels(
                    existingRanges.map((range, index) => ({
                      ...range,
                      projectId,
                      sortOrder: index,
                    })),
                  )
                : autoGenerateRanges(
                    projectId,
                    getTemperatureSpan(weather.daily) ?? { min: 0, max: 100 },
                  );

          const ranges = applyYarnRecommendationsToRanges(baseRanges, {
            brandId: project.preferredYarnBrandId,
            recommendationMode: project.recommendationMode,
            preserveLocked: !yarnPreferenceChanged,
          });

          const temperatureDays = applyRangesToDays(project, weather.daily, ranges);
          const progressRows = createProgressRows(projectId, weather.daily, existingProgress);

          setData((current) => ({
            projects: [...current.projects.filter((item) => item.id !== projectId), project],
            ranges: [...current.ranges.filter((item) => item.projectId !== projectId), ...ranges],
            temperatureDays: [
              ...current.temperatureDays.filter((item) => item.projectId !== projectId),
              ...temperatureDays,
            ],
            progressRows: [
              ...current.progressRows.filter((item) => item.projectId !== projectId),
              ...progressRows,
            ],
            weatherCache: [
              ...current.weatherCache.filter(
                (item) =>
                  item.key !==
                  buildCacheKey(
                    input.location.latitude,
                    input.location.longitude,
                    input.startDate,
                    input.endDate,
                    input.unit,
                  ),
              ),
              {
                key: buildCacheKey(
                  input.location.latitude,
                  input.location.longitude,
                  input.startDate,
                  input.endDate,
                  input.unit,
                ),
                projectId,
                fetchedAt: new Date().toISOString(),
                startDate: input.startDate,
                endDate: input.endDate,
                latitude: input.location.latitude,
                longitude: input.location.longitude,
                unit: input.unit,
                daily: weather.daily,
                source: weather.source === "cached" ? "open-meteo" : weather.source,
                providerLabel:
                  weather.source === "cached"
                    ? weather.providerLabel.replace(/^Cached\\s+/, "")
                    : weather.providerLabel,
                missingDays: weather.missingDays,
                warningMessage: weather.warningMessage,
                fallbackReason: weather.fallbackReason,
              },
            ],
          }));

          return {
            projectId,
            weather,
          };
        });
      },
      async saveRanges(projectId, ranges, allowRangeGaps) {
        return withBusy(async () => {
          const project = data.projects.find((item) => item.id === projectId);
          if (!project) {
            throw new Error("That project could not be found.");
          }

          const updatedProject = {
            ...project,
            allowRangeGaps,
            updatedAt: new Date().toISOString(),
          };

          const existingDays = getProjectDays(projectId, data.temperatureDays).map((day) => ({
            date: day.date,
            tempHigh: day.tempHigh,
            tempLow: day.tempLow,
            tempAvg: day.tempAvg,
          }));
          const baseRanges = fillBlankRangeLabels(
            ranges.map((range, index) => ({ ...range, projectId, sortOrder: index })),
          );
          const normalizedRanges = applyYarnRecommendationsToRanges(baseRanges, {
            brandId: updatedProject.preferredYarnBrandId,
            recommendationMode: updatedProject.recommendationMode,
            preserveLocked: true,
          });
          const mappedDays = applyRangesToDays(updatedProject, existingDays, normalizedRanges);

          setData((current) => ({
            ...current,
            projects: current.projects.map((item) =>
              item.id === projectId ? updatedProject : item,
            ),
            ranges: [
              ...current.ranges.filter((item) => item.projectId !== projectId),
              ...normalizedRanges,
            ],
            temperatureDays: [
              ...current.temperatureDays.filter((item) => item.projectId !== projectId),
              ...mappedDays,
            ],
          }));
        });
      },
      async toggleRowCompleted(projectId, rowId, completed) {
        return withBusy(async () => {
          setData((current) => ({
            ...current,
            progressRows: current.progressRows.map((row) =>
              row.projectId === projectId && row.id === rowId
                ? {
                    ...row,
                    completed,
                    completedAt: completed ? new Date().toISOString() : null,
                  }
                : row,
            ),
          }));
        });
      },
      async resetProjectProgress(projectId) {
        return withBusy(async () => {
          setData((current) => ({
            ...current,
            progressRows: current.progressRows.map((row) =>
              row.projectId === projectId
                ? { ...row, completed: false, completedAt: null }
                : row,
            ),
          }));
        });
      },
      async duplicateProject(projectId) {
        return withBusy(async () => {
          const project = data.projects.find((item) => item.id === projectId);
          if (!project) {
            throw new Error("That project could not be found.");
          }

          const nextId = createId("project");
          const now = new Date().toISOString();
          const originalRanges = getProjectRanges(projectId, data.ranges);
          const rangeIdMap = new Map<string, string>();
          const clonedRanges = originalRanges.map((range, index) => {
            const nextRangeId = createId("range");
            rangeIdMap.set(range.id, nextRangeId);
            return {
              ...range,
              id: nextRangeId,
              projectId: nextId,
              sortOrder: index,
            };
          });
          const clonedProject: Project = {
            ...project,
            id: nextId,
            name: `${project.name} Copy`,
            archivedAt: null,
            createdAt: now,
            updatedAt: now,
          };
          const clonedDays = getProjectDays(projectId, data.temperatureDays).map((day) => ({
            ...day,
            id: `${nextId}:${day.date}`,
            projectId: nextId,
            mappedRangeId: day.mappedRangeId ? rangeIdMap.get(day.mappedRangeId) ?? null : null,
          }));
          const clonedProgressRows = getProjectProgressRows(projectId, data.progressRows).map(
            (row) => ({
              ...row,
              id: createId("progress"),
              projectId: nextId,
              completed: false,
              completedAt: null,
            }),
          );

          setData((current) => ({
            ...current,
            projects: [...current.projects, clonedProject],
            ranges: [...current.ranges, ...clonedRanges],
            temperatureDays: [...current.temperatureDays, ...clonedDays],
            progressRows: [...current.progressRows, ...clonedProgressRows],
          }));

          return nextId;
        });
      },
      async resyncProjectWeather(projectId, fallbackMode = "allowMock") {
        return withBusy(async () => {
          const project = data.projects.find((item) => item.id === projectId);
          if (!project) {
            throw new Error("That project could not be found.");
          }

          const result = await fetchWeatherForDraft(
            {
              id: project.id,
              name: project.name,
              location: {
                query: project.locationName,
                name: project.locationName,
                latitude: project.latitude,
                longitude: project.longitude,
              },
              unit: project.unit,
              tempMode: project.tempMode,
              startDate: project.startDate,
              endDate: project.endDate,
              stitchesPerRow: project.stitchesPerRow,
              rowHeight: project.rowHeight,
              craftType: project.craftType,
              stitchName: project.stitchName,
              previewOrientation: project.previewOrientation,
              notes: project.notes,
              allowRangeGaps: project.allowRangeGaps,
              preferredYarnBrandId: project.preferredYarnBrandId,
              recommendationMode: project.recommendationMode,
              ranges: getProjectRanges(projectId, data.ranges),
            },
            fallbackMode,
          );
          const projectRanges = getProjectRanges(projectId, data.ranges);
          const existingProgress = getProjectProgressRows(projectId, data.progressRows);
          const remappedDays = applyRangesToDays(project, result.daily, projectRanges);
          const progressRows = createProgressRows(projectId, result.daily, existingProgress);

          setData((current) => ({
            ...current,
            projects: current.projects.map((item) =>
              item.id === projectId
                ? {
                    ...item,
                    weatherSource: result.source,
                    weatherSourceLabel: result.providerLabel,
                    weatherStatusMessage:
                      result.warningMessage ?? result.fallbackReason ?? null,
                    updatedAt: new Date().toISOString(),
                  }
                : item,
            ),
            temperatureDays: [
              ...current.temperatureDays.filter((item) => item.projectId !== projectId),
              ...remappedDays,
            ],
            progressRows: [
              ...current.progressRows.filter((item) => item.projectId !== projectId),
              ...progressRows,
            ],
          }));
        });
      },
      exportProjectJson(projectId) {
        const project = data.projects.find((item) => item.id === projectId);
        if (!project) {
          return "";
        }

        return JSON.stringify(
          buildProjectExportBundle(project, data.ranges, data.temperatureDays, data.progressRows),
          null,
          2,
        );
      },
      async importProjectsFromJson(payload) {
        return withBusy(async () => {
          const bundles = parseImportPayload(payload);
          if (!bundles.length) {
            throw new Error("No projects were found in that JSON.");
          }

          const nextProjects: Project[] = [];
          const nextRanges: TemperatureRangeColor[] = [];
          const nextDays: AppData["temperatureDays"] = [];
          const nextProgress: AppData["progressRows"] = [];

          bundles.forEach((bundle) => {
            if (!bundle?.project?.id) {
              return;
            }

            const nextProjectId = createId("project");
            const rangeIdMap = new Map<string, string>();
            const importedProject: Project = {
              ...bundle.project,
              id: nextProjectId,
              name: `${bundle.project.name} Imported`,
              archivedAt: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            nextProjects.push(importedProject);
            bundle.ranges.forEach((range, index) => {
              const nextRangeId = createId("range");
              rangeIdMap.set(range.id, nextRangeId);
              nextRanges.push({
                ...range,
                id: nextRangeId,
                projectId: nextProjectId,
                sortOrder: index,
              });
            });

            bundle.temperatureDays.forEach((day) => {
              nextDays.push({
                ...day,
                id: `${nextProjectId}:${day.date}`,
                projectId: nextProjectId,
                mappedRangeId: day.mappedRangeId
                  ? rangeIdMap.get(day.mappedRangeId) ?? null
                  : null,
              });
            });

            bundle.progressRows.forEach((row) => {
              nextProgress.push({
                ...row,
                id: createId("progress"),
                projectId: nextProjectId,
              });
            });
          });

          setData((current) => ({
            ...current,
            projects: [...current.projects, ...nextProjects],
            ranges: [...current.ranges, ...nextRanges],
            temperatureDays: [...current.temperatureDays, ...nextDays],
            progressRows: [...current.progressRows, ...nextProgress],
          }));

          return nextProjects.length;
        });
      },
      async archiveProject(projectId) {
        return withBusy(async () => {
          setData((current) => ({
            ...current,
            projects: current.projects.map((project) =>
              project.id === projectId
                ? {
                    ...project,
                    archivedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }
                : project,
            ),
          }));
        });
      },
      async restoreProject(projectId) {
        return withBusy(async () => {
          setData((current) => ({
            ...current,
            projects: current.projects.map((project) =>
              project.id === projectId
                ? { ...project, archivedAt: null, updatedAt: new Date().toISOString() }
                : project,
            ),
          }));
        });
      },
      async deleteProject(projectId) {
        return withBusy(async () => {
          setData((current) => ({
            projects: current.projects.filter((project) => project.id !== projectId),
            ranges: current.ranges.filter((range) => range.projectId !== projectId),
            temperatureDays: current.temperatureDays.filter(
              (day) => day.projectId !== projectId,
            ),
            progressRows: current.progressRows.filter((row) => row.projectId !== projectId),
            weatherCache: current.weatherCache.filter((entry) => entry.projectId !== projectId),
          }));
        });
      },
      getProjectById(projectId) {
        return data.projects.find((project) => project.id === projectId);
      },
    }),
    [busy, data, error, initializing],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used inside AppDataProvider");
  }

  return context;
}
