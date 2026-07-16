import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppTheme, useThemedStyles } from "@/theme";

type Option<T extends string> = {
  label: string;
  value: T;
};

type Props<T extends string> = {
  label: string;
  value: T;
  options: Array<Option<T>>;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: Props<T>) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.container}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[styles.option, active && styles.activeOption]}
            >
              <Text style={[styles.optionLabel, active && styles.activeLabel]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
    container: {
      backgroundColor: theme.colors.cardMuted,
      borderRadius: theme.radii.md,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
      padding: theme.spacing.xs,
    },
    option: {
      alignItems: "center",
      borderRadius: theme.radii.md,
      flexGrow: 1,
      justifyContent: "center",
      minHeight: 42,
      minWidth: 110,
      paddingHorizontal: theme.spacing.sm,
    },
    activeOption: {
      backgroundColor: theme.colors.input,
    },
    optionLabel: {
      color: theme.colors.textMuted,
      fontSize: 14,
      fontWeight: "600",
      textAlign: "center",
    },
    activeLabel: {
      color: theme.colors.textPrimary,
    },
  });
