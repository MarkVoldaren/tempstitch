import { ProjectBuildView } from "@/components/ProjectDetailViews";

export default async function ProjectBuildPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectBuildView projectId={id} />;
}
