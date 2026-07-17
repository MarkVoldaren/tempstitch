"use client";

import { useMemo } from "react";
import { getLocationTransitionDates, getProjectCompletion, getProjectDays, getProjectLocations, getProjectProgressRows, getProjectRanges, yarnCatalogService } from "@temperature-blanket/core";
import { useAppData } from "@/providers/AppDataProvider";

export function useProjectWorkspace(projectId: string) {
  const { data } = useAppData();
  return useMemo(() => {
    const project = data.projects.find((item) => item.id === projectId) ?? null;
    const ranges = getProjectRanges(projectId, data.ranges);
    const locations = getProjectLocations(projectId, data.projectLocations);
    const days = getProjectDays(projectId, data.temperatureDays);
    const progressRows = getProjectProgressRows(projectId, data.progressRows);
    return {
      project, ranges, locations, days, progressRows,
      locationById: new Map(locations.map((location) => [location.id, location])),
      rangesByLocation: new Map(locations.map((location) => [location.id, ranges.filter((range) => range.projectLocationId === location.id)])),
      sharedRanges: ranges.filter((range) => range.projectLocationId === null),
      transitionDates: getLocationTransitionDates(locations),
      rangeById: new Map(ranges.map((range) => [range.id, range])),
      dayByDate: new Map(days.map((day) => [day.date, day])),
      completion: getProjectCompletion(projectId, data.progressRows),
      yarnBrand: project?.preferredYarnBrandId ? yarnCatalogService.getBrandById(project.preferredYarnBrandId) : null,
      unmappedCount: days.filter((day) => !day.missingData && !day.mappedRangeId).length,
    };
  }, [data, projectId]);
}
