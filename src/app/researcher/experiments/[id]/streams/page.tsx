import { requireExperimentPage } from "@/lib/study/researcher";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Radio } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { StreamSessionDialog } from "@/features/experiment/stream-session-dialog";
import { getExperimentById, getStreamers } from "@/lib/queries/research";
import { getStudySessions } from "@/lib/study/admin-queries";
import { formatStudyTime } from "@/lib/study/time";

export default async function StreamsPage({ params }: PageProps<"/researcher/experiments/[id]/streams">) {
  const { id } = await params;
  await requireExperimentPage(id);
  const experiment = await getExperimentById(id);
  if (!experiment) notFound();

  const [sessions, allStreamers] = await Promise.all([getStudySessions(id), getStreamers()]);
  const assignedStreamers = allStreamers.filter((s) => experiment.assignedStreamerIds.includes(s.id));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Sessions run one at a time. <strong>B — Study</strong> sessions get the website (same URL, streamer-branded); <strong>A — Normal</strong>{" "}
          sessions have no website and only platform metrics. Times are Asia/Dhaka.
        </p>
        <StreamSessionDialog experimentId={id} streamers={assignedStreamers} triggerLabel="New session" />
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon={<Radio className="size-5" />}
          title="No sessions yet"
          description="Create a study session (B) for the website, or a normal session (A) to record baseline platform metrics."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Actual start</TableHead>
                <TableHead>Actual end</TableHead>
                <TableHead>Entry deadline</TableHead>
                <TableHead className="text-right">Visits</TableHead>
                <TableHead className="text-right">Submissions</TableHead>
                <TableHead className="text-right">Metrics</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link href={`/researcher/experiments/${id}/streams/${s.id}`} className="font-medium hover:underline">
                      {s.streamer.displayName}
                      {s.streamTitle ? ` — ${s.streamTitle}` : ""}
                    </Link>
                    {s.currentConfig && <span className="block text-xs text-muted-foreground">config v{s.currentConfig.version}</span>}
                  </TableCell>
                  <TableCell className="text-sm">{s.sessionType === "STUDY" ? "B — Study" : "A — Normal"}</TableCell>
                  <TableCell>
                    <StatusBadge status={s.status} />
                    {s.status === "ACTIVE" && !s.entry.accepting && (
                      <span className="block text-xs text-muted-foreground">entries closed</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={s.collectionMode === "LIVE" ? "LIVE" : "TEST"} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatStudyTime(s.actualStartAt)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatStudyTime(s.actualEndAt)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.sessionType === "STUDY" ? (s.entryDeadlineAt ? formatStudyTime(s.entryDeadlineAt) : "not set (no actual end)") : "—"}
                  </TableCell>
                  <TableCell className="text-right">{s._count.visits}</TableCell>
                  <TableCell className="text-right">{s._count.submissions}</TableCell>
                  <TableCell className="text-right">{s._count.platformMetrics}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
