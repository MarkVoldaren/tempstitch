import { AppData, ProjectExportBundle } from "../types/models";

export type ProjectRepository = {
  loadProjectsForUser(userId: string): Promise<AppData["projects"]>;
  saveProject(userId: string, project: AppData["projects"][number]): Promise<void>;
  saveRanges(userId: string, projectId: string, ranges: AppData["ranges"]): Promise<void>;
  saveProgress(
    userId: string,
    projectId: string,
    progressRows: AppData["progressRows"],
  ): Promise<void>;
  deleteProject(userId: string, projectId: string): Promise<void>;
  exportProject(userId: string, projectId: string): Promise<ProjectExportBundle | null>;
  importProject(userId: string, bundle: ProjectExportBundle): Promise<void>;
};

export type AppStorageAdapter = {
  loadAppData(userId: string): Promise<AppData | null>;
  saveAppData(userId: string, data: AppData): Promise<void>;
};

export type SupportPurchaseAdapter = {
  supported: boolean;
  isVisible: boolean;
};
