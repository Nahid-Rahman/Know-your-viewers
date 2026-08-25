import { notFound } from "next/navigation";
import { ConditionsManager } from "@/features/experiment/conditions-manager";
import { getExperimentById } from "@/lib/queries/research";

export default async function ConditionsPage({
  params,
}: PageProps<"/researcher/experiments/[id]/conditions">) {
  const { id } = await params;
  const experiment = await getExperimentById(id);
  if (!experiment) notFound();

  return <ConditionsManager experimentId={id} conditions={experiment.conditions} />;
}
