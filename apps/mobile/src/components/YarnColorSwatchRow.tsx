import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppTheme, useAppTheme, useThemedStyles } from "@/theme";
import { YarnColor } from "@/types/models";
import { getYarnOutlineColor } from "@/utils/color";

type Props = {
  yarnColor: YarnColor;
  subtitle?: string;
  trailingLabel?: string;
  onPress?: () => void;
};

export function YarnColorSwatchRow({
  yarnColor,
  subtitle,
  trailingLabel,
  onPress,
}: Props) {
  const { currentTheme: theme } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const content = (
    <>
      <View
        style={[
          styles.swatch,
          {
            backgroundColor: yarnColor.hex,
            borderColor: getYarnOutlineColor(yarnColor.hex, theme.dark, theme.colors.yarnOutline),
          },
        ]}
      />
      <View style={styles.body}>
        <Text style={styles.title}>{yarnColor.name}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {trailingLabel ? <Text style={styles.trailing}>{trailingLabel}</Text> : null}
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable onPress={onPress} style={styles.row}>
      {content}
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    row: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    swatch: {
      borderRadius: theme.radii.md,
      borderWidth: 1,
      height: 30,
      width: 30,
    },
    body: {
      flex: 1,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "700",
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    trailing: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: "700",
    },
  });
