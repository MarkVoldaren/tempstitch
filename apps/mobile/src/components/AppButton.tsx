import { Pressable, StyleSheet, Text } from "react-native";

import { AppTheme, useThemedStyles } from "@/theme";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  small?: boolean;
};

export function AppButton({
  label,
  onPress,
  disabled = false,
  variant = "primary",
  small = false,
}: Props) {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "ghost" && styles.ghost,
        variant === "danger" && styles.danger,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.label,
          variant === "ghost" && styles.ghostLabel,
          variant === "secondary" && styles.secondaryLabel,
          variant === "danger" && styles.dangerLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    base: {
      alignItems: "center",
      borderRadius: theme.radii.pill,
      justifyContent: "center",
      minHeight: 50,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    primary: {
      backgroundColor: theme.colors.accent,
    },
    secondary: {
      backgroundColor: theme.colors.cardMuted,
      borderColor: theme.colors.border,
      borderWidth: 1,
    },
    ghost: {
      backgroundColor: "transparent",
      borderColor: theme.colors.border,
      borderWidth: 1,
    },
    danger: {
      backgroundColor: theme.colors.error,
    },
    label: {
      color: theme.colors.textOnAccent,
      fontSize: 16,
      fontWeight: "700",
    },
    ghostLabel: {
      color: theme.colors.textPrimary,
    },
    secondaryLabel: {
      color: theme.colors.textPrimary,
    },
    dangerLabel: {
      color: theme.colors.textOnDanger,
    },
    small: {
      minHeight: 40,
      paddingHorizontal: theme.spacing.md,
    },
    disabled: {
      opacity: 0.55,
    },
    pressed: {
      transform: [{ scale: 0.985 }],
    },
  });
