import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/common/status-badge";
import { ExperimentTabs } from "@/features/experiment/experiment-tabs";
import { getExperimentById } from "@/lib/queries/research";

export default async function ExperimentDetailLayout({
  children,
  params,
}: LayoutProps<"/researcher/experiments/[id]">) {
  const { id } = await params;
  const experiment = await getExperimentById(id);
  if (!experiment) notFound();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs text-muted-foreground">
            <Link href="/researcher/experiments" className="hover:text-foreground">
              Experiments
            </Link>{" "}
            / {experiment.title}
          </p>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{experiment.title}</h1>
        </div>
        <StatusBadge status={experiment.status} />
      </div>

      <ExperimentTabs experimentId={id} />

      {children}
    </div>
  );
}
