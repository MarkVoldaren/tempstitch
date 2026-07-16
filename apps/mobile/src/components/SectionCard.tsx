import { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";

import { AppTheme, useThemedStyles } from "@/theme";

export function SectionCard({ children }: PropsWithChildren) {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.card}>{children}</View>;
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      marginBottom: theme.spacing.md,
      padding: theme.spacing.md,
      ...theme.shadows.card,
    },
  });
