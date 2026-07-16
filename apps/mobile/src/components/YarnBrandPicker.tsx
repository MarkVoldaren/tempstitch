import { StyleSheet, Text, View } from "react-native";

import { AppTheme, useThemedStyles } from "@/theme";
import { YarnBrand } from "@/types/models";

import { AppButton } from "./AppButton";

type Props = {
  brands: YarnBrand[];
  selectedBrandId: string | null | undefined;
  onChange: (brandId: string | null) => void;
  label?: string;
};

export function YarnBrandPicker({
  brands,
  selectedBrandId,
  onChange,
  label = "Preferred yarn brand",
}: Props) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.actions}>
        <AppButton
          label={selectedBrandId ? "None" : "No brand"}
          onPress={() => onChange(null)}
          small
          variant={selectedBrandId ? "ghost" : "secondary"}
        />
        {brands.map((brand) => (
          <AppButton
            key={brand.id}
            label={brand.name}
            onPress={() => onChange(brand.id)}
            small
            variant={selectedBrandId === brand.id ? "secondary" : "ghost"}
          />
        ))}
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
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
  });
