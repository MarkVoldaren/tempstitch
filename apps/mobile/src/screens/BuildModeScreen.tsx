import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton } from "@/components/AppButton";
import { BuildQueueList } from "@/components/BuildQueueList";
import { ProgressHeader } from "@/components/ProgressHeader";
import { SegmentedControl } from "@/components/SegmentedControl";
import { SectionCard } from "@/components/SectionCard";
import { ToastBar } from "@/components/ToastBar";
import { AppTheme, useThemedStyles } from "@/theme";
import { useAppStore } from "@/hooks/useAppStore";
import { RootStackParamList } from "@/types/navigation";
import { formatDateLabel, formatWeekday, getTodayIso } from "@/utils/date";
import {
  getNextRows,
  getProjectCompletion,
  getProjectDays,
  getProjectProgressRows,
  getProjectRanges,
} from "@/utils/project";
import { formatTemperature } from "@/utils/temperature";

type Props = NativeStackScreenProps<RootStackParamList, "BuildMode">;

export function BuildModeScreen({ navigation, route }: Props) {
  const styles = useThemedStyles(createStyles);
  const { data, toggleRowCompleted } = useAppStore();
  const project = data.projects.find((item) => item.id === route.params.projectId);
  const days = getProjectDays(route.params.projectId, data.temperatureDays);
  const ranges = getProjectRanges(route.params.projectId, data.ranges);
  const progressRows = getProjectProgressRows(route.params.projectId, data.progressRows);
  const completion = getProjectCompletion(route.params.projectId, data.progressRows);
  const [displayMode, setDisplayMode] = useState<"queue" | "focus">("focus");
  const [filterMode, setFilterMode] = useState<"next" | "completed">("next");
  const [toast, setToast] = useState<{
    rowId: string;
    previousCompleted: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(timeout);
  }, [toast]);

  if (!project) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <SectionCard>
            <Text style={styles.warningText}>This project could not be found.</Text>
          </SectionCard>
        </View>
      </SafeAreaView>
    );
  }

  const activeProject = project;
  const nextQueue = getNextRows(activeProject.id, progressRows, days, 5).map((item) => ({
    id: item.progressRow.id,
    rowNumber: item.progressRow.rowNumber,
    date: item.progressRow.date,
    completed: item.progressRow.completed,
    day: item.day,
  }));
  const completedRows = progressRows
    .filter((row) => row.completed)
    .sort((left, right) => right.rowNumber - left.rowNumber)
    .map((row) => ({
      id: row.id,
      rowNumber: row.rowNumber,
      date: row.date,
      completed: row.completed,
      day: days.find((day) => day.date === row.date) ?? null,
    }));
  const todayIso = getTodayIso();
  const todayRow = progressRows.find((row) => row.date === todayIso);
  const todayDay = days.find((day) => day.date === todayIso);
  const visibleItems = filterMode === "next" ? nextQueue : completedRows;
  const firstIncomplete = nextQueue[0];

  async function handleToggle(rowId: string, completed: boolean) {
    const existing = progressRows.find((row) => row.id === rowId);
    if (!existing) {
      return;
    }

    await toggleRowCompleted(activeProject.id, rowId, completed);
    setToast({
      rowId,
      previousCompleted: existing.completed,
      message: completed ? `Row ${existing.rowNumber} marked complete.` : `Row ${existing.rowNumber} reopened.`,
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ProgressHeader
            detail={`${completion.completed} of ${completion.total} rows completed`}
            percent={completion.percent}
            subtitle={`${activeProject.locationName} · ${activeProject.stitchName}`}
            title={activeProject.name}
          />

          {todayRow && todayDay ? (
            <SectionCard>
              <Text style={styles.sectionTitle}>Today&apos;s row</Text>
              <Text style={styles.todayText}>
                Row {todayRow.rowNumber} · {formatWeekday(todayRow.date)} · {formatDateLabel(todayRow.date)}
              </Text>
              <Text style={styles.todayText}>
                {formatTemperature(todayDay.selectedTemp, activeProject.unit)}
              </Text>
            </SectionCard>
          ) : null}

          <SectionCard>
            <SegmentedControl
              label="Display mode"
              onChange={(value) => setDisplayMode(value)}
              options={[
                { label: "Queue Mode", value: "queue" },
                { label: "Focus Mode", value: "focus" },
              ]}
              value={displayMode}
            />
            <SegmentedControl
              label="Rows shown"
              onChange={(value) => setFilterMode(value)}
              options={[
                { label: "Only next rows", value: "next" },
                { label: "Completed rows", value: "completed" },
              ]}
              value={filterMode}
            />

            <View style={styles.quickActions}>
              <AppButton
                label="Jump To First Incomplete"
                onPress={() => setFilterMode("next")}
                small
                variant="secondary"
              />
            </View>
          </SectionCard>

          <SectionCard>
            <Text style={styles.sectionTitle}>
              {filterMode === "next" ? "Next 5 rows" : "Completed rows"}
            </Text>
            {visibleItems.length > 0 ? (
              <BuildQueueList
                focusMode={filterMode === "next" && displayMode === "focus"}
                items={visibleItems}
                onToggle={handleToggle}
                project={activeProject}
                ranges={ranges}
              />
            ) : (
              <Text style={styles.helperText}>
                {filterMode === "next"
                  ? "All rows are complete. Beautiful work."
                  : "No completed rows yet."}
              </Text>
            )}
          </SectionCard>
        </ScrollView>

        <View style={styles.footer}>
          <AppButton
            label={firstIncomplete ? `Mark Row ${firstIncomplete.rowNumber} Complete` : "All Rows Complete"}
            onPress={() => {
              if (firstIncomplete) {
                void handleToggle(firstIncomplete.id, true);
              }
            }}
            disabled={!firstIncomplete}
          />
          <AppButton
            label="Open Preview"
            onPress={() => navigation.navigate("BlanketPreview", { projectId: activeProject.id })}
            variant="secondary"
          />
        </View>

        <ToastBar
          actionLabel="Undo"
          message={toast?.message ?? ""}
          onAction={() => {
            if (!toast) {
              return;
            }
            void handleToggle(toast.rowId, toast.previousCompleted);
            setToast(null);
          }}
          visible={Boolean(toast)}
        />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safeArea: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },
    container: {
      flex: 1,
      paddingHorizontal: theme.spacing.md,
    },
    scrollContent: {
      paddingBottom: 160,
    },
    warningText: {
      color: theme.colors.error,
      fontSize: 14,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: "800",
      marginBottom: theme.spacing.xs,
    },
    helperText: {
      color: theme.colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
    todayText: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      lineHeight: 22,
    },
    quickActions: {
      marginTop: theme.spacing.sm,
    },
    footer: {
      backgroundColor: theme.colors.background,
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      bottom: 0,
      gap: theme.spacing.sm,
      left: 0,
      paddingBottom: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      position: "absolute",
      right: 0,
    },
  });
