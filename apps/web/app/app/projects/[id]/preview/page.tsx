import { ProjectPreviewView } from "@/components/ProjectDetailViews";

export default async function ProjectPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectPreviewView projectId={id} />;
}
