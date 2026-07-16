import {
  AppData,
  BuildProgressRow,
  Project,
  TemperatureDay,
  TemperatureRangeColor,
  WeatherDayRecord,
} from "@/types/models";
import { applyYarnRecommendationsToRanges } from "@/services/yarn";
import { getYearBounds } from "@/utils/date";
import { applyRangesToDays, autoGenerateRanges } from "@/utils/temperature";
import { createId } from "@/utils/project";

function createDemoWeatherRows(startDate: string, endDate: string, offset = 0) {
  const rows: WeatherDayRecord[] = [];
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);

  while (start <= end) {
    const dayOfYear =
      Math.floor(
        (start.getTime() - new Date(`${start.getFullYear()}-01-01T12:00:00`).getTime()) /
          86400000,
      ) + 1;
    const wave = Math.sin(((dayOfYear - 70 + offset) / 365) * Math.PI * 2);
    const avg = 52 + wave * (24 + offset / 2);
    rows.push({
      date: start.toISOString().slice(0, 10),
      tempHigh: Math.round((avg + 8) * 10) / 10,
      tempLow: Math.round((avg - 9) * 10) / 10,
      tempAvg: Math.round(avg * 10) / 10,
    });
    start.setDate(start.getDate() + 1);
  }

  return rows;
}

function createProgressRows(projectId: string, days: TemperatureDay[], completedCount: number) {
  const now = new Date().toISOString();

  return days.map<BuildProgressRow>((day, index) => ({
    id: createId("progress"),
    projectId,
    date: day.date,
    rowNumber: index + 1,
    completed: index < completedCount,
    completedAt: index < completedCount ? now : null,
  }));
}

function makeProjectBundle(input: {
  name: string;
  locationName: string;
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
  craftType: Project["craftType"];
  stitchName: string;
  stitchesPerRow: number;
  rowHeight: number;
  previewOrientation: Project["previewOrientation"];
  notes: string;
  palette: string[];
  yarnNames: string[];
  preferredYarnBrandId?: string | null;
  recommendationMode?: Project["recommendationMode"];
  completedCount: number;
  offset?: number;
}) {
  const now = new Date().toISOString();
  const projectId = createId("project");
  const project: Project = {
    id: projectId,
    name: input.name,
    locationName: input.locationName,
    latitude: input.latitude,
    longitude: input.longitude,
    unit: "fahrenheit",
    tempMode: "avg",
    startDate: input.startDate,
    endDate: input.endDate,
    stitchesPerRow: input.stitchesPerRow,
    rowHeight: input.rowHeight,
    craftType: input.craftType,
    stitchName: input.stitchName,
    previewOrientation: input.previewOrientation,
    notes: input.notes,
    allowRangeGaps: false,
    preferredYarnBrandId: input.preferredYarnBrandId ?? null,
    recommendationMode: input.recommendationMode ?? "exact-nearest",
    weatherSource: "demo",
    weatherSourceLabel: "Demo data",
    weatherStatusMessage: "Seeded preview data for exploring the app.",
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const rawDays = createDemoWeatherRows(
    input.startDate,
    input.endDate,
    input.offset ?? 0,
  );
  const span = {
    min: Math.floor(Math.min(...rawDays.map((day) => day.tempLow ?? 0))),
    max: Math.ceil(Math.max(...rawDays.map((day) => day.tempHigh ?? 0))),
  };
  const ranges: TemperatureRangeColor[] = applyYarnRecommendationsToRanges(
    autoGenerateRanges(projectId, span, input.palette.length).map((range, index) => ({
      ...range,
      hexColor: input.palette[index],
      yarnName: input.yarnNames[index],
      notes: "",
    })),
    {
      brandId: input.preferredYarnBrandId ?? null,
      recommendationMode: input.recommendationMode ?? "exact-nearest",
      preserveLocked: false,
    },
  );
  const temperatureDays = applyRangesToDays(project, rawDays, ranges);
  const progressRows = createProgressRows(projectId, temperatureDays, input.completedCount);

  return {
    project,
    ranges,
    temperatureDays,
    progressRows,
    weatherCache: {
      key: `demo:${projectId}`,
      projectId,
      fetchedAt: now,
      startDate: project.startDate,
      endDate: project.endDate,
      latitude: project.latitude,
      longitude: project.longitude,
      unit: project.unit,
      daily: rawDays,
      source: "demo" as const,
      providerLabel: "Demo data",
      missingDays: 0,
      warningMessage: null,
      fallbackReason: null,
    },
  };
}

export function createDemoAppData(): AppData {
  const year = new Date().getFullYear() - 1;
  const fullYear = getYearBounds(year);
  const winterStart = `${year}-09-01`;
  const winterEnd = `${year}-12-15`;

  const rosewood = makeProjectBundle({
    name: "Rosewood Yearbook",
    locationName: "Chicago, Illinois",
    latitude: 41.8781,
    longitude: -87.6298,
    startDate: fullYear.startDate,
    endDate: fullYear.endDate,
    craftType: "crochet",
    stitchName: "Single crochet",
    stitchesPerRow: 180,
    rowHeight: 12,
    previewOrientation: "horizontal",
    notes: "Full-year sampler with warm rosewood neutrals.",
    palette: [
      "#355070",
      "#6D597A",
      "#B56576",
      "#E56B6F",
      "#EAAC8B",
      "#DDB892",
      "#A98467",
      "#7F5539",
    ],
    yarnNames: [
      "Midnight Spruce",
      "Heather Berry",
      "Dusty Rose",
      "Coral Bloom",
      "Apricot Wool",
      "Honey Oat",
      "Warm Taupe",
      "Chestnut",
    ],
    preferredYarnBrandId: "lion-brand",
    recommendationMode: "exact-nearest",
    completedCount: 48,
    offset: 0,
  });

  const spruce = makeProjectBundle({
    name: "Spruce Weekend Throw",
    locationName: "Denver, Colorado",
    latitude: 39.7392,
    longitude: -104.9903,
    startDate: winterStart,
    endDate: winterEnd,
    craftType: "knit",
    stitchName: "Garter",
    stitchesPerRow: 132,
    rowHeight: 14,
    previewOrientation: "vertical",
    notes: "Short seasonal project with a cool evergreen palette.",
    palette: [
      "#264653",
      "#2A9D8F",
      "#8AB17D",
      "#E9C46A",
      "#F4A261",
      "#E76F51",
    ],
    yarnNames: [
      "Deep Pine",
      "Moss Lake",
      "Sage Wool",
      "Golden Straw",
      "Clay Ember",
      "Terracotta",
    ],
    preferredYarnBrandId: "bernat",
    recommendationMode: "brand-palette-only",
    completedCount: 12,
    offset: 24,
  });

  return {
    projects: [rosewood.project, spruce.project],
    ranges: [...rosewood.ranges, ...spruce.ranges],
    temperatureDays: [...rosewood.temperatureDays, ...spruce.temperatureDays],
    progressRows: [...rosewood.progressRows, ...spruce.progressRows],
    weatherCache: [rosewood.weatherCache, spruce.weatherCache],
  };
}
