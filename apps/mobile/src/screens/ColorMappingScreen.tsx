import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/AppButton";
import { ColorRangeEditor } from "@/components/ColorRangeEditor";
import { DataSourceChip } from "@/components/DataSourceChip";
import { InlineBanner } from "@/components/InlineBanner";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionCard } from "@/components/SectionCard";
import { YarnRecommendationModal } from "@/components/YarnRecommendationModal";
import {
  applyYarnRecommendationsToRanges,
  chooseYarnRecommendationForRange,
  detectAdjacentRecommendationConflicts,
  getRangeYarnSuggestions,
  getRecommendedYarnColorForRange,
  yarnCatalogService,
} from "@/services/yarn";
import { AppTheme, useAppTheme, useThemedStyles } from "@/theme";
import { TemperatureRangeColor } from "@/types/models";
import { useAppStore } from "@/hooks/useAppStore";
import { RootStackParamList } from "@/types/navigation";
import { getYarnOutlineColor } from "@/utils/color";
import { createId, getProjectDays, getProjectRanges } from "@/utils/project";
import {
  autoGenerateRanges,
  fillBlankRangeLabels,
  getTemperatureSpan,
  normalizeAdjacentRanges,
  reorderRanges,
  validateRanges,
} from "@/utils/temperature";

type Props = NativeStackScreenProps<RootStackParamList, "ColorMapping">;

export function ColorMappingScreen({ navigation, route }: Props) {
  const styles = useThemedStyles(createStyles);
  const { currentTheme: theme } = useAppTheme();
  const { data, saveRanges } = useAppStore();
  const project = data.projects.find((item) => item.id === route.params.projectId);
  const projectDays = getProjectDays(route.params.projectId, data.temperatureDays);
  const persistedRanges = getProjectRanges(route.params.projectId, data.ranges);
  const persistedRangesKey = persistedRanges
    .map((range) => `${range.id}:${range.minTemp}:${range.maxTemp}:${range.hexColor}:${range.sortOrder}`)
    .join("|");
  const [ranges, setRanges] = useState<TemperatureRangeColor[]>(persistedRanges);
  const [allowRangeGaps, setAllowRangeGaps] = useState(project?.allowRangeGaps ?? false);
  const [modalRangeId, setModalRangeId] = useState<string | null>(null);

  useEffect(() => {
    setRanges(persistedRanges);
    setAllowRangeGaps(project?.allowRangeGaps ?? false);
  }, [persistedRangesKey, project?.allowRangeGaps]);

  if (!project) {
    return (
      <ScreenContainer>
        <SectionCard>
          <Text style={styles.warningText}>This project could not be found.</Text>
        </SectionCard>
      </ScreenContainer>
    );
  }

  const activeProject = project;
  const selectedBrand = yarnCatalogService.getBrandById(activeProject.preferredYarnBrandId);
  const selectedBrandId = selectedBrand?.id ?? null;
  const recommendationsEnabled =
    Boolean(selectedBrandId) && activeProject.recommendationMode !== "manual-only";
  const span = getTemperatureSpan(projectDays);
  const validation = validateRanges(ranges, span, allowRangeGaps);
  const modalRange = modalRangeId ? ranges.find((range) => range.id === modalRangeId) ?? null : null;
  const modalSuggestions = useMemo(() => {
    if (!modalRange || !selectedBrandId) {
      return [];
    }

    return getRangeYarnSuggestions(modalRange, selectedBrandId).flatMap((recommendation) => {
      const yarnColor = yarnCatalogService.getColorById(recommendation.yarnColorId);
      return yarnColor ? [{ recommendation, yarnColor }] : [];
    });
  }, [modalRange, selectedBrandId]);
  const adjacentConflicts = detectAdjacentRecommendationConflicts(ranges);
  const conflictByRangeId = adjacentConflicts.reduce<Record<string, string>>((accumulator, conflict) => {
    accumulator[conflict.leftRangeId] = conflict.message;
    accumulator[conflict.rightRangeId] = conflict.message;
    return accumulator;
  }, {});

  function syncRecommendations(
    nextRanges: TemperatureRangeColor[],
    preserveLocked = true,
    profile: "balanced" | "strong-separation" = "balanced",
  ) {
    return applyYarnRecommendationsToRanges(nextRanges, {
      brandId: activeProject.preferredYarnBrandId,
      recommendationMode: activeProject.recommendationMode,
      preserveLocked,
      profile,
    });
  }

  async function handleSave() {
    await saveRanges(activeProject.id, fillBlankRangeLabels(ranges), allowRangeGaps);
    navigation.replace("BlanketPreview", { projectId: activeProject.id });
  }

  return (
    <ScreenContainer>
      <YarnRecommendationModal
        brandName={selectedBrand?.name ?? "Selected brand"}
        onClose={() => setModalRangeId(null)}
        onSelect={(recommendation) => {
          setRanges((current) =>
            current.map((range) =>
              range.id === modalRangeId
                ? chooseYarnRecommendationForRange(range, recommendation)
                : range,
            ),
          );
          setModalRangeId(null);
        }}
        selectedYarnColorId={modalRange?.recommendedYarnColorId ?? null}
        suggestions={modalSuggestions}
        targetHex={modalRange?.hexColor ?? "#000000"}
        visible={Boolean(modalRangeId && selectedBrandId)}
      />

      <SectionCard>
        <Text style={styles.title}>Color mapping studio</Text>
        <Text style={styles.subtitle}>
          Reorder your bands, normalize the temperature edges, and fine tune yarn names
          and notes without losing completion progress.
        </Text>
        <View style={styles.rowBetween}>
          <DataSourceChip label={activeProject.weatherSourceLabel} source={activeProject.weatherSource} />
          {span ? (
            <Text style={styles.helperText}>
              Span {span.min} to {span.max}
            </Text>
          ) : null}
        </View>
        {recommendationsEnabled ? (
          <Text style={styles.helperText}>
            Recommending from {selectedBrand?.name ?? "your selected brand"} using {activeProject.recommendationMode}.
          </Text>
        ) : selectedBrand ? (
          <Text style={styles.helperText}>
            {selectedBrand.name} is selected, but recommendation mode is set to manual only.
          </Text>
        ) : (
          <Text style={styles.helperText}>
            No preferred yarn brand selected. Color bands stay fully manual.
          </Text>
        )}
      </SectionCard>

      {!validation.isValid || validation.outOfSpan ? (
        <InlineBanner
          message={[
            ...validation.overlaps.map((item) => `Overlap: ${item}`),
            ...validation.gaps.map((item) => `Gap: ${item}`),
            ...(validation.outOfSpan ? ["Project temperatures fall outside your current bands."] : []),
          ].join(" ")}
          tone="warning"
        />
      ) : null}

      {adjacentConflicts.length > 0 ? (
        <InlineBanner
          message={`${adjacentConflicts.length} adjacent yarn recommendation conflict${adjacentConflicts.length === 1 ? "" : "s"} detected.`}
          primaryAction={{
            label: "Improve differentiation",
            onPress: () => setRanges((current) => syncRecommendations(current, true, "strong-separation")),
          }}
          tone="warning"
        />
      ) : null}

      {validation.adjacentDuplicateWarnings.length > 0 ? (
        <InlineBanner
          message={`Adjacent duplicate colors: ${validation.adjacentDuplicateWarnings.join(", ")}`}
          tone="info"
        />
      ) : null}

      <SectionCard>
        <View style={styles.actions}>
          {[8, 10, 12].map((count) => (
            <AppButton
              key={String(count)}
              label={`${count} bands`}
              onPress={() => {
                if (!span) {
                  return;
                }

                setRanges(syncRecommendations(autoGenerateRanges(activeProject.id, span, count), false));
              }}
              small
              variant="secondary"
            />
          ))}
        </View>
        <View style={styles.actions}>
          <AppButton
            label="Normalize ranges"
            onPress={() => setRanges((current) => syncRecommendations(normalizeAdjacentRanges(current)))}
            small
            variant="ghost"
          />
          <AppButton
            label="Add band"
            onPress={() =>
              setRanges((current) =>
                syncRecommendations(
                  [
                    ...current,
                    {
                      id: createId("range"),
                      projectId: activeProject.id,
                      minTemp: current[current.length - 1]?.maxTemp + 1 || 0,
                      maxTemp: current[current.length - 1]?.maxTemp + 8 || 8,
                      hexColor: "#A98467",
                      label: "",
                      yarnName: `Shade ${current.length + 1}`,
                      notes: "",
                      recommendedYarnColorId: null,
                      recommendedYarnBrandId: activeProject.preferredYarnBrandId ?? null,
                      lockedToRecommendedYarn: false,
                      userOverrodeRecommendation: false,
                      sortOrder: current.length,
                    },
                  ],
                  false,
                ),
              )
            }
            small
            variant="ghost"
          />
        </View>

        {recommendationsEnabled ? (
          <View style={styles.actions}>
            <AppButton
              label="Apply recommendations to all"
              onPress={() => setRanges((current) => syncRecommendations(current, false))}
              small
            />
            <AppButton
              label="Refresh recommendations"
              onPress={() => setRanges((current) => syncRecommendations(current, true))}
              small
              variant="secondary"
            />
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Legend preview</Text>
        <View style={styles.legendWrap}>
          {ranges.map((range) => {
            const yarnColor = getRecommendedYarnColorForRange(range);
            return (
              <View key={range.id} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendSwatch,
                    {
                      backgroundColor: range.hexColor,
                      borderColor: getYarnOutlineColor(range.hexColor, theme.dark, theme.colors.yarnOutline),
                    },
                  ]}
                />
                <View style={styles.legendBody}>
                  <Text style={styles.legendLabel}>
                    {(range.label || `${range.minTemp} to ${range.maxTemp}`).trim()} · {range.yarnName}
                  </Text>
                  {selectedBrand && yarnColor ? (
                    <Text style={styles.legendMeta}>
                      Target {range.hexColor} · {selectedBrand.name} {yarnColor.name}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard>
        <AppButton
          label={allowRangeGaps ? "Gaps allowed" : "Require full coverage"}
          onPress={() => setAllowRangeGaps((current) => !current)}
          small
          variant="secondary"
        />
      </SectionCard>

      {ranges.map((range, index) => {
        const topSuggestion =
          selectedBrandId && recommendationsEnabled
            ? getRangeYarnSuggestions(range, selectedBrandId)[0] ?? null
            : null;
        const recommendedYarnColor = getRecommendedYarnColorForRange(range);

        return (
          <ColorRangeEditor
            adjacentConflictWarning={conflictByRangeId[range.id] ?? null}
            canDelete={ranges.length > 1}
            canMoveDown={index < ranges.length - 1}
            canMoveUp={index > 0}
            key={range.id}
            onChange={(nextRange) =>
              setRanges((current) => {
                const next = current.slice();
                const hexChanged = next[index].hexColor !== nextRange.hexColor;
                next[index] = {
                  ...nextRange,
                  sortOrder: index,
                  userOverrodeRecommendation: hexChanged
                    ? true
                    : nextRange.userOverrodeRecommendation,
                  lockedToRecommendedYarn: hexChanged ? false : nextRange.lockedToRecommendedYarn,
                };

                return hexChanged ? syncRecommendations(next, true) : next;
              })
            }
            onDelete={() => setRanges((current) => current.filter((item) => item.id !== range.id))}
            onMoveDown={() => setRanges((current) => reorderRanges(current, index, index + 1))}
            onMoveUp={() => setRanges((current) => reorderRanges(current, index, index - 1))}
            onOpenSuggestions={recommendationsEnabled ? () => setModalRangeId(range.id) : undefined}
            onRefreshRecommendation={
              recommendationsEnabled
                ? () =>
                    setRanges((current) =>
                      syncRecommendations(
                        current.map((item) =>
                          item.id === range.id ? { ...item, lockedToRecommendedYarn: false } : item,
                        ),
                        true,
                      ),
                    )
                : undefined
            }
            range={range}
            recommendationBrandName={recommendationsEnabled ? selectedBrand?.name ?? null : null}
            recommendationHint={topSuggestion?.explanation ?? null}
            recommendedYarnColor={recommendedYarnColor}
            weakRecommendation={topSuggestion?.matchQuality === "weak"}
          />
        );
      })}

      <AppButton label="Save Colors & Preview" onPress={handleSave} />
    </ScreenContainer>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    title: {
      color: theme.colors.textPrimary,
      fontSize: 24,
      fontWeight: "900",
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
      marginTop: theme.spacing.sm,
    },
    warningText: {
      color: theme.colors.error,
      fontSize: 14,
      lineHeight: 20,
    },
    rowBetween: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: theme.spacing.md,
    },
    helperText: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: "700",
      marginTop: theme.spacing.sm,
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: "800",
      marginBottom: theme.spacing.sm,
    },
    legendWrap: {
      gap: theme.spacing.sm,
    },
    legendItem: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    legendSwatch: {
      borderRadius: theme.radii.pill,
      borderWidth: 1,
      height: 24,
      width: 24,
    },
    legendBody: {
      flex: 1,
    },
    legendLabel: {
      color: theme.colors.textPrimary,
      fontSize: 14,
    },
    legendMeta: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
  });
