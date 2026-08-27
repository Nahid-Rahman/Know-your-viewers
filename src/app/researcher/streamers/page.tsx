import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { ConfirmDeleteButton } from "@/components/common/confirm-delete-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateStreamerDialog } from "@/features/streamer/create-streamer-dialog";
import { StreamerEditDialog } from "@/features/streamer/streamer-edit-dialog";
import { Button } from "@/components/ui/button";
import { deleteStreamer } from "@/lib/actions/streamers";
import { getStreamers } from "@/lib/queries/research";

export const metadata = { title: "Streamers | LiveDrop Arena" };

export default async function StreamersPage() {
  const streamers = await getStreamers();

  return (
    <div>
      <PageHeader
        title="Streamers"
        description="Manage streamer profiles and their experiment assignments."
        actions={<CreateStreamerDialog />}
      />

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Display Name</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned Studies</TableHead>
              <TableHead>Total Clicks</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {streamers.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <Link href={`/researcher/streamers/${s.id}`} className="font-medium hover:text-primary">
                    {s.displayName}
                  </Link>
                </TableCell>
                <TableCell className="text-sm">{s.platform}</TableCell>
                <TableCell className="text-sm">{s.category}</TableCell>
                <TableCell><StatusBadge status={s.status} /></TableCell>
                <TableCell>{s.assignedExperiments}</TableCell>
                <TableCell>{s.totalClicks.toLocaleString()}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <StreamerEditDialog
                      streamerId={s.id}
                      defaultValues={{
                        displayName: s.displayName,
                        platform: s.platform,
                        channelUrl: s.channelUrl,
                        category: s.category,
                        status: s.status,
                      }}
                      trigger={<Button variant="ghost" size="sm">Edit</Button>}
                    />
                    <ConfirmDeleteButton
                      confirmDescription={`Delete "${s.displayName}"? This removes their profile and login, and unassigns them from every experiment and tracking link.`}
                      onConfirm={deleteStreamer.bind(null, s.id)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
