import {
  ProjectLocationAssignment,
  ProjectLocationDraft,
  TemperatureDay,
} from "../types/models";
import { compareIsoDates, enumerateDateRange } from "./date";

export const MAX_PROJECT_LOCATIONS = 12;

export type LocationTimelineValidation = {
  errors: string[];
  isValid: boolean;
};

export function addDays(date: string, amount: number) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + amount);
  return value.toISOString().slice(0, 10);
}

export function sortProjectLocations<T extends Pick<ProjectLocationAssignment, "sortOrder" | "startDate">>(locations: T[]) {
  return locations.slice().sort((left, right) => left.sortOrder - right.sortOrder || compareIsoDates(left.startDate, right.startDate));
}

export function getProjectLocations(projectId: string, locations: ProjectLocationAssignment[]) {
  return sortProjectLocations(locations.filter((location) => location.projectId === projectId));
}

export function validateLocationTimeline(
  locations: ProjectLocationDraft[],
  projectStartDate: string,
  projectEndDate: string,
): LocationTimelineValidation {
  const ordered = locations.slice().sort((a, b) => a.sortOrder - b.sortOrder);
  const errors: string[] = [];
  if (!ordered.length) errors.push("Add at least one location.");
  if (ordered.length > MAX_PROJECT_LOCATIONS) errors.push(`Use no more than ${MAX_PROJECT_LOCATIONS} locations.`);
  if (ordered[0]?.startDate !== projectStartDate) errors.push("The first location must begin on the project start date.");
  if (ordered.at(-1)?.endDate !== projectEndDate) errors.push("The last location must end on the project end date.");
  ordered.forEach((location, index) => {
    if (!location.location.name.trim()) errors.push(`Location ${index + 1} is missing a place.`);
    if (compareIsoDates(location.startDate, location.endDate) > 0) errors.push(`Location ${index + 1} has an invalid date range.`);
    const next = ordered[index + 1];
    if (next && next.startDate !== addDays(location.endDate, 1)) errors.push(`Locations ${index + 1} and ${index + 2} must be consecutive.`);
  });
  return { errors, isValid: errors.length === 0 };
}

export function findLocationForDate<T extends Pick<ProjectLocationAssignment, "startDate" | "endDate">>(date: string, locations: T[]) {
  return locations.find((location) => compareIsoDates(date, location.startDate) >= 0 && compareIsoDates(date, location.endDate) <= 0) ?? null;
}

export function getLocationTransitionDates(locations: ProjectLocationAssignment[]) {
  return new Set(sortProjectLocations(locations).slice(1).map((location) => location.startDate));
}

export function getLocationDayCount(location: Pick<ProjectLocationAssignment, "startDate" | "endDate">) {
  return enumerateDateRange(location.startDate, location.endDate).length;
}

export function getLocationDays(locationId: string, days: TemperatureDay[]) {
  return days.filter((day) => day.projectLocationId === locationId).sort((a, b) => compareIsoDates(a.date, b.date));
}
