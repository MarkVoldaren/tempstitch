import { ProjectColorView } from "@/components/ProjectDetailViews";

export default async function ProjectColorsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectColorView projectId={id} />;
}
