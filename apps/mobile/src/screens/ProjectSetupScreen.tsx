import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/AppButton";
import { ColorRangeEditor } from "@/components/ColorRangeEditor";
import { DataSourceChip } from "@/components/DataSourceChip";
import { InlineBanner } from "@/components/InlineBanner";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionCard } from "@/components/SectionCard";
import { SegmentedControl } from "@/components/SegmentedControl";
import { StepProgress } from "@/components/StepProgress";
import { TextField } from "@/components/TextField";
import { YarnBrandPicker } from "@/components/YarnBrandPicker";
import {
  craftOptions,
  orientationOptions,
  recommendationModeOptions,
  stitchPresets,
  tempModeOptions,
  unitOptions,
} from "@/constants/options";
import { useAppStore } from "@/hooks/useAppStore";
import { applyYarnRecommendationsToRanges, yarnCatalogService } from "@/services/yarn";
import { AppTheme, useAppTheme, useThemedStyles } from "@/theme";
import { ProjectDraftInput, TemperatureRangeColor } from "@/types/models";
import { RootStackParamList } from "@/types/navigation";
import { getYarnOutlineColor } from "@/utils/color";
import { clampDateRange, getYearBounds } from "@/utils/date";
import { createId, getProjectRanges, hasProjectWeatherSettingsChanged } from "@/utils/project";
import {
  autoGenerateRanges,
  fillBlankRangeLabels,
  getTemperatureSpan,
  normalizeAdjacentRanges,
  reorderRanges,
  validateRanges,
} from "@/utils/temperature";

type Props = NativeStackScreenProps<RootStackParamList, "ProjectSetup">;

const currentYear = new Date().getFullYear();
const stepLabels = [
  "Project basics",
  "Location",
  "Date range and temperature mode",
  "Stitch settings",
  "Color ranges",
  "Review and create",
];
const builtInBrands = yarnCatalogService.getBrands();

export function ProjectSetupScreen({ navigation, route }: Props) {
  const styles = useThemedStyles(createStyles);
  const { currentTheme: theme } = useAppTheme();
  const { busy, data, getProjectById, previewWeather, saveProject, searchLocations } = useAppStore();
  const existingProject = route.params?.projectId
    ? getProjectById(route.params.projectId)
    : undefined;
  const existingRanges = existingProject
    ? getProjectRanges(existingProject.id, data.ranges)
    : [];

  const [stepIndex, setStepIndex] = useState(0);
  const [name, setName] = useState(existingProject?.name ?? "");
  const [locationQuery, setLocationQuery] = useState(existingProject?.locationName ?? "");
  const [selectedLocation, setSelectedLocation] = useState(
    existingProject
      ? {
          query: existingProject.locationName,
          name: existingProject.locationName,
          latitude: existingProject.latitude,
          longitude: existingProject.longitude,
        }
      : null,
  );
  const [locationResults, setLocationResults] = useState<
    Array<{
      query: string;
      name: string;
      latitude: number;
      longitude: number;
    }>
  >([]);
  const [rangeMode, setRangeMode] = useState<"fullYear" | "custom">(
    existingProject &&
      existingProject.startDate.endsWith("-01-01") &&
      existingProject.endDate.endsWith("-12-31")
      ? "fullYear"
      : "custom",
  );
  const [year, setYear] = useState(existingProject?.startDate.slice(0, 4) ?? String(currentYear));
  const defaultBounds = getYearBounds(currentYear);
  const [startDate, setStartDate] = useState(existingProject?.startDate ?? defaultBounds.startDate);
  const [endDate, setEndDate] = useState(existingProject?.endDate ?? defaultBounds.endDate);
  const [unit, setUnit] = useState(existingProject?.unit ?? "fahrenheit");
  const [tempMode, setTempMode] = useState(existingProject?.tempMode ?? "avg");
  const [previewOrientation, setPreviewOrientation] = useState(
    existingProject?.previewOrientation ?? "horizontal",
  );
  const [stitchesPerRow, setStitchesPerRow] = useState(
    String(existingProject?.stitchesPerRow ?? 180),
  );
  const [rowHeight, setRowHeight] = useState(String(existingProject?.rowHeight ?? 12));
  const [craftType, setCraftType] = useState(existingProject?.craftType ?? "crochet");
  const [stitchName, setStitchName] = useState(existingProject?.stitchName ?? "Single crochet");
  const [notes, setNotes] = useState(existingProject?.notes ?? "");
  const [allowRangeGaps, setAllowRangeGaps] = useState(
    existingProject?.allowRangeGaps ?? false,
  );
  const [preferredYarnBrandId, setPreferredYarnBrandId] = useState<string | null>(
    existingProject?.preferredYarnBrandId ?? null,
  );
  const [recommendationMode, setRecommendationMode] = useState(
    existingProject?.recommendationMode ?? "exact-nearest",
  );
  const [ranges, setRanges] = useState<TemperatureRangeColor[]>(
    existingRanges.length
      ? existingRanges
      : autoGenerateRanges(existingProject?.id ?? "draft", { min: 20, max: 88 }),
  );
  const [weatherPreviewResult, setWeatherPreviewResult] = useState<Awaited<
    ReturnType<typeof previewWeather>
  > | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function getDraft(): ProjectDraftInput {
    const resolvedDates =
      rangeMode === "fullYear"
        ? getYearBounds(Number(year) || currentYear)
        : clampDateRange(startDate, endDate);

    return {
      id: existingProject?.id,
      name,
      location:
        selectedLocation ?? {
          query: locationQuery,
          name: locationQuery,
          latitude: 0,
          longitude: 0,
        },
      unit,
      tempMode,
      startDate: resolvedDates.startDate,
      endDate: resolvedDates.endDate,
      stitchesPerRow: Math.max(20, Number(stitchesPerRow) || 180),
      rowHeight: Math.max(4, Number(rowHeight) || 12),
      craftType,
      stitchName,
      previewOrientation,
      notes,
      allowRangeGaps,
      preferredYarnBrandId,
      recommendationMode,
      ranges,
    };
  }

  const currentDraft = getDraft();
  const rangeValidation = validateRanges(
    ranges,
    weatherPreviewResult ? getTemperatureSpan(weatherPreviewResult.daily) : null,
    allowRangeGaps,
  );

  function isCurrentStepValid() {
    if (stepIndex === 0) {
      return name.trim().length > 1;
    }

    if (stepIndex === 1) {
      return Boolean(selectedLocation);
    }

    if (stepIndex === 2) {
      return (
        /^\d{4}$/.test(year) ||
        (/^\d{4}-\d{2}-\d{2}$/.test(startDate) && /^\d{4}-\d{2}-\d{2}$/.test(endDate))
      );
    }

    if (stepIndex === 3) {
      return Number(stitchesPerRow) > 0 && Number(rowHeight) > 0 && stitchName.trim().length > 0;
    }

    if (stepIndex === 4) {
      return ranges.length > 0 && rangeValidation.overlaps.length === 0;
    }

    return true;
  }

  async function handleSearchLocation() {
    const results = await searchLocations(locationQuery);
    setLocationResults(
      results.map((item) => ({
        query: locationQuery,
        name: item.name,
        latitude: item.latitude,
        longitude: item.longitude,
      })),
    );
  }

  async function prepareWeatherForColorStep(fallbackMode: "none" | "mockOnly" = "none") {
    if (!selectedLocation) {
      return false;
    }

    try {
      const result = await previewWeather(
        {
          ...currentDraft,
          location: selectedLocation,
        },
        fallbackMode === "none" ? "none" : "mockOnly",
      );
      setWeatherPreviewResult(result);

      if (!existingRanges.length || !existingProject) {
        const span = getTemperatureSpan(result.daily);
        if (span) {
          setRanges(
            applyYarnRecommendationsToRanges(
              autoGenerateRanges(existingProject?.id ?? "draft", span, ranges.length || 8),
              {
                brandId: preferredYarnBrandId,
                recommendationMode,
                preserveLocked: false,
              },
            ),
          );
        }
      }

      return true;
    } catch (error) {
      Alert.alert(
        "Weather fetch failed",
        "Open-Meteo could not load daily weather. Retry live weather, continue with mock data, or cancel.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Continue with Mock",
            onPress: async () => {
              await prepareWeatherForColorStep("mockOnly");
              setStepIndex(4);
            },
          },
          {
            text: "Retry",
            onPress: async () => {
              await prepareWeatherForColorStep("none");
            },
          },
        ],
      );
      return false;
    }
  }

  async function handleNext() {
    setFormError(null);
    if (!isCurrentStepValid()) {
      setFormError("Please complete the required fields before moving on.");
      return;
    }

    if (stepIndex === 3) {
      const ready = await prepareWeatherForColorStep();
      if (!ready) {
        return;
      }
    }

    setStepIndex((current) => Math.min(current + 1, stepLabels.length - 1));
  }

  async function handleCreate() {
    if (!selectedLocation) {
      setStepIndex(1);
      setFormError("Choose a location first.");
      return;
    }

    const weatherChanged =
      existingProject &&
      hasProjectWeatherSettingsChanged(existingProject, {
        locationName: selectedLocation.name,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        startDate: currentDraft.startDate,
        endDate: currentDraft.endDate,
        tempMode: currentDraft.tempMode,
      });

    const continueSave = async () => {
      const result = await saveProject(
        {
          ...currentDraft,
          location: selectedLocation,
          ranges,
        },
        {
          fallbackMode: weatherPreviewResult?.source === "mock" ? "mockOnly" : "allowMock",
        },
      );
      navigation.replace("BlanketPreview", { projectId: result.projectId });
    };

    if (weatherChanged) {
      Alert.alert(
        "Rebuild weather rows?",
        "Changing location, date range, or temperature mode rebuilds row mapping. Completed rows will be kept where matching dates still exist.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Continue", onPress: continueSave },
        ],
      );
      return;
    }

    await continueSave();
  }

  function renderColorLegend() {
    return (
      <View style={styles.legendWrap}>
        {ranges.map((range) => (
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
            <Text style={styles.legendLabel}>
              {(range.label || `${range.minTemp} to ${range.maxTemp}`).trim()} · {range.yarnName}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <ScreenContainer>
      <StepProgress currentStep={stepIndex} labels={stepLabels} />

      {formError ? <InlineBanner message={formError} tone="danger" /> : null}
      {weatherPreviewResult?.warningMessage ? (
        <InlineBanner
          message={weatherPreviewResult.warningMessage}
          tone={weatherPreviewResult.source === "mock" ? "warning" : "info"}
        />
      ) : null}

      {stepIndex === 0 ? (
        <SectionCard>
          <Text style={styles.title}>Give your blanket a name</Text>
          <TextField
            label="Project name"
            onChangeText={setName}
            placeholder="2026 Family Blanket"
            value={name}
          />
          <TextField
            label="Project notes"
            multiline
            onChangeText={setNotes}
            placeholder="Who is it for, yarn plans, hook size, gift notes..."
            style={styles.notesInput}
            value={notes}
          />
          <YarnBrandPicker
            brands={builtInBrands}
            onChange={setPreferredYarnBrandId}
            selectedBrandId={preferredYarnBrandId}
          />
          <SegmentedControl
            label="Recommendation mode"
            onChange={setRecommendationMode}
            options={recommendationModeOptions}
            value={recommendationMode}
          />
        </SectionCard>
      ) : null}

      {stepIndex === 1 ? (
        <SectionCard>
          <Text style={styles.title}>Choose a location</Text>
          <TextField
            label="Location search"
            onChangeText={(value) => {
              setLocationQuery(value);
              setSelectedLocation(null);
            }}
            placeholder="City, state or lat,long"
            value={locationQuery}
          />
          <AppButton
            label={busy ? "Searching..." : "Search Location"}
            onPress={handleSearchLocation}
            small
            variant="secondary"
          />

          {selectedLocation ? (
            <InlineBanner
              message={`Selected ${selectedLocation.name} (${selectedLocation.latitude.toFixed(2)}, ${selectedLocation.longitude.toFixed(2)})`}
              tone="success"
            />
          ) : null}

          {locationResults.map((result) => (
            <Pressable
              key={`${result.name}:${result.latitude}:${result.longitude}`}
              onPress={() => {
                setSelectedLocation(result);
                setLocationQuery(result.name);
                setLocationResults([]);
              }}
              style={styles.locationResult}
            >
              <Text style={styles.locationName}>{result.name}</Text>
              <Text style={styles.locationMeta}>
                {result.latitude.toFixed(2)}, {result.longitude.toFixed(2)}
              </Text>
            </Pressable>
          ))}
        </SectionCard>
      ) : null}

      {stepIndex === 2 ? (
        <SectionCard>
          <Text style={styles.title}>Define your weather window</Text>
          <SegmentedControl
            label="Unit"
            onChange={setUnit}
            options={unitOptions}
            value={unit}
          />
          <SegmentedControl
            label="Temperature source"
            onChange={setTempMode}
            options={tempModeOptions}
            value={tempMode}
          />
          <SegmentedControl
            label="Date range"
            onChange={setRangeMode}
            options={[
              { label: "Full year", value: "fullYear" },
              { label: "Custom", value: "custom" },
            ]}
            value={rangeMode}
          />

          {rangeMode === "fullYear" ? (
            <TextField
              keyboardType="numeric"
              label="Year"
              onChangeText={setYear}
              value={year}
            />
          ) : (
            <>
              <TextField label="Start date" onChangeText={setStartDate} value={startDate} />
              <TextField label="End date" onChangeText={setEndDate} value={endDate} />
            </>
          )}
        </SectionCard>
      ) : null}

      {stepIndex === 3 ? (
        <SectionCard>
          <Text style={styles.title}>Choose your stitch setup</Text>
          <SegmentedControl
            label="Craft type"
            onChange={setCraftType}
            options={craftOptions}
            value={craftType}
          />
          <SegmentedControl
            label="Preview orientation"
            onChange={setPreviewOrientation}
            options={orientationOptions}
            value={previewOrientation}
          />
          <TextField
            keyboardType="numeric"
            label="Stitches per row"
            onChangeText={setStitchesPerRow}
            value={stitchesPerRow}
          />
          <TextField
            keyboardType="numeric"
            label="Row height / preview thickness"
            onChangeText={setRowHeight}
            value={rowHeight}
          />
          <TextField label="Stitch name" onChangeText={setStitchName} value={stitchName} />

          <Text style={styles.presetLabel}>Preset stitch ideas</Text>
          <View style={styles.presetWrap}>
            {stitchPresets.map((preset) => (
              <Pressable
                key={preset}
                onPress={() => setStitchName(preset)}
                style={[
                  styles.presetChip,
                  stitchName === preset && styles.presetChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.presetChipLabel,
                    stitchName === preset && styles.presetChipLabelActive,
                  ]}
                >
                  {preset}
                </Text>
              </Pressable>
            ))}
          </View>
        </SectionCard>
      ) : null}

      {stepIndex === 4 ? (
        <>
          <SectionCard>
            <Text style={styles.title}>Shape your color bands</Text>
            {weatherPreviewResult ? (
              <View style={styles.rowBetween}>
                <DataSourceChip
                  label={weatherPreviewResult.providerLabel}
                  source={weatherPreviewResult.source}
                />
                <Text style={styles.helperText}>
                  {ranges.length} band{ranges.length === 1 ? "" : "s"}
                </Text>
              </View>
            ) : null}

            <View style={styles.bandActions}>
              {[8, 10, 12].map((count) => (
                <AppButton
                  key={String(count)}
                  label={`${count} bands`}
                  onPress={() => {
                    const span =
                      (weatherPreviewResult && getTemperatureSpan(weatherPreviewResult.daily)) ??
                      { min: 20, max: 88 };
                    setRanges(
                      applyYarnRecommendationsToRanges(
                        autoGenerateRanges(existingProject?.id ?? "draft", span, count),
                        {
                          brandId: preferredYarnBrandId,
                          recommendationMode,
                          preserveLocked: false,
                        },
                      ),
                    );
                  }}
                  small
                  variant="secondary"
                />
              ))}
            </View>

            <View style={styles.bandActions}>
              <AppButton
                label="Normalize ranges"
                onPress={() => setRanges(normalizeAdjacentRanges(ranges))}
                small
                variant="ghost"
              />
              <AppButton
                label="Add band"
                onPress={() =>
                  setRanges((current) => [
                    ...current,
                    {
                      id: createId("range"),
                      projectId: existingProject?.id ?? "draft",
                      minTemp: current[current.length - 1]?.maxTemp + 1 || 0,
                      maxTemp: current[current.length - 1]?.maxTemp + 8 || 8,
                      hexColor: "#A98467",
                      label: "",
                      yarnName: `Shade ${current.length + 1}`,
                      notes: "",
                      sortOrder: current.length,
                    },
                  ])
                }
                small
                variant="ghost"
              />
            </View>

            {renderColorLegend()}
          </SectionCard>

          {!rangeValidation.isValid || rangeValidation.outOfSpan ? (
            <InlineBanner
              message={[
                ...rangeValidation.overlaps.map((item) => `Overlap: ${item}`),
                ...rangeValidation.gaps.map((item) => `Gap: ${item}`),
                ...(rangeValidation.outOfSpan
                  ? ["Some project temperatures fall outside your current bands."]
                  : []),
              ].join(" ")}
              tone="warning"
            />
          ) : null}

          {rangeValidation.adjacentDuplicateWarnings.length > 0 ? (
            <InlineBanner
              message={`Adjacent duplicate colors: ${rangeValidation.adjacentDuplicateWarnings.join(", ")}`}
              tone="info"
            />
          ) : null}

          <SectionCard>
            <Pressable
              onPress={() => setAllowRangeGaps((current) => !current)}
              style={styles.toggleRow}
            >
              <View style={[styles.toggleBox, allowRangeGaps && styles.toggleBoxActive]}>
                {allowRangeGaps ? <Text style={styles.toggleMark}>[x]</Text> : null}
              </View>
              <View style={styles.toggleTextWrap}>
                <Text style={styles.toggleTitle}>Allow intentional gaps</Text>
                <Text style={styles.toggleSubtitle}>
                  Turn this on if you want unmapped temperatures to show as warnings.
                </Text>
              </View>
            </Pressable>
          </SectionCard>

          {ranges.map((range, index) => (
            <ColorRangeEditor
              canDelete={ranges.length > 1}
              canMoveDown={index < ranges.length - 1}
              canMoveUp={index > 0}
              key={range.id}
              onChange={(nextRange) =>
                setRanges((current) => {
                  const next = current.slice();
                  next[index] = { ...nextRange, sortOrder: index };
                  return next;
                })
              }
              onDelete={() =>
                setRanges((current) => current.filter((item) => item.id !== range.id))
              }
              onMoveDown={() => setRanges((current) => reorderRanges(current, index, index + 1))}
              onMoveUp={() => setRanges((current) => reorderRanges(current, index, index - 1))}
              range={range}
            />
          ))}
        </>
      ) : null}

      {stepIndex === 5 ? (
        <SectionCard>
          <Text style={styles.title}>Review and create</Text>
          {weatherPreviewResult ? (
            <View style={styles.reviewChipRow}>
              <DataSourceChip
                label={weatherPreviewResult.providerLabel}
                source={weatherPreviewResult.source}
              />
            </View>
          ) : null}
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Location</Text>
            <Text style={styles.reviewValue}>{selectedLocation?.name ?? "Not set"}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Date range</Text>
            <Text style={styles.reviewValue}>
              {currentDraft.startDate} to {currentDraft.endDate}
            </Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Temperature mode</Text>
            <Text style={styles.reviewValue}>{tempMode}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Stitch</Text>
            <Text style={styles.reviewValue}>
              {stitchName} ({craftType})
            </Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Stitch count</Text>
            <Text style={styles.reviewValue}>{currentDraft.stitchesPerRow}</Text>
          </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Preferred yarn brand</Text>
              <Text style={styles.reviewValue}>
                {builtInBrands.find((brand) => brand.id === preferredYarnBrandId)?.name ?? "None"}
              </Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Recommendation mode</Text>
              <Text style={styles.reviewValue}>{recommendationMode}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Color bands</Text>
              <Text style={styles.reviewValue}>{ranges.length}</Text>
            </View>
          {renderColorLegend()}
        </SectionCard>
      ) : null}

      <View style={styles.footer}>
        <AppButton
          label={stepIndex === 0 ? "Back" : "Previous"}
          onPress={() => {
            if (stepIndex === 0) {
              navigation.goBack();
              return;
            }
            setStepIndex((current) => Math.max(0, current - 1));
          }}
          variant="ghost"
        />
        {stepIndex === stepLabels.length - 1 ? (
          <AppButton
            label={busy ? "Creating..." : existingProject ? "Save Project" : "Create Project"}
            onPress={handleCreate}
            disabled={busy}
          />
        ) : (
          <AppButton
            label={stepIndex === 3 ? "Load Weather" : "Next"}
            onPress={handleNext}
            disabled={!isCurrentStepValid() || busy}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    title: {
      color: theme.colors.textPrimary,
      fontSize: 24,
      fontWeight: "900",
      marginBottom: theme.spacing.md,
    },
    notesInput: {
      minHeight: 120,
      textAlignVertical: "top",
    },
    locationResult: {
      backgroundColor: theme.colors.cardMuted,
      borderRadius: theme.radii.md,
      marginTop: theme.spacing.sm,
      padding: theme.spacing.md,
    },
    locationName: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: "700",
    },
    locationMeta: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    presetLabel: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "700",
      marginBottom: theme.spacing.sm,
    },
    presetWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    presetChip: {
      backgroundColor: theme.colors.cardMuted,
      borderRadius: theme.radii.pill,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    presetChipActive: {
      backgroundColor: theme.colors.accentSoft,
    },
    presetChipLabel: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "700",
    },
    presetChipLabelActive: {
      color: theme.colors.accent,
    },
    rowBetween: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.sm,
    },
    helperText: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: "700",
    },
    bandActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
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
    legendLabel: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: 14,
    },
    toggleRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    toggleBox: {
      alignItems: "center",
      backgroundColor: theme.colors.input,
      borderColor: theme.colors.border,
      borderRadius: 10,
      borderWidth: 2,
      height: 26,
      justifyContent: "center",
      width: 26,
    },
    toggleBoxActive: {
      backgroundColor: theme.colors.success,
      borderColor: theme.colors.success,
    },
    toggleMark: {
      color: theme.colors.textOnInverse,
      fontSize: 11,
      fontWeight: "900",
    },
    toggleTextWrap: {
      flex: 1,
    },
    toggleTitle: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "700",
    },
    toggleSubtitle: {
      color: theme.colors.textMuted,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 2,
    },
    reviewChipRow: {
      marginBottom: theme.spacing.md,
    },
    reviewRow: {
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      marginBottom: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
    },
    reviewLabel: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    reviewValue: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: "700",
      marginTop: 4,
    },
    footer: {
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
  });
