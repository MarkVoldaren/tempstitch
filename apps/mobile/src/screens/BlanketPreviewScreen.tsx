import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/AppButton";
import { BlanketPreview } from "@/components/BlanketPreview";
import { DataSourceChip } from "@/components/DataSourceChip";
import { InlineBanner } from "@/components/InlineBanner";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionCard } from "@/components/SectionCard";
import { SegmentedControl } from "@/components/SegmentedControl";
import { yarnCatalogService } from "@/services/yarn";
import { AppTheme, useAppTheme, useThemedStyles } from "@/theme";
import { useAppStore } from "@/hooks/useAppStore";
import { RootStackParamList } from "@/types/navigation";
import { formatDateLabel } from "@/utils/date";
import { getYarnOutlineColor } from "@/utils/color";
import { getProjectCompletion, getProjectDays, getProjectRanges } from "@/utils/project";
import { formatTemperature, getColorUsage } from "@/utils/temperature";

type Props = NativeStackScreenProps<RootStackParamList, "BlanketPreview">;

export function BlanketPreviewScreen({ navigation, route }: Props) {
  const styles = useThemedStyles(createStyles);
  const { currentTheme: theme } = useAppTheme();
  const { data } = useAppStore();
  const project = data.projects.find((item) => item.id === route.params.projectId);
  const days = getProjectDays(route.params.projectId, data.temperatureDays);
  const ranges = getProjectRanges(route.params.projectId, data.ranges);
  const completion = getProjectCompletion(route.params.projectId, data.progressRows);
  const [previewMode, setPreviewMode] = useState<"full" | "detail" | "heatmap">("full");
  const [textureStyle, setTextureStyle] = useState<"flat" | "stitch">("stitch");
  const [zoom, setZoom] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string | null>(days[0]?.date ?? null);

  if (!project) {
    return (
      <ScreenContainer>
        <SectionCard>
          <Text style={styles.warningText}>This project could not be found.</Text>
        </SectionCard>
      </ScreenContainer>
    );
  }

  const selectedDay = selectedDate ? days.find((day) => day.date === selectedDate) ?? null : null;
  const selectedRange =
    selectedDay?.mappedRangeId
      ? ranges.find((range) => range.id === selectedDay.mappedRangeId) ?? null
      : null;
  const selectedYarnColor = selectedRange
    ? yarnCatalogService.getColorById(selectedRange.recommendedYarnColorId)
    : null;
  const selectedYarnBrand = selectedRange
    ? yarnCatalogService.getBrandById(selectedRange.recommendedYarnBrandId)
    : null;
  const warmest = days
    .filter((day) => typeof day.selectedTemp === "number")
    .sort((left, right) => (right.selectedTemp ?? 0) - (left.selectedTemp ?? 0))[0];
  const coldest = days
    .filter((day) => typeof day.selectedTemp === "number")
    .sort((left, right) => (left.selectedTemp ?? 0) - (right.selectedTemp ?? 0))[0];
  const unmappedCount = days.filter((day) => !day.mappedColor).length;
  const usage = getColorUsage(days);

  return (
    <ScreenContainer>
      <SectionCard>
        <Text style={styles.title}>{project.name}</Text>
        <Text style={styles.subtitle}>
          {project.locationName} · {completion.completed} of {completion.total} rows complete
        </Text>
        <View style={styles.headerMeta}>
          <DataSourceChip label={project.weatherSourceLabel} source={project.weatherSource} />
        </View>
      </SectionCard>

      {project.weatherStatusMessage ? (
        <InlineBanner message={project.weatherStatusMessage} tone="info" />
      ) : null}

      {unmappedCount > 0 ? (
        <InlineBanner
          message={`${unmappedCount} rows do not have a color yet. Open Color Mapping to fix them.`}
          tone="warning"
        />
      ) : null}

      <SectionCard>
        <SegmentedControl
          label="Preview mode"
          onChange={(value) => setPreviewMode(value)}
          options={[
            { label: "Rows", value: "full" },
            { label: "Details", value: "detail" },
            { label: "Heatmap", value: "heatmap" },
          ]}
          value={previewMode}
        />
        <SegmentedControl
          label="Row style"
          onChange={(value) => setTextureStyle(value)}
          options={[
            { label: "Flat color", value: "flat" },
            { label: "Stitched", value: "stitch" },
          ]}
          value={textureStyle}
        />

        <View style={styles.controlsRow}>
          <AppButton
            label="Zoom -"
            onPress={() => setZoom((current) => Math.max(0.7, current - 0.15))}
            small
            variant="secondary"
          />
          <Text style={styles.controlText}>{zoom.toFixed(1)}x zoom</Text>
          <AppButton
            label="Zoom +"
            onPress={() => setZoom((current) => Math.min(2.4, current + 0.15))}
            small
            variant="secondary"
          />
        </View>
      </SectionCard>

      <BlanketPreview
        days={days}
        mode={previewMode}
        onSelectDate={setSelectedDate}
        project={project}
        ranges={ranges}
        selectedDate={selectedDate}
        textureStyle={textureStyle}
        zoom={zoom}
      />

      {selectedDay ? (
        <SectionCard>
          <Text style={styles.sectionTitle}>Selected row</Text>
          <Text style={styles.selectedText}>{formatDateLabel(selectedDay.date)}</Text>
          <Text style={styles.selectedText}>
            {formatTemperature(selectedDay.selectedTemp, project.unit)}
          </Text>
          <Text style={styles.selectedText}>
            {(selectedRange?.label || "Unmapped")} · {selectedRange?.yarnName ?? "No yarn assigned"}
          </Text>
          {selectedYarnColor && selectedYarnBrand ? (
            <Text style={styles.selectedMeta}>
              {selectedYarnBrand.name} · {selectedYarnColor.name}
            </Text>
          ) : null}
        </SectionCard>
      ) : null}

      <SectionCard>
        <Text style={styles.sectionTitle}>Legend</Text>
        {ranges.map((range) => (
          <View key={range.id} style={styles.legendRow}>
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
            <Text style={styles.legendCount}>{usage[range.hexColor] ?? 0} rows</Text>
          </View>
        ))}
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Summary stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Warmest day</Text>
            <Text style={styles.statValue}>
              {warmest ? formatTemperature(warmest.selectedTemp, project.unit) : "Missing"}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Coldest day</Text>
            <Text style={styles.statValue}>
              {coldest ? formatTemperature(coldest.selectedTemp, project.unit) : "Missing"}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total rows</Text>
            <Text style={styles.statValue}>{days.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Mapped bands</Text>
            <Text style={styles.statValue}>{ranges.length}</Text>
          </View>
        </View>
      </SectionCard>

      <View style={styles.actions}>
        <AppButton
          label="Build Mode"
          onPress={() => navigation.navigate("BuildMode", { projectId: project.id })}
        />
        <AppButton
          label="Adjust Colors"
          onPress={() => navigation.navigate("ColorMapping", { projectId: project.id })}
          variant="secondary"
        />
        <AppButton
          label="Project Settings"
          onPress={() => navigation.navigate("ProjectSettings", { projectId: project.id })}
          variant="ghost"
        />
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
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontSize: 14,
      marginTop: theme.spacing.sm,
    },
    headerMeta: {
      marginTop: theme.spacing.md,
    },
    controlsRow: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    controlText: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "700",
    },
    warningText: {
      color: theme.colors.error,
      fontSize: 14,
      lineHeight: 20,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontSize: 17,
      fontWeight: "800",
      marginBottom: theme.spacing.sm,
    },
    selectedText: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      lineHeight: 22,
    },
    selectedMeta: {
      color: theme.colors.textMuted,
      fontSize: 13,
      marginTop: theme.spacing.xs,
    },
    legendRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
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
    legendCount: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: "700",
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    statCard: {
      backgroundColor: theme.colors.cardMuted,
      borderRadius: theme.radii.md,
      flexBasis: "48%",
      flexGrow: 1,
      minHeight: 86,
      padding: theme.spacing.md,
    },
    statLabel: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: "700",
      marginBottom: theme.spacing.xs,
      textTransform: "uppercase",
    },
    statValue: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: "800",
    },
    actions: {
      gap: theme.spacing.sm,
    },
  });
