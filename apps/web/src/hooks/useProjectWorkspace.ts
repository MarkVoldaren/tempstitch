"use client";

import { useMemo } from "react";
import { getProjectCompletion, getProjectDays, getProjectProgressRows, getProjectRanges, yarnCatalogService } from "@temperature-blanket/core";
import { useAppData } from "@/providers/AppDataProvider";

export function useProjectWorkspace(projectId: string) {
  const { data } = useAppData();
  return useMemo(() => {
    const project = data.projects.find((item) => item.id === projectId) ?? null;
    const ranges = getProjectRanges(projectId, data.ranges);
    const days = getProjectDays(projectId, data.temperatureDays);
    const progressRows = getProjectProgressRows(projectId, data.progressRows);
    return {
      project, ranges, days, progressRows,
      rangeById: new Map(ranges.map((range) => [range.id, range])),
      dayByDate: new Map(days.map((day) => [day.date, day])),
      completion: getProjectCompletion(projectId, data.progressRows),
      yarnBrand: project?.preferredYarnBrandId ? yarnCatalogService.getBrandById(project.preferredYarnBrandId) : null,
      unmappedCount: days.filter((day) => !day.missingData && !day.mappedRangeId).length,
    };
  }, [data, projectId]);
}
