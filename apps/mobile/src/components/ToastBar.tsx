import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppTheme, useThemedStyles } from "@/theme";

type Props = {
  visible: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function ToastBar({ visible, message, actionLabel, onAction }: Props) {
  const styles = useThemedStyles(createStyles);

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={styles.action}>
          <Text style={styles.actionLabel}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    wrapper: {
      alignItems: "center",
      backgroundColor: theme.colors.toastBackground,
      borderRadius: theme.radii.lg,
      bottom: theme.spacing.lg,
      flexDirection: "row",
      gap: theme.spacing.md,
      justifyContent: "space-between",
      left: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      position: "absolute",
      right: theme.spacing.md,
      ...theme.shadows.floating,
    },
    message: {
      color: theme.colors.textOnInverse,
      flex: 1,
      fontSize: 14,
      fontWeight: "700",
    },
    action: {
      borderColor: theme.colors.toastBorder,
      borderRadius: theme.radii.pill,
      borderWidth: 1,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    actionLabel: {
      color: theme.colors.textOnInverse,
      fontSize: 13,
      fontWeight: "800",
    },
  });
