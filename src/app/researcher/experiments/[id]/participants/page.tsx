import Link from "next/link";
import { notFound } from "next/navigation";
import { Users, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getExperimentById } from "@/lib/queries/research";

/**
 * The full participant journey/filter/detail experience now lives at the
 * global Participants screen — this tab stays only as a scoped shortcut into
 * it, rather than maintaining a second, narrower table in parallel.
 */
export default async function ExperimentParticipantsPage({
  params,
}: PageProps<"/researcher/experiments/[id]/participants">) {
  const { id } = await params;
  const experiment = await getExperimentById(id);
  if (!experiment) notFound();

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-secondary/20 px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Users className="size-6" />
      </span>
      <div>
        <p className="font-semibold">View this experiment&apos;s participants</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Full participant profiles — journey, responses, contact, debrief, interview, and
          research-decision status — now live in one place, filterable by experiment.
        </p>
      </div>
      <Link
        href={`/researcher/participants?experimentId=${experiment.id}`}
        className={cn(buttonVariants(), "bg-gradient-primary text-white hover:opacity-90")}
      >
        Open Participants for this experiment
        <ArrowRight data-icon="inline-end" />
      </Link>
    </div>
  );
}
