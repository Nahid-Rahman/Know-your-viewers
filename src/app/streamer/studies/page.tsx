import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { requireRoleOrRedirect } from "@/lib/auth";
import { getExperiments, getStreamerByUserId } from "@/lib/queries/research";

export const metadata = { title: "Assigned Studies | LiveDrop Arena" };

export default async function StreamerStudiesPage() {
  const user = await requireRoleOrRedirect("STREAMER");
  const streamer = await getStreamerByUserId(user.id);
  const allExperiments = await getExperiments();
  const assigned = allExperiments.filter((e) => e.assignedStreamerIds.includes(streamer?.id ?? ""));

  return (
    <div>
      <PageHeader title="Assigned Studies" description="Studies where your channel is used to recruit participants." />

      {assigned.length === 0 ? (
        <EmptyState title="No studies assigned yet" description="A researcher will assign you to a study before a tracking link becomes available." />
      ) : (
        <div className="space-y-3">
          {assigned.map((exp) => (
            <Link
              key={exp.id}
              href={`/streamer/studies/${exp.id}`}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-5 hover:bg-secondary/30"
            >
              <div>
                <p className="font-semibold">{exp.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{exp.description}</p>
              </div>
              <StatusBadge status={exp.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
