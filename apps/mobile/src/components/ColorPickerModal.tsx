import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { yarnPalette } from "@/constants/options";
import { AppTheme, useAppTheme, useThemedStyles } from "@/theme";
import { getYarnOutlineColor, normalizeHexColor } from "@/utils/color";

import { AppButton } from "./AppButton";
import { TextField } from "./TextField";

type Props = {
  visible: boolean;
  initialColor: string;
  onClose: () => void;
  onSelect: (hexColor: string) => void;
};

const tonalRows = [
  ["#132A13", "#31572C", "#4F772D", "#90A955", "#ECF39E"],
  ["#355070", "#6D597A", "#B56576", "#E56B6F", "#EAAC8B"],
  ["#1D3557", "#457B9D", "#A8DADC", "#F1FAEE", "#E63946"],
  ["#264653", "#2A9D8F", "#E9C46A", "#F4A261", "#E76F51"],
];

export function ColorPickerModal({
  visible,
  initialColor,
  onClose,
  onSelect,
}: Props) {
  const { currentTheme: theme } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [draftColor, setDraftColor] = useState(normalizeHexColor(initialColor));

  useEffect(() => {
    if (visible) {
      setDraftColor(normalizeHexColor(initialColor));
    }
  }, [initialColor, visible]);

  return (
    <Modal animationType="slide" transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Pick a yarn color</Text>
          <View
            style={[
              styles.heroSwatch,
              {
                backgroundColor: draftColor,
                borderColor: getYarnOutlineColor(draftColor, theme.dark, theme.colors.yarnOutline),
              },
            ]}
          />

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>Studio palette</Text>
            <View style={styles.grid}>
              {yarnPalette.map((swatch) => (
                <Pressable
                  key={swatch}
                  onPress={() => setDraftColor(swatch)}
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: swatch,
                      borderColor: getYarnOutlineColor(swatch, theme.dark, theme.colors.yarnOutline),
                    },
                    draftColor === swatch && styles.activeSwatch,
                  ]}
                />
              ))}
            </View>

            <Text style={styles.sectionLabel}>Tonal strips</Text>
            {tonalRows.map((row, index) => (
              <View key={String(index)} style={styles.tonalRow}>
                {row.map((swatch) => (
                  <Pressable
                    key={swatch}
                    onPress={() => setDraftColor(swatch)}
                    style={[
                      styles.tonalSwatch,
                      {
                        backgroundColor: swatch,
                        borderColor: getYarnOutlineColor(swatch, theme.dark, theme.colors.yarnOutline),
                      },
                      draftColor === swatch && styles.activeSwatch,
                    ]}
                  />
                ))}
              </View>
            ))}

            <TextField
              autoCapitalize="characters"
              label="Custom hex color"
              onChangeText={(value) => setDraftColor(normalizeHexColor(value))}
              value={draftColor}
            />
          </ScrollView>

          <View style={styles.actions}>
            <AppButton label="Cancel" onPress={onClose} variant="ghost" />
            <AppButton
              label="Use Color"
              onPress={() => {
                onSelect(draftColor);
                onClose();
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) => {
  const styles = StyleSheet.create({
    backdrop: {
      backgroundColor: theme.colors.backdrop,
      flex: 1,
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: theme.radii.lg,
      borderTopRightRadius: theme.radii.lg,
      maxHeight: "82%",
      padding: theme.spacing.md,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 20,
      fontWeight: "900",
      marginBottom: theme.spacing.sm,
    },
    heroSwatch: {
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      height: 88,
      marginBottom: theme.spacing.md,
      width: "100%",
    },
    sectionLabel: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "800",
      marginBottom: theme.spacing.sm,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    swatch: {
      borderRadius: theme.radii.md,
      borderWidth: 1,
      height: 42,
      width: 42,
    },
    activeSwatch: {
      borderColor: theme.colors.focusRing,
      borderWidth: 3,
    },
    tonalRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    tonalSwatch: {
      borderRadius: theme.radii.md,
      borderWidth: 1,
      flex: 1,
      height: 38,
    },
    actions: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
  });

  return styles;
};
