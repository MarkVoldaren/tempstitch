import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Share, StyleSheet, Text, View } from "react-native";
import { useEffect, useState } from "react";

import { AppButton } from "@/components/AppButton";
import { DataSourceChip } from "@/components/DataSourceChip";
import { InlineBanner } from "@/components/InlineBanner";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionCard } from "@/components/SectionCard";
import { SegmentedControl } from "@/components/SegmentedControl";
import { YarnBrandPicker } from "@/components/YarnBrandPicker";
import { ToastBar } from "@/components/ToastBar";
import { getStoreProductId, supportPurchaseProducts } from "@/config/purchases";
import { recommendationModeOptions } from "@/constants/options";
import { purchaseService, SupportPurchaseProduct, SupportPurchaseProductId } from "@/services/purchases";
import { yarnCatalogService } from "@/services/yarn";
import { AppTheme, ThemeMode, useAppTheme, useThemedStyles } from "@/theme";
import { useAppStore } from "@/hooks/useAppStore";
import { RootStackParamList } from "@/types/navigation";
import { RecommendationMode } from "@/types/models";
import { formatDateLabel } from "@/utils/date";
import { getProjectCompletion, getProjectRanges } from "@/utils/project";

type Props = NativeStackScreenProps<RootStackParamList, "ProjectSettings">;

export function ProjectSettingsScreen({ navigation, route }: Props) {
  const styles = useThemedStyles(createStyles);
  const { themeMode, setThemeMode } = useAppTheme();
  const [supportProducts, setSupportProducts] = useState<SupportPurchaseProduct[]>(
    supportPurchaseProducts.map((product) => ({
      id: product.id,
      title: product.title,
      description: product.description,
      displayPrice: product.fallbackPriceLabel,
      storeProductId: getStoreProductId(product.id) ?? product.productionStoreProductId,
      source: "fallback",
      storeProduct: null,
    })),
  );
  const [supportMessage, setSupportMessage] = useState<string | null>(null);
  const [supportBusyProductId, setSupportBusyProductId] =
    useState<SupportPurchaseProductId | null>(null);
  const [supportToast, setSupportToast] = useState<string | null>(null);
  const {
    data,
    archiveProject,
    deleteProject,
    duplicateProject,
    exportProjectJson,
    resetProjectProgress,
    resyncProjectWeather,
    restoreProject,
    saveProject,
  } = useAppStore();
  const project = data.projects.find((item) => item.id === route.params.projectId);
  const completion = getProjectCompletion(route.params.projectId, data.progressRows);

  if (!project) {
    return (
      <ScreenContainer>
        <SectionCard>
          <Text style={styles.warningText}>This project could not be found.</Text>
        </SectionCard>
      </ScreenContainer>
    );
  }

  const activeProject = project;
  const projectRanges = getProjectRanges(activeProject.id, data.ranges);
  const builtInBrands = yarnCatalogService.getBrands();

  useEffect(() => {
    let mounted = true;

    async function loadSupportProducts() {
      const initResult = await purchaseService.initPurchases();
      const products = await purchaseService.getProducts();

      if (!mounted) {
        return;
      }

      setSupportProducts(products);
      setSupportMessage(initResult.available ? null : initResult.message);
    }

    void loadSupportProducts();

    return () => {
      mounted = false;
      void purchaseService.endConnection();
    };
  }, []);

  useEffect(() => {
    if (!supportToast) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      setSupportToast(null);
    }, 4000);

    return () => clearTimeout(timeout);
  }, [supportToast]);

  async function handleExport() {
    const payload = exportProjectJson(activeProject.id);
    await Share.share({
      message: payload,
      title: `${activeProject.name} export`,
    });
  }

  async function handleDuplicate() {
    const nextId = await duplicateProject(activeProject.id);
    navigation.replace("BlanketPreview", { projectId: nextId });
  }

  async function handleSupportPurchase(productId: SupportPurchaseProductId) {
    setSupportBusyProductId(productId);

    try {
      const result = await purchaseService.purchaseProduct(productId);
      setSupportToast(result.message);

      if (result.status === "error" && result.message === "Store not available") {
        setSupportMessage(result.message);
      }
    } finally {
      setSupportBusyProductId(null);
    }
  }

  async function handleSaveYarnPreferences(
    preferredYarnBrandId: string | null,
    recommendationMode: RecommendationMode,
  ) {
    await saveProject({
      id: activeProject.id,
      name: activeProject.name,
      location: {
        query: activeProject.locationName,
        name: activeProject.locationName,
        latitude: activeProject.latitude,
        longitude: activeProject.longitude,
      },
      unit: activeProject.unit,
      tempMode: activeProject.tempMode,
      startDate: activeProject.startDate,
      endDate: activeProject.endDate,
      stitchesPerRow: activeProject.stitchesPerRow,
      rowHeight: activeProject.rowHeight,
      craftType: activeProject.craftType,
      stitchName: activeProject.stitchName,
      previewOrientation: activeProject.previewOrientation,
      notes: activeProject.notes,
      allowRangeGaps: activeProject.allowRangeGaps,
      preferredYarnBrandId,
      recommendationMode,
      ranges: projectRanges,
    });
  }

  return (
    <ScreenContainer>
      <SectionCard>
        <Text style={styles.title}>{activeProject.name}</Text>
        <Text style={styles.meta}>{activeProject.locationName}</Text>
        <Text style={styles.meta}>
          {formatDateLabel(activeProject.startDate)} to {formatDateLabel(activeProject.endDate)}
        </Text>
        <View style={styles.metaChip}>
          <DataSourceChip label={activeProject.weatherSourceLabel} source={activeProject.weatherSource} />
        </View>
        <Text style={styles.meta}>
          {completion.completed} of {completion.total} rows complete
        </Text>
      </SectionCard>

      {activeProject.weatherStatusMessage ? (
        <InlineBanner message={activeProject.weatherStatusMessage} tone="info" />
      ) : null}

      <SectionCard>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <SegmentedControl<ThemeMode>
          label="Theme mode"
          onChange={(value) => {
            void setThemeMode(value);
          }}
          options={[
            { label: "System", value: "system" },
            { label: "Light", value: "light" },
            { label: "Dark", value: "dark" },
          ]}
          value={themeMode}
        />
        <Text style={styles.helperText}>
          System follows your phone setting. Changes apply instantly across the app.
        </Text>
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Project details</Text>
        <Text style={styles.meta}>Craft: {activeProject.craftType}</Text>
        <Text style={styles.meta}>Stitch: {activeProject.stitchName}</Text>
        <Text style={styles.meta}>Temperature mode: {activeProject.tempMode}</Text>
        <Text style={styles.meta}>Unit: {activeProject.unit}</Text>
        <Text style={styles.meta}>Preview orientation: {activeProject.previewOrientation}</Text>
        <Text style={styles.meta}>Stitches per row: {activeProject.stitchesPerRow}</Text>
        <Text style={styles.meta}>Preview row height: {activeProject.rowHeight}</Text>
        {activeProject.notes ? <Text style={styles.noteText}>{activeProject.notes}</Text> : null}
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Yarn recommendations</Text>
        <YarnBrandPicker
          brands={builtInBrands}
          onChange={(brandId) => {
            void handleSaveYarnPreferences(brandId, activeProject.recommendationMode);
          }}
          selectedBrandId={activeProject.preferredYarnBrandId ?? null}
        />
        <SegmentedControl<RecommendationMode>
          label="Recommendation mode"
          onChange={(value) => {
            void handleSaveYarnPreferences(activeProject.preferredYarnBrandId ?? null, value);
          }}
          options={recommendationModeOptions}
          value={activeProject.recommendationMode}
        />
        <Text style={styles.helperText}>
          Pick a brand to get yarn suggestions in color mapping and build mode.
        </Text>
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Support the Developer</Text>
        <Text style={styles.helperText}>
          If you enjoy StitchForecast, you can support development.
        </Text>
        {supportMessage ? (
          <View style={styles.supportBanner}>
            <InlineBanner
              message={supportMessage}
              tone="warning"
              title="Google Play billing unavailable"
            />
          </View>
        ) : null}
        <View style={styles.supportList}>
          {supportProducts.map((product) => (
            <View key={product.id} style={styles.supportCard}>
              <View style={styles.supportCopy}>
                <Text style={styles.supportTitle}>
                  {product.title} ({product.displayPrice})
                </Text>
                <Text style={styles.supportDescription}>{product.description}</Text>
              </View>
              <AppButton
                disabled={Boolean(supportBusyProductId) || Boolean(supportMessage)}
                label={
                  supportBusyProductId === product.id
                    ? "Processing..."
                    : `${product.title} (${product.displayPrice})`
                }
                onPress={() => {
                  void handleSupportPurchase(product.id);
                }}
                small
              />
            </View>
          ))}
        </View>
      </SectionCard>

      <View style={styles.actions}>
        <AppButton
          label="Re-sync Weather Data"
          onPress={() => resyncProjectWeather(activeProject.id, "none")}
        />
        <AppButton
          label="Use Mock Weather Fallback"
          onPress={() => resyncProjectWeather(activeProject.id, "mockOnly")}
          variant="secondary"
        />
        <AppButton
          label="Edit Project Details"
          onPress={() => navigation.navigate("ProjectSetup", { projectId: activeProject.id })}
          variant="secondary"
        />
        <AppButton
          label="Edit Color Mapping"
          onPress={() => navigation.navigate("ColorMapping", { projectId: activeProject.id })}
          variant="secondary"
        />
        <AppButton label="Export Project JSON" onPress={handleExport} variant="ghost" />
        <AppButton label="Duplicate Project" onPress={handleDuplicate} variant="ghost" />
        <AppButton
          label="Reset Completion Progress"
          onPress={() =>
            Alert.alert("Reset progress?", "This clears all completed row checkmarks.", [
              { text: "Cancel", style: "cancel" },
              { text: "Reset", style: "destructive", onPress: () => resetProjectProgress(activeProject.id) },
            ])
          }
          variant="danger"
        />
        <AppButton
          label={activeProject.archivedAt ? "Restore Project" : "Archive Project"}
          onPress={() =>
            Alert.alert(
              activeProject.archivedAt ? "Restore project?" : "Archive project?",
              activeProject.archivedAt
                ? "This project will reappear in your active list."
                : "Archived projects are hidden from the main list until restored.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: activeProject.archivedAt ? "Restore" : "Archive",
                  onPress: () =>
                    activeProject.archivedAt
                      ? restoreProject(activeProject.id)
                      : archiveProject(activeProject.id),
                },
              ],
            )
          }
          variant="ghost"
        />
        <AppButton
          label="Delete Project"
          onPress={() =>
            Alert.alert(
              "Delete project permanently?",
              "This removes the project, rows, progress, and cached weather from local storage.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: async () => {
                    await deleteProject(activeProject.id);
                    navigation.navigate("Projects");
                  },
                },
              ],
            )
          }
          variant="danger"
        />
      </View>

      <ToastBar message={supportToast ?? ""} visible={Boolean(supportToast)} />
    </ScreenContainer>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    warningText: {
      color: theme.colors.error,
      fontSize: 14,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 26,
      fontWeight: "900",
    },
    meta: {
      color: theme.colors.textMuted,
      fontSize: 14,
      lineHeight: 21,
      marginTop: theme.spacing.xs,
    },
    metaChip: {
      marginTop: theme.spacing.sm,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontSize: 17,
      fontWeight: "800",
      marginBottom: theme.spacing.sm,
    },
    helperText: {
      color: theme.colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
    },
    supportBanner: {
      marginTop: theme.spacing.md,
    },
    supportList: {
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    supportCard: {
      backgroundColor: theme.colors.cardMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      gap: theme.spacing.md,
      padding: theme.spacing.md,
    },
    supportCopy: {
      gap: theme.spacing.xs,
    },
    supportTitle: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: "800",
    },
    supportDescription: {
      color: theme.colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
    },
    noteText: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      lineHeight: 20,
      marginTop: theme.spacing.md,
    },
    actions: {
      gap: theme.spacing.sm,
    },
  });
