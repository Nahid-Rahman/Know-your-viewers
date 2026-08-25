import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { mockStreamers } from "@/lib/mock/research";

export const metadata = { title: "Streamers | LiveDrop Arena" };

export default function StreamersPage() {
  return (
    <div>
      <PageHeader title="Streamers" description="Manage streamer profiles and their experiment assignments." />

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
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockStreamers.map((s) => (
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
