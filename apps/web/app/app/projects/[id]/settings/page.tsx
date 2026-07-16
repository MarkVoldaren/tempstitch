import { ProjectSettingsView } from "@/components/ProjectDetailViews";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectSettingsView projectId={id} />;
}
