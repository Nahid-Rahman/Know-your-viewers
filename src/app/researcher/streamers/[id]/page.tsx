import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { StatCard } from "@/components/common/stat-card";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/common/confirm-delete-button";
import { StreamerEditDialog } from "@/features/streamer/streamer-edit-dialog";
import { deleteStreamer } from "@/lib/actions/streamers";
import { getStreamerById, getExperiments } from "@/lib/queries/research";

export default async function StreamerDetailPage({
  params,
}: PageProps<"/researcher/streamers/[id]">) {
  const { id } = await params;
  const streamer = await getStreamerById(id);
  if (!streamer) notFound();

  const allExperiments = await getExperiments();
  const experiments = allExperiments.filter((e) => e.assignedStreamerIds.includes(id));

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
        <div className="flex items-center gap-2">
          <StatusBadge status={streamer.status} />
          <StreamerEditDialog
            streamerId={streamer.id}
            defaultValues={{
              displayName: streamer.displayName,
              platform: streamer.platform,
              channelUrl: streamer.channelUrl,
              category: streamer.category,
              status: streamer.status,
            }}
            trigger={<Button variant="outline" size="sm">Edit</Button>}
          />
          <ConfirmDeleteButton
            label="Delete"
            triggerVariant="outline"
            triggerSize="sm"
            confirmDescription={`Delete "${streamer.displayName}"? This removes their profile and login, and unassigns them from every experiment and tracking link.`}
            redirectTo="/researcher/streamers"
            onConfirm={deleteStreamer.bind(null, streamer.id)}
          />
        </div>
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
