import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppTheme, useThemedStyles } from "@/theme";

type Action = {
  label: string;
  onPress: () => void;
};

type Props = {
  title?: string;
  message: string;
  tone?: "info" | "warning" | "success" | "danger";
  primaryAction?: Action;
  secondaryAction?: Action;
};

export function InlineBanner({
  title,
  message,
  tone = "info",
  primaryAction,
  secondaryAction,
}: Props) {
  const styles = useThemedStyles(createStyles);

  return (
    <View
      style={[
        styles.wrapper,
        tone === "warning" && styles.warning,
        tone === "success" && styles.success,
        tone === "danger" && styles.danger,
      ]}
    >
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <Text style={styles.message}>{message}</Text>
      {primaryAction || secondaryAction ? (
        <View style={styles.actions}>
          {secondaryAction ? (
            <Pressable onPress={secondaryAction.onPress} style={styles.secondaryButton}>
              <Text style={styles.secondaryLabel}>{secondaryAction.label}</Text>
            </Pressable>
          ) : null}
          {primaryAction ? (
            <Pressable onPress={primaryAction.onPress} style={styles.primaryButton}>
              <Text style={styles.primaryLabel}>{primaryAction.label}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: theme.colors.infoSoft,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      marginBottom: theme.spacing.md,
      padding: theme.spacing.md,
    },
    warning: {
      backgroundColor: theme.colors.warningSoft,
    },
    success: {
      backgroundColor: theme.colors.successSoft,
    },
    danger: {
      backgroundColor: theme.colors.errorSoft,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "800",
      marginBottom: theme.spacing.xs,
    },
    message: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      lineHeight: 19,
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    primaryButton: {
      backgroundColor: theme.colors.textPrimary,
      borderRadius: theme.radii.pill,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    primaryLabel: {
      color: theme.colors.textOnInverse,
      fontSize: 13,
      fontWeight: "800",
    },
    secondaryButton: {
      borderColor: theme.colors.border,
      borderRadius: theme.radii.pill,
      borderWidth: 1,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    secondaryLabel: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "700",
    },
  });
