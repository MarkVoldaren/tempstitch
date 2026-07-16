import { StyleSheet, Text, View } from "react-native";

import { AppTheme, useThemedStyles } from "@/theme";
import { Project } from "@/types/models";
import { formatDateShort } from "@/utils/date";

import { AppButton } from "./AppButton";
import { SectionCard } from "./SectionCard";

type Props = {
  project: Project;
  progressPercent: number;
  progressLabel: string;
  onBuild: () => void;
  onPreview: () => void;
  onSettings: () => void;
};

export function ProjectCard({
  project,
  progressPercent,
  progressLabel,
  onBuild,
  onPreview,
  onSettings,
}: Props) {
  const styles = useThemedStyles(createStyles);

  return (
    <SectionCard>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{project.name}</Text>
          <Text style={styles.subtitle}>{project.locationName}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{progressPercent}%</Text>
        </View>
      </View>

      <Text style={styles.meta}>
        {formatDateShort(project.startDate)} to {formatDateShort(project.endDate)}
      </Text>
      <Text style={styles.meta}>{project.craftType} · {project.stitchName}</Text>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>
      <Text style={styles.progressLabel}>{progressLabel}</Text>

      <View style={styles.actions}>
        <AppButton label="Build Mode" onPress={onBuild} small />
        <AppButton label="Preview" onPress={onPreview} variant="secondary" small />
        <AppButton label="Settings" onPress={onSettings} variant="ghost" small />
      </View>
    </SectionCard>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    header: {
      alignItems: "flex-start",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.sm,
    },
    headerText: {
      flex: 1,
      paddingRight: theme.spacing.sm,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 20,
      fontWeight: "800",
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontSize: 14,
      marginTop: 4,
    },
    badge: {
      backgroundColor: theme.colors.successSoft,
      borderRadius: theme.radii.pill,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 6,
    },
    badgeText: {
      color: theme.colors.success,
      fontSize: 13,
      fontWeight: "800",
    },
    meta: {
      color: theme.colors.textMuted,
      fontSize: 14,
      marginBottom: 4,
    },
    progressTrack: {
      backgroundColor: theme.colors.cardMuted,
      borderRadius: theme.radii.pill,
      height: 10,
      marginTop: theme.spacing.md,
      overflow: "hidden",
    },
    progressFill: {
      backgroundColor: theme.colors.accent,
      height: "100%",
    },
    progressLabel: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "600",
      marginTop: theme.spacing.sm,
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
  });
