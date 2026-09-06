import { notFound } from "next/navigation";
import { Radio } from "lucide-react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/common/empty-state";
import { StreamSessionDialog } from "@/features/experiment/stream-session-dialog";
import { StreamSessionRow } from "@/features/experiment/stream-session-row";
import { getExperimentById, getStreamers, getStreamSessions } from "@/lib/queries/research";

export default async function StreamsPage({
  params,
}: PageProps<"/researcher/experiments/[id]/streams">) {
  const { id } = await params;
  const experiment = await getExperimentById(id);
  if (!experiment) notFound();

  const [sessions, allStreamers] = await Promise.all([getStreamSessions(id), getStreamers()]);
  const assignedStreamers = allStreamers.filter((s) => experiment.assignedStreamerIds.includes(s.id));

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <StreamSessionDialog experimentId={id} streamers={assignedStreamers} triggerLabel="New Stream Session" />
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon={<Radio className="size-5" />}
          title="No stream sessions yet"
          description="Log a stream session to attach tracking links (QR code, chat link, stream description) and see recruitment-source breakdowns for it."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Streamer</TableHead>
                <TableHead>Stream</TableHead>
                <TableHead>Game</TableHead>
                <TableHead>Stream Start</TableHead>
                <TableHead>Est. Viewers</TableHead>
                <TableHead>QR / Chat</TableHead>
                <TableHead>Links</TableHead>
                <TableHead>Participants</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <StreamSessionRow key={session.id} session={session} streamers={assignedStreamers} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
