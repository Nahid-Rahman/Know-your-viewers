import { notFound } from "next/navigation";
import { Link2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/common/empty-state";
import { GenerateLinkButton } from "@/features/experiment/generate-link-button";
import { TrackingLinkRow } from "@/features/experiment/tracking-link-row";
import { getExperimentById, getStreamers, getStreamSessionOptions, getTrackingLinks } from "@/lib/queries/research";

export default async function TrackingLinksPage({
  params,
}: PageProps<"/researcher/experiments/[id]/links">) {
  const { id } = await params;
  const experiment = await getExperimentById(id);
  if (!experiment) notFound();

  const [links, allStreamers, streamSessions] = await Promise.all([
    getTrackingLinks(id),
    getStreamers(),
    getStreamSessionOptions(id),
  ]);
  const assignedStreamers = allStreamers.filter((s) => experiment.assignedStreamerIds.includes(s.id));

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <GenerateLinkButton experimentId={id} streamers={assignedStreamers} streamSessions={streamSessions} />
      </div>

      {links.length === 0 ? (
        <EmptyState
          icon={<Link2 className="size-5" />}
          title="No tracking links yet"
          description="Generate a unique code per streamer to attribute participation back to this experiment."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Streamer</TableHead>
                <TableHead>Entry Source</TableHead>
                <TableHead>Stream Session</TableHead>
                <TableHead>Visits</TableHead>
                <TableHead>Conversions</TableHead>
                <TableHead>Conversion Rate</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => (
                <TrackingLinkRow key={link.id} link={link} streamers={assignedStreamers} streamSessions={streamSessions} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
