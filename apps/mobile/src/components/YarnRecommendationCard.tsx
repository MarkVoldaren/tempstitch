import { StyleSheet, Text, View } from "react-native";

import { AppTheme, useThemedStyles } from "@/theme";
import { YarnColor, YarnRecommendation } from "@/types/models";

import { AppButton } from "./AppButton";
import { YarnColorSwatchRow } from "./YarnColorSwatchRow";

type Props = {
  yarnColor: YarnColor;
  recommendation: YarnRecommendation;
  brandName: string;
  selected?: boolean;
  onPress?: () => void;
};

export function YarnRecommendationCard({
  yarnColor,
  recommendation,
  brandName,
  selected = false,
  onPress,
}: Props) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.card, selected && styles.selectedCard]}>
      <YarnColorSwatchRow
        yarnColor={yarnColor}
        subtitle={`${brandName} · ${recommendation.explanation}`}
        trailingLabel={recommendation.matchQuality}
      />
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>Match score {recommendation.score}</Text>
        {onPress ? <AppButton label="Use this" onPress={onPress} small variant="secondary" /> : null}
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      marginBottom: theme.spacing.sm,
      padding: theme.spacing.sm,
    },
    selectedCard: {
      borderColor: theme.colors.accent,
    },
    metaRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: theme.spacing.xs,
    },
    metaText: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: "700",
    },
  });
