import { notFound } from "next/navigation";
import { Link2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CopyableCode } from "@/components/common/copyable-code";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { getExperimentById, getStreamerById, mockTrackingLinks } from "@/lib/mock/research";

export default async function TrackingLinksPage({
  params,
}: PageProps<"/researcher/experiments/[id]/links">) {
  const { id } = await params;
  const experiment = getExperimentById(id);
  if (!experiment) notFound();

  const links = mockTrackingLinks.filter((l) => l.experimentId === id);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button className="bg-gradient-primary text-white hover:opacity-90">Generate Link</Button>
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
                <TableHead>Visits</TableHead>
                <TableHead>Conversions</TableHead>
                <TableHead>Conversion Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => {
                const streamer = link.streamerId ? getStreamerById(link.streamerId) : null;
                const rate = link.visits > 0 ? ((link.conversions / link.visits) * 100).toFixed(1) : "0.0";
                return (
                  <TableRow key={link.id}>
                    <TableCell>
                      <CopyableCode value={link.uniqueCode} />
                    </TableCell>
                    <TableCell className="text-sm">{streamer?.displayName ?? "Unassigned"}</TableCell>
                    <TableCell>{link.visits.toLocaleString()}</TableCell>
                    <TableCell>{link.conversions.toLocaleString()}</TableCell>
                    <TableCell>{rate}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
