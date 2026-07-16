import { NewProjectWizard } from "@/components/NewProjectWizard";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NewProjectWizard projectId={id} />;
}
