import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppTheme, useAppTheme, useThemedStyles } from "@/theme";
import { Project, TemperatureDay, TemperatureRangeColor } from "@/types/models";
import { formatDateShort, getMonthBreakIndexes, getMonthGroups } from "@/utils/date";
import { getYarnOutlineColor } from "@/utils/color";
import { formatTemperature } from "@/utils/temperature";

type Props = {
  project: Project;
  days: TemperatureDay[];
  ranges: TemperatureRangeColor[];
  zoom: number;
  mode: "full" | "detail" | "heatmap";
  textureStyle: "flat" | "stitch";
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
};

export function BlanketPreview({
  project,
  days,
  ranges,
  zoom,
  mode,
  textureStyle,
  selectedDate,
  onSelectDate,
}: Props) {
  const { currentTheme: theme } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const rowHeight = Math.max(8, project.rowHeight * zoom);
  const fullWidth = Math.max(180, Math.round(project.stitchesPerRow * 1.25 * zoom));
  const verticalHeight = Math.max(220, Math.round(project.stitchesPerRow * 1.05 * zoom));
  const rangeMap = new Map(ranges.map((range) => [range.id, range]));

  if (mode === "detail") {
    return (
      <View style={styles.detailList}>
        {days.map((day, index) => {
          const range = day.mappedRangeId ? rangeMap.get(day.mappedRangeId) : undefined;
          const selected = selectedDate === day.date;
          const swatchColor = day.mappedColor ?? theme.colors.cardMuted;

          return (
            <Pressable
              key={day.id}
              onPress={() => onSelectDate(day.date)}
              style={[styles.detailCard, selected && styles.selectedCard]}
            >
              <View
                style={[
                  styles.detailSwatch,
                  {
                    backgroundColor: swatchColor,
                    borderColor: getYarnOutlineColor(swatchColor, theme.dark, theme.colors.yarnOutline),
                  },
                ]}
              />
              <View style={styles.detailBody}>
                <Text style={styles.detailTitle}>
                  Row {index + 1} - {formatDateShort(day.date)}
                </Text>
                <Text style={styles.detailMeta}>
                  {formatTemperature(day.selectedTemp, project.unit)} -{" "}
                  {range?.yarnName ?? "Unmapped"}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    );
  }

  if (mode === "heatmap") {
    const monthGroups = getMonthGroups(days.map((day) => day.date));
    const dayMap = new Map(days.map((day) => [day.date, day]));

    return (
      <View style={styles.heatmapWrap}>
        {monthGroups.map((group) => (
          <View key={group.key} style={styles.heatmapMonth}>
            <Text style={styles.monthLabel}>{group.label}</Text>
            <View style={styles.heatmapGrid}>
              {group.dates.map((date) => {
                const day = dayMap.get(date);
                const selected = selectedDate === date;
                const swatchColor = day?.mappedColor ?? theme.colors.cardMuted;

                return (
                  <Pressable
                    key={date}
                    onPress={() => onSelectDate(date)}
                    style={[
                      styles.heatCell,
                      {
                        backgroundColor: swatchColor,
                        borderColor: getYarnOutlineColor(swatchColor, theme.dark, theme.colors.yarnOutline),
                      },
                      selected && styles.heatCellSelected,
                    ]}
                  />
                );
              })}
            </View>
          </View>
        ))}
      </View>
    );
  }

  const monthMarkers = getMonthBreakIndexes(days.map((day) => day.date));

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <ScrollView style={styles.previewFrame} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.previewSurface,
            project.previewOrientation === "horizontal"
              ? { width: fullWidth }
              : { height: verticalHeight },
          ]}
        >
          {project.previewOrientation === "horizontal" ? (
            days.map((day, index) => {
              const marker = monthMarkers.find((item) => item.index === index);
              const selected = selectedDate === day.date;
              const swatchColor = day.mappedColor ?? theme.colors.cardMuted;

              return (
                <View key={day.id}>
                  {marker ? <Text style={styles.monthDivider}>{marker.label}</Text> : null}
                  <Pressable
                    onPress={() => onSelectDate(day.date)}
                    style={[
                      styles.horizontalRow,
                      {
                        backgroundColor: swatchColor,
                        borderColor: getYarnOutlineColor(
                          swatchColor,
                          theme.dark,
                          theme.dark ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.24)",
                        ),
                        height: rowHeight,
                        width: fullWidth,
                      },
                      textureStyle === "stitch" && styles.texturedRow,
                      selected && styles.selectedRow,
                    ]}
                  />
                </View>
              );
            })
          ) : (
            <View style={styles.verticalWrap}>
              {days.map((day, index) => {
                const marker = monthMarkers.find((item) => item.index === index);
                const selected = selectedDate === day.date;
                const swatchColor = day.mappedColor ?? theme.colors.cardMuted;

                return (
                  <View key={day.id} style={styles.verticalItem}>
                    {marker ? <Text style={styles.verticalMonthLabel}>{marker.label}</Text> : null}
                    <Pressable
                      onPress={() => onSelectDate(day.date)}
                      style={[
                        styles.verticalRow,
                        {
                          backgroundColor: swatchColor,
                          borderColor: getYarnOutlineColor(
                            swatchColor,
                            theme.dark,
                            theme.dark ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.24)",
                          ),
                          height: verticalHeight,
                          width: rowHeight,
                        },
                        textureStyle === "stitch" && styles.texturedRow,
                        selected && styles.selectedRow,
                      ]}
                    />
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </ScrollView>
  );
}

const createStyles = (theme: AppTheme) => {
  const styles = StyleSheet.create({
    previewFrame: {
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      marginBottom: theme.spacing.md,
      maxHeight: 420,
      overflow: "hidden",
    },
    previewSurface: {
      padding: theme.spacing.sm,
    },
    monthDivider: {
      color: theme.colors.textPrimary,
      fontSize: 12,
      fontWeight: "800",
      marginBottom: 4,
      marginTop: theme.spacing.sm,
    },
    horizontalRow: {
      borderBottomWidth: 1,
      borderRadius: 2,
      marginBottom: 2,
    },
    verticalWrap: {
      flexDirection: "row",
    },
    verticalItem: {
      alignItems: "center",
    },
    verticalMonthLabel: {
      color: theme.colors.textPrimary,
      fontSize: 11,
      fontWeight: "800",
      marginBottom: theme.spacing.xs,
      marginHorizontal: 4,
      textAlign: "center",
      width: 60,
    },
    verticalRow: {
      borderWidth: 1,
      borderRadius: 2,
      marginRight: 2,
    },
    texturedRow: {
      opacity: 0.95,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: theme.dark ? 0.28 : 0.12,
      shadowRadius: 2,
    },
    selectedRow: {
      borderColor: theme.colors.focusRing,
      borderWidth: 2,
    },
    detailList: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    detailCard: {
      alignItems: "center",
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      padding: theme.spacing.sm,
    },
    selectedCard: {
      borderColor: theme.colors.accent,
      borderWidth: 2,
    },
    detailSwatch: {
      borderRadius: theme.radii.md,
      borderWidth: 1,
      height: 44,
      width: 44,
    },
    detailBody: {
      flex: 1,
    },
    detailTitle: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: "700",
    },
    detailMeta: {
      color: theme.colors.textMuted,
      fontSize: 13,
      marginTop: 4,
    },
    heatmapWrap: {
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    heatmapMonth: {
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      padding: theme.spacing.sm,
    },
    monthLabel: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "800",
      marginBottom: theme.spacing.sm,
    },
    heatmapGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 4,
    },
    heatCell: {
      borderRadius: 6,
      borderWidth: 1,
      height: 14,
      width: 14,
    },
    heatCellSelected: {
      borderColor: theme.colors.focusRing,
      borderWidth: 2,
    },
  });

  return styles;
};
