import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/AppButton";
import { InlineBanner } from "@/components/InlineBanner";
import { ProjectCard } from "@/components/ProjectCard";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionCard } from "@/components/SectionCard";
import { TextField } from "@/components/TextField";
import { AppTheme, useThemedStyles } from "@/theme";
import { useAppStore } from "@/hooks/useAppStore";
import { RootStackParamList } from "@/types/navigation";
import { getActiveProjects, getArchivedProjects, getProjectCompletion } from "@/utils/project";

type Props = NativeStackScreenProps<RootStackParamList, "Projects">;

export function ProjectsScreen({ navigation }: Props) {
  const styles = useThemedStyles(createStyles);
  const { data, error, clearError, initializing, importProjectsFromJson } = useAppStore();
  const [showArchived, setShowArchived] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const activeProjects = getActiveProjects(data.projects);
  const archivedProjects = getArchivedProjects(data.projects);

  async function handleImport() {
    const count = await importProjectsFromJson(importJson);
    setImportMessage(`Imported ${count} project${count === 1 ? "" : "s"} successfully.`);
    setImportJson("");
    setShowImport(false);
  }

  return (
    <ScreenContainer>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Design, preview, and build</Text>
        <Text style={styles.title}>Your yarn-friendly weather tracker</Text>
        <Text style={styles.subtitle}>
          Create guided projects, preview the whole blanket, and stitch through a
          queue that is built for real phone use.
        </Text>
      </View>

      <View style={styles.primaryActions}>
        <AppButton
          label="Create New Project"
          onPress={() => navigation.navigate("ProjectSetup")}
        />
        <AppButton
          label={showImport ? "Close Import" : "Import JSON"}
          onPress={() => setShowImport((current) => !current)}
          variant="secondary"
        />
      </View>

      {error ? (
        <InlineBanner
          message={error}
          primaryAction={{ label: "Dismiss", onPress: clearError }}
          tone="danger"
        />
      ) : null}

      {importMessage ? (
        <InlineBanner
          message={importMessage}
          primaryAction={{ label: "Dismiss", onPress: () => setImportMessage(null) }}
          tone="success"
        />
      ) : null}

      {showImport ? (
        <SectionCard>
          <Text style={styles.sectionTitle}>Import project JSON</Text>
          <TextField
            label="Paste exported JSON"
            multiline
            onChangeText={setImportJson}
            placeholder="Paste project export JSON here"
            style={styles.importInput}
            value={importJson}
          />
          <AppButton label="Import Project" onPress={handleImport} />
        </SectionCard>
      ) : null}

      {initializing ? (
        <SectionCard>
          <Text style={styles.emptyText}>Loading your blanket studio...</Text>
        </SectionCard>
      ) : null}

      {!initializing && activeProjects.length === 0 ? (
        <SectionCard>
          <Text style={styles.emptyTitle}>No active projects yet</Text>
          <Text style={styles.emptyText}>
            Create your first blanket project to fetch temperatures, map yarn
            colors, and track rows.
          </Text>
        </SectionCard>
      ) : null}

      {activeProjects.map((project) => {
        const completion = getProjectCompletion(project.id, data.progressRows);
        return (
          <ProjectCard
            key={project.id}
            onBuild={() => navigation.navigate("BuildMode", { projectId: project.id })}
            onPreview={() => navigation.navigate("BlanketPreview", { projectId: project.id })}
            onSettings={() => navigation.navigate("ProjectSettings", { projectId: project.id })}
            progressLabel={`${completion.completed} of ${completion.total} rows complete`}
            progressPercent={completion.percent}
            project={project}
          />
        );
      })}

      {archivedProjects.length > 0 ? (
        <SectionCard>
          <Text style={styles.sectionTitle}>Archived projects</Text>
          <AppButton
            label={showArchived ? "Hide Archived" : "Show Archived"}
            onPress={() => setShowArchived((current) => !current)}
            small
            variant="secondary"
          />
        </SectionCard>
      ) : null}

      {showArchived
        ? archivedProjects.map((project) => {
            const completion = getProjectCompletion(project.id, data.progressRows);
            return (
              <ProjectCard
                key={project.id}
                onBuild={() => navigation.navigate("BuildMode", { projectId: project.id })}
                onPreview={() => navigation.navigate("BlanketPreview", { projectId: project.id })}
                onSettings={() => navigation.navigate("ProjectSettings", { projectId: project.id })}
                progressLabel={`${completion.completed} of ${completion.total} rows complete`}
                progressPercent={completion.percent}
                project={project}
              />
            );
          })
        : null}
    </ScreenContainer>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    hero: {
      marginBottom: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
    },
    eyebrow: {
      color: theme.colors.accent,
      fontSize: 13,
      fontWeight: "800",
      letterSpacing: 0.6,
      marginBottom: theme.spacing.xs,
      textTransform: "uppercase",
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 30,
      fontWeight: "900",
      lineHeight: 36,
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontSize: 15,
      lineHeight: 22,
      marginTop: theme.spacing.sm,
    },
    primaryActions: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: "800",
      marginBottom: theme.spacing.sm,
    },
    emptyTitle: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: "800",
      marginBottom: theme.spacing.xs,
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    importInput: {
      minHeight: 160,
      textAlignVertical: "top",
    },
  });
