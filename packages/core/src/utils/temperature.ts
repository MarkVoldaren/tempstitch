import {
  Project,
  RangeValidationResult,
  TemperatureDay,
  TemperatureRangeColor,
  WeatherDayRecord,
} from "../types/models";

export function roundTemp(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return null;
  }

  return Math.round(value * 10) / 10;
}

export function formatTemperature(
  value: number | null,
  unit: Project["unit"],
  fallback = "Missing",
) {
  if (value === null || Number.isNaN(value)) {
    return fallback;
  }

  return `${Math.round(value)} deg ${unit === "fahrenheit" ? "F" : "C"}`;
}

export function getBandComparisonTemperature(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return null;
  }

  // Match the bucket logic to what the UI shows so a displayed "30" maps into a 30-37 band.
  return Math.round(value);
}

export function getSelectedTemperature(project: Project, day: WeatherDayRecord) {
  if (project.tempMode === "high") {
    return roundTemp(day.tempHigh);
  }

  if (project.tempMode === "low") {
    return roundTemp(day.tempLow);
  }

  return roundTemp(day.tempAvg);
}

export function mapTemperatureToRange(
  value: number | null,
  ranges: TemperatureRangeColor[],
) {
  const comparableValue = getBandComparisonTemperature(value);
  if (comparableValue === null) {
    return null;
  }

  return (
    ranges
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .find((range) => comparableValue >= range.minTemp && comparableValue <= range.maxTemp) ?? null
  );
}

export function buildRangeLabel(minTemp: number, maxTemp: number) {
  return `${minTemp} to ${maxTemp}`;
}

export function fillBlankRangeLabels(ranges: TemperatureRangeColor[]) {
  return ranges.map((range) => ({
    ...range,
    label: range.label.trim() || buildRangeLabel(range.minTemp, range.maxTemp),
  }));
}

export function applyRangesToDays(
  project: Project,
  days: WeatherDayRecord[],
  ranges: TemperatureRangeColor[],
) {
  const normalizedRanges = fillBlankRangeLabels(ranges);

  return days.map<TemperatureDay>((day) => {
    const selectedTemp = getSelectedTemperature(project, day);
    const mappedRange = mapTemperatureToRange(selectedTemp, normalizedRanges);

    return {
      id: `${project.id}:${day.date}`,
      projectId: project.id,
      date: day.date,
      tempHigh: roundTemp(day.tempHigh),
      tempLow: roundTemp(day.tempLow),
      tempAvg: roundTemp(day.tempAvg),
      selectedTemp,
      mappedRangeId: mappedRange?.id ?? null,
      mappedColor: mappedRange?.hexColor ?? null,
      missingData:
        day.tempHigh === null && day.tempLow === null && day.tempAvg === null,
    };
  });
}

export function getTemperatureSpan(days: Array<WeatherDayRecord | TemperatureDay>) {
  const values = days
    .map((day) => {
      const maybeSelected = "selectedTemp" in day ? day.selectedTemp : null;
      return maybeSelected ?? day.tempAvg ?? day.tempHigh ?? day.tempLow;
    })
    .filter((value): value is number => typeof value === "number");

  if (!values.length) {
    return null;
  }

  return {
    min: Math.floor(Math.min(...values)),
    max: Math.ceil(Math.max(...values)),
  };
}

export function autoGenerateRanges(
  projectId: string,
  span: { min: number; max: number },
  bandCount = 8,
) {
  const bands = Math.max(1, bandCount);
  const width = Math.max(1, Math.ceil((span.max - span.min + 1) / bands));
  const colors = [
    "#355070",
    "#6D597A",
    "#B56576",
    "#E56B6F",
    "#EAAC8B",
    "#DDB892",
    "#A98467",
    "#7F5539",
    "#588157",
    "#4D908E",
    "#577590",
    "#A44A3F",
  ];

  return Array.from({ length: bands }, (_, index) => {
    const minTemp = span.min + index * width;
    const maxTemp = index === bands - 1 ? span.max : minTemp + width - 1;

    return {
      id: `${projectId}:range:${index + 1}`,
      projectId,
      minTemp,
      maxTemp,
      hexColor: colors[index % colors.length],
      label: buildRangeLabel(minTemp, maxTemp),
      yarnName: `Shade ${index + 1}`,
      notes: "",
      recommendedYarnColorId: null,
      recommendedYarnBrandId: null,
      lockedToRecommendedYarn: false,
      userOverrodeRecommendation: false,
      sortOrder: index,
    };
  });
}

export function reorderRanges(
  ranges: TemperatureRangeColor[],
  fromIndex: number,
  toIndex: number,
) {
  const next = ranges.slice();
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);

  return next.map((range, index) => ({
    ...range,
    sortOrder: index,
  }));
}

export function normalizeAdjacentRanges(ranges: TemperatureRangeColor[]) {
  const ordered = ranges
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((range) => ({ ...range }));

  for (let index = 0; index < ordered.length - 1; index += 1) {
    const current = ordered[index];
    const next = ordered[index + 1];
    next.minTemp = current.maxTemp + 1;
    if (next.maxTemp < next.minTemp) {
      next.maxTemp = next.minTemp;
    }
  }

  return fillBlankRangeLabels(ordered).map((range, index) => ({
    ...range,
    sortOrder: index,
  }));
}

export function validateRanges(
  ranges: TemperatureRangeColor[],
  span: { min: number; max: number } | null,
  allowGaps: boolean,
): RangeValidationResult {
  const ordered = ranges.slice().sort((a, b) => a.minTemp - b.minTemp);
  const overlaps: string[] = [];
  const gaps: string[] = [];
  const adjacentDuplicateWarnings: string[] = [];

  for (let index = 0; index < ordered.length - 1; index += 1) {
    const current = ordered[index];
    const next = ordered[index + 1];

    if (current.maxTemp >= next.minTemp) {
      overlaps.push(`${current.label || current.yarnName} overlaps ${next.label || next.yarnName}`);
    } else if (!allowGaps && current.maxTemp + 1 < next.minTemp) {
      gaps.push(`${current.maxTemp + 1} to ${next.minTemp - 1}`);
    }

    if (current.hexColor.toUpperCase() === next.hexColor.toUpperCase()) {
      adjacentDuplicateWarnings.push(`${current.label || current.yarnName} and ${next.label || next.yarnName}`);
    }
  }

  let outOfSpan = false;
  if (span && ordered.length) {
    if (ordered[0].minTemp > span.min || ordered[ordered.length - 1].maxTemp < span.max) {
      outOfSpan = true;
    }
  }

  return {
    overlaps,
    gaps,
    outOfSpan,
    adjacentDuplicateWarnings,
    isValid: overlaps.length === 0 && (allowGaps || gaps.length === 0),
  };
}

export function getColorUsage(days: TemperatureDay[]) {
  return days.reduce<Record<string, number>>((accumulator, day) => {
    const key = day.mappedColor ?? "unmapped";
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});
}
