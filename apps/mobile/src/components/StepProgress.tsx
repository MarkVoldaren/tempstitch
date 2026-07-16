import { StyleSheet, Text, View } from "react-native";

import { AppTheme, useThemedStyles } from "@/theme";

type Props = {
  currentStep: number;
  labels: string[];
};

export function StepProgress({ currentStep, labels }: Props) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.wrapper}>
      <View style={styles.trackRow}>
        {labels.map((label, index) => {
          const active = index <= currentStep;
          return (
            <View key={label} style={styles.stepItem}>
              <View style={[styles.dot, active && styles.dotActive]}>
                <Text style={[styles.dotLabel, active && styles.dotLabelActive]}>
                  {index + 1}
                </Text>
              </View>
              {index < labels.length - 1 ? (
                <View style={[styles.line, index < currentStep && styles.lineActive]} />
              ) : null}
            </View>
          );
        })}
      </View>
      <Text style={styles.label}>
        Step {currentStep + 1} of {labels.length}: {labels[currentStep]}
      </Text>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    wrapper: {
      marginBottom: theme.spacing.md,
    },
    trackRow: {
      alignItems: "center",
      flexDirection: "row",
      marginBottom: theme.spacing.sm,
    },
    stepItem: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
    },
    dot: {
      alignItems: "center",
      backgroundColor: theme.colors.cardMuted,
      borderRadius: 15,
      height: 30,
      justifyContent: "center",
      width: 30,
    },
    dotActive: {
      backgroundColor: theme.colors.accent,
    },
    dotLabel: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: "800",
    },
    dotLabelActive: {
      color: theme.colors.textOnAccent,
    },
    line: {
      backgroundColor: theme.colors.border,
      flex: 1,
      height: 3,
      marginHorizontal: theme.spacing.xs,
    },
    lineActive: {
      backgroundColor: theme.colors.accentSoft,
    },
    label: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "700",
    },
  });
