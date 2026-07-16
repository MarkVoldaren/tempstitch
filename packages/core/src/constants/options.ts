import {
  CraftType,
  PreviewOrientation,
  RecommendationMode,
  TemperatureMode,
  TemperatureUnit,
} from "../types/models";

export const unitOptions: Array<{ label: string; value: TemperatureUnit }> = [
  { label: "Fahrenheit", value: "fahrenheit" },
  { label: "Celsius", value: "celsius" },
];

export const tempModeOptions: Array<{ label: string; value: TemperatureMode }> = [
  { label: "Average", value: "avg" },
  { label: "Daily high", value: "high" },
  { label: "Daily low", value: "low" },
];

export const craftOptions: Array<{ label: string; value: CraftType }> = [
  { label: "Crochet", value: "crochet" },
  { label: "Knit", value: "knit" },
];

export const orientationOptions: Array<{
  label: string;
  value: PreviewOrientation;
}> = [
  { label: "Vertical strip", value: "vertical" },
  { label: "Horizontal rows", value: "horizontal" },
];

export const stitchPresets = [
  "Single crochet",
  "Double crochet",
  "Half double crochet",
  "Garter",
  "Stockinette",
  "Moss stitch",
];

export const recommendationModeOptions: Array<{
  label: string;
  value: RecommendationMode;
}> = [
  { label: "Exact nearest", value: "exact-nearest" },
  { label: "Brand palette only", value: "brand-palette-only" },
  { label: "Manual only", value: "manual-only" },
];

export const yarnPalette = [
  "#284B63",
  "#3C6E71",
  "#7B9E87",
  "#D0A98F",
  "#E07A5F",
  "#F2CC8F",
  "#C8553D",
  "#6F1D1B",
  "#9A8C98",
  "#4361EE",
  "#7CDEDC",
  "#FFC8DD",
];
