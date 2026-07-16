import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppTheme, useAppTheme, useThemedStyles } from "@/theme";
import { TemperatureRangeColor, YarnColor } from "@/types/models";
import { getReadableTextColor, getYarnOutlineColor } from "@/utils/color";
import { buildRangeLabel } from "@/utils/temperature";

import { AppButton } from "./AppButton";
import { ColorPickerModal } from "./ColorPickerModal";
import { TextField } from "./TextField";
import { YarnColorSwatchRow } from "./YarnColorSwatchRow";

type Props = {
  range: TemperatureRangeColor;
  onChange: (range: TemperatureRangeColor) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canDelete: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  recommendedYarnColor?: YarnColor | null;
  recommendationBrandName?: string | null;
  recommendationHint?: string | null;
  weakRecommendation?: boolean;
  onOpenSuggestions?: () => void;
  onRefreshRecommendation?: () => void;
  adjacentConflictWarning?: string | null;
};

export function ColorRangeEditor({
  range,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  canDelete,
  canMoveUp,
  canMoveDown,
  recommendedYarnColor,
  recommendationBrandName,
  recommendationHint,
  weakRecommendation = false,
  onOpenSuggestions,
  onRefreshRecommendation,
  adjacentConflictWarning,
}: Props) {
  const { currentTheme: theme } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [pickerVisible, setPickerVisible] = useState(false);
  const fallbackLabel = buildRangeLabel(range.minTemp, range.maxTemp);

  return (
    <View style={styles.card}>
      <ColorPickerModal
        initialColor={range.hexColor}
        onClose={() => setPickerVisible(false)}
        onSelect={(hexColor) => onChange({ ...range, hexColor })}
        visible={pickerVisible}
      />

      <View style={styles.header}>
        <Pressable
          onPress={() => setPickerVisible(true)}
          style={[
            styles.previewChip,
            {
              backgroundColor: range.hexColor,
              borderColor: getYarnOutlineColor(range.hexColor, theme.dark, theme.colors.yarnOutline),
            },
          ]}
        >
          <Text style={[styles.previewText, { color: getReadableTextColor(range.hexColor) }]}>
            {range.label.trim() || fallbackLabel}
          </Text>
        </Pressable>
        <View style={styles.headerActions}>
          <AppButton
            label="Up"
            onPress={onMoveUp}
            small
            variant="ghost"
            disabled={!canMoveUp}
          />
          <AppButton
            label="Down"
            onPress={onMoveDown}
            small
            variant="ghost"
            disabled={!canMoveDown}
          />
          {canDelete ? (
            <AppButton label="Remove" onPress={onDelete} small variant="ghost" />
          ) : null}
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <TextField
            keyboardType="numeric"
            label="Min temp"
            onChangeText={(value) => onChange({ ...range, minTemp: Number(value) || 0 })}
            value={String(range.minTemp)}
          />
        </View>
        <View style={styles.half}>
          <TextField
            keyboardType="numeric"
            label="Max temp"
            onChangeText={(value) => onChange({ ...range, maxTemp: Number(value) || 0 })}
            value={String(range.maxTemp)}
          />
        </View>
      </View>

      <TextField
        helperText={`Blank labels will become "${fallbackLabel}" automatically.`}
        label="Label"
        onChangeText={(label) => onChange({ ...range, label })}
        value={range.label}
      />
      <TextField
        label="Yarn / color name"
        onChangeText={(yarnName) => onChange({ ...range, yarnName })}
        value={range.yarnName}
      />

      {recommendationBrandName ? (
        <View style={styles.recommendationCard}>
          <Text style={styles.recommendationTitle}>Recommended yarn match</Text>
          {recommendedYarnColor ? (
            <YarnColorSwatchRow
              subtitle={`${recommendationBrandName}${recommendationHint ? ` · ${recommendationHint}` : ""}`}
              yarnColor={recommendedYarnColor}
            />
          ) : (
            <Text style={styles.recommendationEmpty}>
              No recommendation saved for this band yet.
            </Text>
          )}
          {weakRecommendation ? (
            <Text style={styles.recommendationWarning}>
              No close match in this brand palette.
            </Text>
          ) : null}
          {adjacentConflictWarning ? (
            <Text style={styles.recommendationWarning}>{adjacentConflictWarning}</Text>
          ) : null}
          <View style={styles.headerActions}>
            {onOpenSuggestions ? (
              <AppButton
                label="Swap suggestion"
                onPress={onOpenSuggestions}
                small
                variant="secondary"
              />
            ) : null}
            {onRefreshRecommendation ? (
              <AppButton
                label="Refresh match"
                onPress={onRefreshRecommendation}
                small
                variant="ghost"
              />
            ) : null}
          </View>
        </View>
      ) : null}

      <TextField
        label="Band notes"
        multiline
        onChangeText={(notes) => onChange({ ...range, notes })}
        placeholder="Optional yarn note, dye lot, or stash reminder"
        style={styles.notesInput}
        value={range.notes ?? ""}
      />
    </View>
  );
}

const createStyles = (theme: AppTheme) => {
  const styles = StyleSheet.create({
    card: {
      backgroundColor: theme.colors.input,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      marginBottom: theme.spacing.md,
      padding: theme.spacing.md,
    },
    header: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    previewChip: {
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 54,
      paddingHorizontal: theme.spacing.md,
    },
    previewText: {
      fontSize: 14,
      fontWeight: "800",
    },
    headerActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    row: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    half: {
      flex: 1,
    },
    notesInput: {
      minHeight: 84,
      textAlignVertical: "top",
    },
    recommendationCard: {
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      marginBottom: theme.spacing.md,
      padding: theme.spacing.sm,
    },
    recommendationTitle: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "800",
      marginBottom: theme.spacing.xs,
    },
    recommendationEmpty: {
      color: theme.colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
    },
    recommendationWarning: {
      color: theme.colors.warning,
      fontSize: 12,
      fontWeight: "700",
      marginTop: theme.spacing.xs,
    },
  });

  return styles;
};
