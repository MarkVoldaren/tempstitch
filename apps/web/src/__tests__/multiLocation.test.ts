import { describe, expect, it } from "vitest";
import {
  applyRangesToDays,
  autoGenerateRanges,
  createDemoAppData,
  findLocationForDate,
  getLocationTransitionDates,
  migrateAppData,
  validateLocationTimeline,
  type ProjectLocationDraft,
} from "@temperature-blanket/core";

const chicago = { query: "Chicago", name: "Chicago", latitude: 41.88, longitude: -87.63 };
const denver = { query: "Denver", name: "Denver", latitude: 39.74, longitude: -104.99 };

function timeline(): ProjectLocationDraft[] {
  return [
    { id: "loc-1", location: chicago, startDate: "2024-01-01", endDate: "2024-02-28", sortOrder: 0 },
    { id: "loc-2", location: denver, startDate: "2024-02-29", endDate: "2024-12-31", sortOrder: 1 },
  ];
}

describe("multi-location timeline", () => {
  it("accepts continuous leap-day coverage and rejects a gap", () => {
    expect(validateLocationTimeline(timeline(), "2024-01-01", "2024-12-31").isValid).toBe(true);
    const broken = timeline();
    broken[1].startDate = "2024-03-01";
    expect(validateLocationTimeline(broken, "2024-01-01", "2024-12-31").isValid).toBe(false);
  });

  it("resolves dates and transition markers to the correct assignment", () => {
    const assignments = timeline().map((item) => ({
      id: item.id!, projectId: "project", locationName: item.location.name,
      latitude: item.location.latitude, longitude: item.location.longitude,
      startDate: item.startDate, endDate: item.endDate, sortOrder: item.sortOrder,
      weatherSource: "demo" as const, weatherSourceLabel: "Demo",
    }));
    expect(findLocationForDate("2024-02-28", assignments)?.id).toBe("loc-1");
    expect(findLocationForDate("2024-02-29", assignments)?.id).toBe("loc-2");
    expect(getLocationTransitionDates(assignments).has("2024-02-29")).toBe(true);
  });

  it("maps each location through its own palette", () => {
    const demo = createDemoAppData();
    const project = { ...demo.projects[0], id: "project", colorScaleMode: "per-location" as const };
    const cold = autoGenerateRanges("project", { min: 0, max: 30 }, 2, "loc-1");
    const warm = autoGenerateRanges("project", { min: 70, max: 100 }, 2, "loc-2");
    const days = applyRangesToDays(project, [
      { date: "2024-01-01", tempHigh: 20, tempLow: 10, tempAvg: 15, projectLocationId: "loc-1" },
      { date: "2024-07-01", tempHigh: 90, tempLow: 70, tempAvg: 80, projectLocationId: "loc-2" },
    ], [...cold, ...warm]);
    expect(days[0].mappedRangeId).toBe(cold[0].id);
    expect(days[1].mappedRangeId).toBe(warm[0].id);
  });
});

describe("version 3 migration", () => {
  it("creates one assignment and links legacy days without changing completion", () => {
    const demo = createDemoAppData();
    const legacy = {
      version: 3,
      data: {
        projects: demo.projects.map(({ colorScaleMode: _mode, ...project }) => project),
        ranges: demo.ranges.map(({ projectLocationId: _location, ...range }) => range),
        temperatureDays: demo.temperatureDays.map(({ projectLocationId: _location, ...day }) => day),
        progressRows: demo.progressRows,
        weatherCache: demo.weatherCache,
      },
    };
    const migrated = migrateAppData(legacy);
    expect(migrated.projectLocations).toHaveLength(migrated.projects.length);
    expect(migrated.temperatureDays.every((day) => day.projectLocationId)).toBe(true);
    expect(migrated.progressRows.filter((row) => row.completed)).toHaveLength(demo.progressRows.filter((row) => row.completed).length);
  });
});
