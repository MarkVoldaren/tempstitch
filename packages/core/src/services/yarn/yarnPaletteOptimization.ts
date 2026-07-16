import { YarnCatalogService, yarnCatalogService } from "./yarnCatalogService";
import {
  RecommendationMode,
  TemperatureRangeColor,
  YarnRecommendation,
} from "../../types/models";
import {
  areHexColorsNearSimilar,
  describeColorMatch,
  getColorLuminance,
  getColorSaturation,
  getColorSimilarityBucket,
  getRgbDistance,
  getWarmthScore,
  normalizeHexColor,
} from "../../utils/color";

export const YARN_RECOMMENDATION_TUNING = {
  candidateLimit: 6,
  beamWidth: 12,
  adjacentNearDistanceThreshold: 34,
  exactMatchPenalty: 240,
  nearMatchPenalty: 120,
  nonAdjacentReusePenalty: 22,
  gradientPenalty: 12,
  strongSeparationMultiplier: 1.7,
} as const;

export type YarnRecommendationConflict = {
  leftRangeId: string;
  rightRangeId: string;
  leftIndex: number;
  rightIndex: number;
  severity: "exact" | "near";
  message: string;
};

type OptimizationProfile = "balanced" | "strong-separation";

type SequenceOptions = {
  brandId?: string | null;
  recommendationMode: RecommendationMode;
  catalog?: YarnCatalogService;
  preserveLocked?: boolean;
  profile?: OptimizationProfile;
};

type BeamState = {
  score: number;
  chosen: YarnRecommendation[];
  useCounts: Record<string, number>;
};

function getMatchQuality(distance: number): YarnRecommendation["matchQuality"] {
  if (distance < 42) {
    return "close";
  }

  if (distance < 88) {
    return "fair";
  }

  return "weak";
}

function buildRecommendation(targetHex: string, brandId: string, yarnColor: { id: string; name: string; hex: string }) {
  const normalizedTarget = normalizeHexColor(targetHex);
  const distance = getRgbDistance(normalizedTarget, yarnColor.hex);
  const score = Math.max(0, 100 - Math.round((distance / 441.67) * 100));

  return {
    yarnColorId: yarnColor.id,
    brandId,
    colorName: yarnColor.name,
    hex: yarnColor.hex,
    score,
    distance,
    explanation: describeColorMatch(normalizedTarget, yarnColor.hex),
    matchQuality: getMatchQuality(distance),
  } satisfies YarnRecommendation;
}

function getProfileMultiplier(profile: OptimizationProfile) {
  return profile === "strong-separation"
    ? YARN_RECOMMENDATION_TUNING.strongSeparationMultiplier
    : 1;
}

function getTransitionPenalty(
  previousCandidate: YarnRecommendation | undefined,
  currentCandidate: YarnRecommendation,
  previousTargetHex: string | undefined,
  currentTargetHex: string,
  useCount: number,
  profile: OptimizationProfile,
) {
  const multiplier = getProfileMultiplier(profile);
  let penalty = 0;

  if (previousCandidate) {
    const similarity = getColorSimilarityBucket(
      previousCandidate.hex,
      currentCandidate.hex,
      YARN_RECOMMENDATION_TUNING.adjacentNearDistanceThreshold,
    );

    if (similarity === "exact") {
      penalty += YARN_RECOMMENDATION_TUNING.exactMatchPenalty * multiplier;
    } else if (similarity === "near") {
      penalty += YARN_RECOMMENDATION_TUNING.nearMatchPenalty * multiplier;
    }

    if (previousTargetHex) {
      const targetWarmthDelta = getWarmthScore(currentTargetHex) - getWarmthScore(previousTargetHex);
      const chosenWarmthDelta = getWarmthScore(currentCandidate.hex) - getWarmthScore(previousCandidate.hex);
      const targetLuminanceDelta = getColorLuminance(currentTargetHex) - getColorLuminance(previousTargetHex);
      const chosenLuminanceDelta = getColorLuminance(currentCandidate.hex) - getColorLuminance(previousCandidate.hex);
      const targetSaturationDelta = getColorSaturation(currentTargetHex) - getColorSaturation(previousTargetHex);
      const chosenSaturationDelta = getColorSaturation(currentCandidate.hex) - getColorSaturation(previousCandidate.hex);

      if (Math.sign(targetWarmthDelta) !== Math.sign(chosenWarmthDelta) && Math.abs(targetWarmthDelta) > 0.08) {
        penalty += YARN_RECOMMENDATION_TUNING.gradientPenalty;
      }

      if (Math.sign(targetLuminanceDelta) !== Math.sign(chosenLuminanceDelta) && Math.abs(targetLuminanceDelta) > 0.08) {
        penalty += YARN_RECOMMENDATION_TUNING.gradientPenalty;
      }

      if (Math.sign(targetSaturationDelta) !== Math.sign(chosenSaturationDelta) && Math.abs(targetSaturationDelta) > 0.12) {
        penalty += YARN_RECOMMENDATION_TUNING.gradientPenalty / 2;
      }
    }
  }

  if (useCount > 0) {
    penalty += YARN_RECOMMENDATION_TUNING.nonAdjacentReusePenalty * useCount;
  }

  return penalty;
}

export function getTopYarnCandidatesForColor(
  targetHex: string,
  brandId: string | null | undefined,
  limit: number = YARN_RECOMMENDATION_TUNING.candidateLimit,
  catalog: YarnCatalogService = yarnCatalogService,
) {
  if (!brandId) {
    return [];
  }

  const colors = catalog.getColorsByBrandId(brandId).filter((color) => !color.retired);
  if (!colors.length) {
    return [];
  }

  return colors
    .map((color) => buildRecommendation(targetHex, brandId, color))
    .sort((left, right) => left.distance - right.distance || right.score - left.score)
    .slice(0, limit);
}

export function recommendYarnForBandSequence(
  ranges: TemperatureRangeColor[],
  options: SequenceOptions,
) {
  const {
    brandId,
    recommendationMode,
    catalog = yarnCatalogService,
    preserveLocked = true,
    profile = "balanced",
  } = options;

  if (!brandId || recommendationMode === "manual-only") {
    return ranges.map((range) => ({
      ...range,
      recommendedYarnBrandId: brandId ?? null,
      recommendedYarnColorId: null,
      lockedToRecommendedYarn: false,
      userOverrodeRecommendation:
        recommendationMode === "manual-only" ? range.userOverrodeRecommendation ?? false : false,
    }));
  }

  const brand = catalog.getBrandById(brandId);
  if (!brand) {
    return ranges.map((range) => ({
      ...range,
      recommendedYarnBrandId: brandId,
      recommendedYarnColorId: null,
      lockedToRecommendedYarn: false,
    }));
  }

  const ordered = ranges
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder);

  const candidateLists = ordered.map((range) => {
    const lockedColor =
      preserveLocked && range.lockedToRecommendedYarn && range.recommendedYarnColorId
        ? catalog.getColorById(range.recommendedYarnColorId)
        : null;

    if (lockedColor) {
      return [buildRecommendation(range.hexColor, brand.id, lockedColor)];
    }

    return getTopYarnCandidatesForColor(range.hexColor, brand.id, YARN_RECOMMENDATION_TUNING.candidateLimit, catalog);
  });

  let beam: BeamState[] = [{ score: 0, chosen: [], useCounts: {} }];

  ordered.forEach((range, index) => {
    const candidates = candidateLists[index];
    if (!candidates.length) {
      return;
    }

    const nextBeam: BeamState[] = [];

    beam.forEach((state) => {
      candidates.forEach((candidate) => {
        const previousCandidate = state.chosen[state.chosen.length - 1];
        const previousTargetHex = index > 0 ? ordered[index - 1]?.hexColor : undefined;
        const useCount = state.useCounts[candidate.yarnColorId] ?? 0;
        const transitionPenalty = getTransitionPenalty(
          previousCandidate,
          candidate,
          previousTargetHex,
          range.hexColor,
          useCount,
          profile,
        );

        nextBeam.push({
          score: state.score + candidate.distance + transitionPenalty,
          chosen: [...state.chosen, candidate],
          useCounts: {
            ...state.useCounts,
            [candidate.yarnColorId]: useCount + 1,
          },
        });
      });
    });

    beam = nextBeam
      .sort((left, right) => left.score - right.score)
      .slice(0, YARN_RECOMMENDATION_TUNING.beamWidth);
  });

  const best = beam[0];
  if (!best || best.chosen.length !== ordered.length) {
    return ranges;
  }

  return ordered.map((range, index) => {
    const selected = best.chosen[index];
    const recommendedColor = catalog.getColorById(selected.yarnColorId);
    const useBrandPaletteDefaults = recommendationMode === "brand-palette-only";

    return {
      ...range,
      recommendedYarnBrandId: brand.id,
      recommendedYarnColorId: selected.yarnColorId,
      lockedToRecommendedYarn: preserveLocked && range.lockedToRecommendedYarn && range.recommendedYarnColorId
        ? true
        : useBrandPaletteDefaults
          ? true
          : range.lockedToRecommendedYarn ?? false,
      userOverrodeRecommendation: preserveLocked && range.lockedToRecommendedYarn && range.recommendedYarnColorId
        ? range.userOverrodeRecommendation ?? true
        : false,
      yarnName:
        range.yarnName.trim() && !useBrandPaletteDefaults
          ? range.yarnName
          : recommendedColor?.name ?? range.yarnName,
    };
  });
}

export function detectAdjacentRecommendationConflicts(
  ranges: TemperatureRangeColor[],
  catalog: YarnCatalogService = yarnCatalogService,
  nearDistanceThreshold = YARN_RECOMMENDATION_TUNING.adjacentNearDistanceThreshold,
) {
  const ordered = ranges
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const conflicts: YarnRecommendationConflict[] = [];

  for (let index = 0; index < ordered.length - 1; index += 1) {
    const left = ordered[index];
    const right = ordered[index + 1];
    const leftColor = catalog.getColorById(left.recommendedYarnColorId);
    const rightColor = catalog.getColorById(right.recommendedYarnColorId);

    if (!leftColor || !rightColor) {
      continue;
    }

    if (leftColor.id === rightColor.id) {
      conflicts.push({
        leftRangeId: left.id,
        rightRangeId: right.id,
        leftIndex: index,
        rightIndex: index + 1,
        severity: "exact",
        message: `${left.label} and ${right.label} landed on the same yarn color.`,
      });
      continue;
    }

    if (areHexColorsNearSimilar(leftColor.hex, rightColor.hex, nearDistanceThreshold)) {
      conflicts.push({
        leftRangeId: left.id,
        rightRangeId: right.id,
        leftIndex: index,
        rightIndex: index + 1,
        severity: "near",
        message: `${left.label} and ${right.label} are using very similar yarn colors.`,
      });
    }
  }

  return conflicts;
}
