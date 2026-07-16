import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";

import { AppTheme, useAppTheme, useThemedStyles } from "@/theme";

type Props = TextInputProps & {
  label: string;
  helperText?: string;
};

export function TextField({ label, helperText, style, ...props }: Props) {
  const { currentTheme: theme } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.colors.inputPlaceholder}
        style={[styles.input, style]}
        {...props}
      />
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    wrapper: {
      marginBottom: theme.spacing.md,
    },
    label: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "700",
      marginBottom: theme.spacing.xs,
    },
    input: {
      backgroundColor: theme.colors.input,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      color: theme.colors.textPrimary,
      fontSize: 16,
      minHeight: 48,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    helperText: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginTop: theme.spacing.xs,
    },
  });
