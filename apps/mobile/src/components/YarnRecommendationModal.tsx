import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppTheme, useThemedStyles } from "@/theme";
import { YarnColor, YarnRecommendation } from "@/types/models";

import { AppButton } from "./AppButton";
import { YarnRecommendationCard } from "./YarnRecommendationCard";

type Props = {
  visible: boolean;
  brandName: string;
  targetHex: string;
  selectedYarnColorId?: string | null;
  suggestions: Array<{ recommendation: YarnRecommendation; yarnColor: YarnColor }>;
  onClose: () => void;
  onSelect: (recommendation: YarnRecommendation) => void;
};

export function YarnRecommendationModal({
  visible,
  brandName,
  targetHex,
  selectedYarnColorId,
  suggestions,
  onClose,
  onSelect,
}: Props) {
  const styles = useThemedStyles(createStyles);

  return (
    <Modal animationType="slide" transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Yarn suggestions</Text>
          <Text style={styles.subtitle}>
            {brandName} matches for target color {targetHex}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {suggestions.length > 0 ? (
              suggestions.map(({ recommendation, yarnColor }) => (
                <YarnRecommendationCard
                  key={recommendation.yarnColorId}
                  brandName={brandName}
                  onPress={() => onSelect(recommendation)}
                  recommendation={recommendation}
                  selected={selectedYarnColorId === recommendation.yarnColorId}
                  yarnColor={yarnColor}
                />
              ))
            ) : (
              <Text style={styles.emptyText}>No palette colors are available for this brand yet.</Text>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <AppButton label="Close" onPress={onClose} variant="ghost" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    backdrop: {
      backgroundColor: theme.colors.backdrop,
      flex: 1,
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: theme.radii.lg,
      borderTopRightRadius: theme.radii.lg,
      maxHeight: "80%",
      padding: theme.spacing.md,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 20,
      fontWeight: "900",
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: theme.spacing.md,
      marginTop: theme.spacing.xs,
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    actions: {
      marginTop: theme.spacing.md,
    },
  });
