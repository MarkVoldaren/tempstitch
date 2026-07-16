import {
  BuildProgressRow,
  Project,
  TemperatureDay,
  TemperatureRangeColor,
} from "../types/models";
import { compareIsoDates } from "./date";

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

export function sortProjects(projects: Project[]) {
  return projects
    .slice()
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    );
}

export function getActiveProjects(projects: Project[]) {
  return sortProjects(projects).filter((project) => !project.archivedAt);
}

export function getArchivedProjects(projects: Project[]) {
  return sortProjects(projects).filter((project) => Boolean(project.archivedAt));
}

export function getProjectRanges(
  projectId: string,
  ranges: TemperatureRangeColor[],
) {
  return ranges
    .filter((range) => range.projectId === projectId)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export function getProjectDays(projectId: string, days: TemperatureDay[]) {
  return days
    .filter((day) => day.projectId === projectId)
    .sort((left, right) => compareIsoDates(left.date, right.date));
}

export function getProjectProgressRows(
  projectId: string,
  progressRows: BuildProgressRow[],
) {
  return progressRows
    .filter((row) => row.projectId === projectId)
    .sort((left, right) => left.rowNumber - right.rowNumber);
}

export function getProjectCompletion(projectId: string, progressRows: BuildProgressRow[]) {
  const rows = getProjectProgressRows(projectId, progressRows);
  const completed = rows.filter((row) => row.completed).length;
  const total = rows.length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return {
    completed,
    total,
    percent,
  };
}

export function getNextRows(
  projectId: string,
  progressRows: BuildProgressRow[],
  days: TemperatureDay[],
  count = 5,
) {
  const rows = getProjectProgressRows(projectId, progressRows).filter((row) => !row.completed);
  const dayMap = new Map(days.map((day) => [day.date, day]));

  return rows.slice(0, count).map((row) => ({
    progressRow: row,
    day: dayMap.get(row.date) ?? null,
  }));
}

export function hasProjectWeatherSettingsChanged(
  project: Project,
  next: Pick<Project, "locationName" | "latitude" | "longitude" | "startDate" | "endDate" | "tempMode">,
) {
  return (
    project.locationName !== next.locationName ||
    project.latitude !== next.latitude ||
    project.longitude !== next.longitude ||
    project.startDate !== next.startDate ||
    project.endDate !== next.endDate ||
    project.tempMode !== next.tempMode
  );
}
