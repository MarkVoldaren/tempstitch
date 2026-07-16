import { Pressable, StyleSheet, Text, View } from "react-native";

import { yarnCatalogService } from "@/services/yarn";
import { AppTheme, useAppTheme, useThemedStyles } from "@/theme";
import { Project, TemperatureDay, TemperatureRangeColor } from "@/types/models";
import { formatDateShort, formatWeekday } from "@/utils/date";
import { getYarnOutlineColor } from "@/utils/color";
import { formatTemperature } from "@/utils/temperature";

type QueueItem = {
  id: string;
  rowNumber: number;
  date: string;
  completed: boolean;
  day: TemperatureDay | null;
};

type Props = {
  project: Project;
  items: QueueItem[];
  ranges: TemperatureRangeColor[];
  focusMode: boolean;
  onToggle: (rowId: string, completed: boolean) => void;
};

export function BuildQueueList({
  project,
  items,
  ranges,
  focusMode,
  onToggle,
}: Props) {
  const { currentTheme: theme } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const rangeMap = new Map(ranges.map((range) => [range.id, range]));

  return (
    <View style={styles.list}>
      {items.map((item, index) => {
        const range = item.day?.mappedRangeId
          ? rangeMap.get(item.day.mappedRangeId)
          : undefined;
        const recommendedYarnColor = range
          ? yarnCatalogService.getColorById(range.recommendedYarnColorId)
          : null;
        const recommendedBrand = range
          ? yarnCatalogService.getBrandById(range.recommendedYarnBrandId)
          : null;
        const emphasized = focusMode && index === 0;
        const swatchColor = item.day?.mappedColor ?? theme.colors.cardMuted;

        return (
          <View key={item.id} style={[styles.card, emphasized && styles.focusCard]}>
            <View
              style={[
                styles.swatch,
                {
                  backgroundColor: swatchColor,
                  borderColor: getYarnOutlineColor(swatchColor, theme.dark, theme.colors.yarnOutline),
                },
                emphasized && styles.focusSwatch,
              ]}
            />
            <View style={styles.body}>
              <Text style={[styles.title, emphasized && styles.focusTitle]}>
                Row {item.rowNumber}
              </Text>
              <Text style={styles.dateLine}>
                {formatWeekday(item.date, true)} - {formatDateShort(item.date)}
              </Text>
              <Text style={styles.metaText}>
                {formatTemperature(item.day?.selectedTemp ?? null, project.unit)} -{" "}
                {range?.yarnName ?? "Fix color mapping"}
              </Text>
              {recommendedYarnColor && recommendedBrand ? (
                <Text style={styles.yarnMeta}>
                  {recommendedBrand.name} · {recommendedYarnColor.name}
                </Text>
              ) : null}
              <Text style={styles.metaText}>{project.stitchName}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => onToggle(item.id, !item.completed)}
              style={[styles.action, item.completed && styles.actionUndo]}
            >
              <Text style={[styles.actionLabel, item.completed && styles.actionUndoLabel]}>
                {item.completed ? "Undo" : "Done"}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (theme: AppTheme) => {
  const styles = StyleSheet.create({
    list: {
      gap: theme.spacing.sm,
    },
    card: {
      alignItems: "center",
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
    },
    focusCard: {
      backgroundColor: theme.colors.cardElevated,
      paddingVertical: theme.spacing.lg,
    },
    swatch: {
      borderRadius: theme.radii.md,
      borderWidth: 1,
      height: 52,
      width: 52,
    },
    focusSwatch: {
      height: 68,
      width: 68,
    },
    body: {
      flex: 1,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: "900",
    },
    focusTitle: {
      fontSize: 19,
    },
    dateLine: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: "700",
      marginTop: 4,
    },
    metaText: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 4,
    },
    yarnMeta: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: "700",
      marginTop: 4,
    },
    action: {
      alignItems: "center",
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radii.lg,
      justifyContent: "center",
      minHeight: 52,
      minWidth: 68,
      paddingHorizontal: theme.spacing.md,
    },
    actionUndo: {
      backgroundColor: theme.colors.cardMuted,
    },
    actionLabel: {
      color: theme.colors.textOnAccent,
      fontSize: 14,
      fontWeight: "800",
    },
    actionUndoLabel: {
      color: theme.colors.textPrimary,
    },
  });

  return styles;
};
