import { StyleSheet, Text, View } from "react-native";

import { AppTheme, useThemedStyles } from "@/theme";

type Props = {
  title: string;
  subtitle: string;
  percent: number;
  detail: string;
};

export function ProgressHeader({ title, subtitle, percent, detail }: Props) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.wrapper}>
      <View style={styles.topRow}>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{percent}%</Text>
        </View>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
      <Text style={styles.detail}>{detail}</Text>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      marginBottom: theme.spacing.md,
      padding: theme.spacing.md,
      ...theme.shadows.card,
    },
    topRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.md,
    },
    textWrap: {
      flex: 1,
      paddingRight: theme.spacing.md,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 24,
      fontWeight: "800",
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontSize: 14,
      marginTop: 4,
    },
    badge: {
      backgroundColor: theme.colors.accentSoft,
      borderRadius: theme.radii.pill,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 8,
    },
    badgeText: {
      color: theme.colors.accent,
      fontSize: 14,
      fontWeight: "800",
    },
    track: {
      backgroundColor: theme.colors.cardMuted,
      borderRadius: theme.radii.pill,
      height: 12,
      overflow: "hidden",
    },
    fill: {
      backgroundColor: theme.colors.accent,
      height: "100%",
    },
    detail: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "600",
      marginTop: theme.spacing.sm,
    },
  });
