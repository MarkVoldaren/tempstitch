import { describe, expect, it } from "vitest";
import {
  applyYarnRecommendationsToRanges,
  autoGenerateRanges,
  detectAdjacentRecommendationConflicts,
  mapTemperatureToRange,
  normalizeAdjacentRanges,
  validateRanges,
} from "@temperature-blanket/core";

describe("temperature range parity", () => {
  it("maps inclusive lower and upper boundaries", () => {
    const ranges = autoGenerateRanges("project", { min: 30, max: 44 }, 2);
    expect(mapTemperatureToRange(30, ranges)?.id).toBe(ranges[0].id);
    expect(mapTemperatureToRange(ranges[0].maxTemp, ranges)?.id).toBe(ranges[0].id);
    expect(mapTemperatureToRange(ranges[1].minTemp, ranges)?.id).toBe(ranges[1].id);
  });

  it("normalizes adjacent ranges without gaps or overlaps", () => {
    const ranges = autoGenerateRanges("project", { min: 0, max: 20 }, 3);
    ranges[1].minTemp = 12;
    const normalized = normalizeAdjacentRanges(ranges);
    expect(normalized[1].minTemp).toBe(normalized[0].maxTemp + 1);
    expect(validateRanges(normalized, { min: 0, max: 20 }, false).isValid).toBe(true);
  });

  it("reports gaps and overlapping bands", () => {
    const ranges = autoGenerateRanges("project", { min: 0, max: 20 }, 3);
    ranges[1].minTemp = ranges[0].maxTemp;
    expect(validateRanges(ranges, { min: 0, max: 20 }, false).overlaps.length).toBeGreaterThan(0);
  });
});

describe("yarn palette optimization", () => {
  it("produces a complete brand recommendation sequence", () => {
    const ranges = autoGenerateRanges("project", { min: 0, max: 70 }, 8);
    const recommended = applyYarnRecommendationsToRanges(ranges, {
      brandId: "lion-brand",
      recommendationMode: "exact-nearest",
      preserveLocked: false,
      profile: "strong-separation",
    });
    expect(recommended).toHaveLength(ranges.length);
    expect(recommended.every((range) => range.recommendedYarnColorId)).toBe(true);
    expect(detectAdjacentRecommendationConflicts(recommended).length).toBeLessThan(recommended.length - 1);
  });
});
