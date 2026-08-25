import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { StatCard } from "@/components/common/stat-card";
import { StatusBadge } from "@/components/common/status-badge";
import { getStreamerById, mockExperiments } from "@/lib/mock/research";

export default async function StreamerDetailPage({
  params,
}: PageProps<"/researcher/streamers/[id]">) {
  const { id } = await params;
  const streamer = getStreamerById(id);
  if (!streamer) notFound();

  const experiments = mockExperiments.filter((e) => e.assignedStreamerIds.includes(id));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs text-muted-foreground">
            <Link href="/researcher/streamers" className="hover:text-foreground">Streamers</Link> / {streamer.displayName}
          </p>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{streamer.displayName}</h1>
          <a href={streamer.channelUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline">
            {streamer.platform} channel
            <ExternalLink className="size-3" />
          </a>
        </div>
        <StatusBadge status={streamer.status} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Category" value={streamer.category} tone="violet" />
        <StatCard label="Assigned Studies" value={streamer.assignedExperiments} tone="cyan" />
        <StatCard label="Total Clicks" value={streamer.totalClicks.toLocaleString()} tone="green" />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card">
        <p className="border-b border-border px-5 py-4 font-semibold">Assigned Experiments</p>
        <div className="divide-y divide-border">
          {experiments.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">No experiments assigned yet.</p>
          ) : (
            experiments.map((exp) => (
              <Link
                key={exp.id}
                href={`/researcher/experiments/${exp.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-secondary/30"
              >
                <span className="font-medium">{exp.title}</span>
                <StatusBadge status={exp.status} />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
