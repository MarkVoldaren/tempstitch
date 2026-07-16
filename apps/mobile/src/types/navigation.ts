export type RootStackParamList = {
  Projects: undefined;
  ProjectSetup: { projectId?: string } | undefined;
  ColorMapping: { projectId: string };
  BlanketPreview: { projectId: string };
  BuildMode: { projectId: string };
  ProjectSettings: { projectId: string };
};
