import { StyleSheet, Text, View } from "react-native";

import { AppTheme, useThemedStyles } from "@/theme";
import { WeatherDataSource } from "@/types/models";

type Props = {
  source: WeatherDataSource;
  label: string;
};

export function DataSourceChip({ source, label }: Props) {
  const styles = useThemedStyles(createStyles);

  return (
    <View
      style={[
        styles.chip,
        source === "open-meteo" && styles.live,
        source === "cached" && styles.cached,
        source === "mock" && styles.mock,
        source === "demo" && styles.demo,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    chip: {
      alignSelf: "flex-start",
      borderRadius: theme.radii.pill,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 6,
    },
    live: {
      backgroundColor: theme.colors.liveChip,
    },
    cached: {
      backgroundColor: theme.colors.cachedChip,
    },
    mock: {
      backgroundColor: theme.colors.mockChip,
    },
    demo: {
      backgroundColor: theme.colors.demoChip,
    },
    label: {
      color: theme.colors.textPrimary,
      fontSize: 12,
      fontWeight: "800",
    },
  });
