import { YarnCatalogService, yarnCatalogService } from "./yarnCatalogService";
import {
  detectAdjacentRecommendationConflicts,
  getTopYarnCandidatesForColor,
  recommendYarnForBandSequence,
} from "./yarnPaletteOptimization";
import {
  RecommendationMode,
  TemperatureRangeColor,
  YarnColor,
  YarnRecommendation,
} from "../../types/models";

type ApplyRecommendationOptions = {
  brandId?: string | null;
  recommendationMode: RecommendationMode;
  catalog?: YarnCatalogService;
  preserveLocked?: boolean;
  profile?: "balanced" | "strong-separation";
};

export function recommendYarnColorsForHex(
  targetHex: string,
  brandId: string | null | undefined,
  options: { limit?: number } = {},
  catalog: YarnCatalogService = yarnCatalogService,
): YarnRecommendation[] {
  return getTopYarnCandidatesForColor(targetHex, brandId, options.limit, catalog);
}

export function applyYarnRecommendationsToRanges(
  ranges: TemperatureRangeColor[],
  options: ApplyRecommendationOptions,
): TemperatureRangeColor[] {
  return recommendYarnForBandSequence(ranges, options);
}

export function chooseYarnRecommendationForRange(
  range: TemperatureRangeColor,
  recommendation: YarnRecommendation,
  catalog: YarnCatalogService = yarnCatalogService,
) {
  const yarnColor = catalog.getColorById(recommendation.yarnColorId);

  return {
    ...range,
    recommendedYarnBrandId: recommendation.brandId,
    recommendedYarnColorId: recommendation.yarnColorId,
    lockedToRecommendedYarn: true,
    userOverrodeRecommendation: true,
    yarnName: yarnColor?.name ?? range.yarnName,
  };
}

export function getRecommendedYarnColorForRange(
  range: TemperatureRangeColor,
  catalog: YarnCatalogService = yarnCatalogService,
): YarnColor | null {
  return catalog.getColorById(range.recommendedYarnColorId);
}

export function getRangeYarnSuggestions(
  range: TemperatureRangeColor,
  brandId: string | null | undefined,
  catalog: YarnCatalogService = yarnCatalogService,
) {
  return recommendYarnColorsForHex(range.hexColor, brandId, { limit: 5 }, catalog);
}

export { detectAdjacentRecommendationConflicts };
