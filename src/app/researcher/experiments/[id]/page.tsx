import { notFound } from "next/navigation";
import { CalendarDays, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { StatCard } from "@/components/common/stat-card";
import { ConfirmDeleteButton } from "@/components/common/confirm-delete-button";
import { ExperimentStatusControl } from "@/features/experiment/experiment-status-control";
import { ExperimentEditDialog } from "@/features/experiment/experiment-edit-dialog";
import { StreamerAssignmentPanel } from "@/features/experiment/streamer-assignment-panel";
import { Button } from "@/components/ui/button";
import { deleteExperiment } from "@/lib/actions/experiments";
import { getExperimentById, getStreamers } from "@/lib/queries/research";

export default async function ExperimentOverviewPage({
  params,
}: PageProps<"/researcher/experiments/[id]">) {
  const { id } = await params;
  const experiment = await getExperimentById(id);
  if (!experiment) notFound();

  const streamers = await getStreamers();

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Participants" value={experiment.participantCount.toLocaleString()} icon={<Users className="size-4" />} tone="cyan" />
        <StatCard label="Completion Rate" value={`${experiment.completionRate}%`} icon={<CalendarDays className="size-4" />} tone="green" />
        <StatCard label="Conditions" value={experiment.conditions.length} icon={<ShieldCheck className="size-4" />} tone="violet" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-semibold">Description</p>
              <ExperimentEditDialog
                experimentId={experiment.id}
                defaultValues={{
                  title: experiment.title,
                  description: experiment.description,
                  objective: experiment.objective,
                  startDate: experiment.startDate,
                  endDate: experiment.endDate ?? "",
                  ethicsApprovalRef: experiment.ethicsApprovalRef ?? "",
                }}
                trigger={<Button variant="outline" size="sm">Edit</Button>}
              />
            </div>
            <p className="text-sm text-muted-foreground">{experiment.description}</p>
            <p className="mt-4 mb-2 font-semibold">Research Objective</p>
            <p className="text-sm text-muted-foreground">{experiment.objective}</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <p className="mb-3 font-semibold">Assigned Streamers</p>
            <StreamerAssignmentPanel
              experimentId={experiment.id}
              allStreamers={streamers}
              assignedStreamerIds={experiment.assignedStreamerIds}
            />
          </div>

          <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-5">
            <p className="mb-1 font-semibold text-destructive">Danger zone</p>
            <p className="mb-3 text-sm text-muted-foreground">
              Permanently deletes this experiment and every participant, response, and event
              recorded under it. This cannot be undone.
            </p>
            <ConfirmDeleteButton
              label="Delete Experiment"
              triggerVariant="destructive"
              triggerSize="sm"
              confirmTitle="Delete this experiment?"
              confirmDescription={`This permanently deletes "${experiment.title}" and all of its participants, responses, and engagement events.`}
              requireTypedConfirmation={experiment.title}
              redirectTo="/researcher/experiments"
              onConfirm={() => deleteExperiment(experiment.id)}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="mb-3 font-semibold">Timeline</p>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Start date</dt>
                <dd>{experiment.startDate}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">End date</dt>
                <dd>{experiment.endDate ?? "Ongoing"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Created</dt>
                <dd>{experiment.createdAt}</dd>
              </div>
            </dl>
          </div>

          <div
            className={
              experiment.ethicsApprovalRef
                ? "rounded-xl border border-accent-green/25 bg-accent-green/10 p-5"
                : "rounded-xl border border-destructive/25 bg-destructive/10 p-5"
            }
          >
            <div className="flex items-center gap-2">
              {experiment.ethicsApprovalRef ? (
                <ShieldCheck className="size-4 text-accent-green" />
              ) : (
                <ShieldAlert className="size-4 text-destructive" />
              )}
              <p className="font-semibold">Ethics Approval</p>
            </div>
            <p className="mt-1.5 text-sm">
              {experiment.ethicsApprovalRef ? (
                <span className="font-mono">{experiment.ethicsApprovalRef}</span>
              ) : (
                "Not on file — this experiment cannot be set to Active until an approval reference is recorded."
              )}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <p className="mb-3 font-semibold">Status</p>
            <ExperimentStatusControl experimentId={experiment.id} status={experiment.status} />
          </div>
        </div>
      </div>
    </div>
  );
}
