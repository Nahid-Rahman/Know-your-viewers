import { notFound } from "next/navigation";
import { CalendarDays, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { StatCard } from "@/components/common/stat-card";
import { getExperimentById, mockStreamers } from "@/lib/mock/research";

export default async function ExperimentOverviewPage({
  params,
}: PageProps<"/researcher/experiments/[id]">) {
  const { id } = await params;
  const experiment = getExperimentById(id);
  if (!experiment) notFound();

  const assignedStreamers = mockStreamers.filter((s) => experiment.assignedStreamerIds.includes(s.id));

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
            <p className="mb-2 font-semibold">Description</p>
            <p className="text-sm text-muted-foreground">{experiment.description}</p>
            <p className="mt-4 mb-2 font-semibold">Research Objective</p>
            <p className="text-sm text-muted-foreground">{experiment.objective}</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <p className="mb-3 font-semibold">Assigned Streamers</p>
            {assignedStreamers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No streamers assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {assignedStreamers.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{s.displayName}</p>
                      <p className="text-xs text-muted-foreground">{s.platform} &bull; {s.category}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{s.totalClicks.toLocaleString()} clicks</span>
                  </div>
                ))}
              </div>
            )}
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
        </div>
      </div>
    </div>
  );
}
