import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { mockExperiments } from "@/lib/mock/research";

export const metadata = { title: "Experiments | LiveDrop Arena" };

export default function ExperimentsPage() {
  return (
    <div>
      <PageHeader
        title="Experiments"
        description="Create studies, assign streamers, and monitor research progress."
        actions={
          <Link
            href="/researcher/experiments/new"
            className={cn(buttonVariants(), "bg-gradient-primary text-white hover:opacity-90")}
          >
            New Experiment
          </Link>
        }
      />

      {mockExperiments.length === 0 ? (
        <EmptyState
          icon={<FlaskConical className="size-5" />}
          title="No experiments yet"
          description="Create your first study to start assigning streamers and collecting research data."
          action={
            <Link href="/researcher/experiments/new" className={cn(buttonVariants(), "bg-gradient-primary text-white")}>
              New Experiment
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Conditions</TableHead>
                <TableHead>Participants</TableHead>
                <TableHead>Completion</TableHead>
                <TableHead>Ethics Ref</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockExperiments.map((exp) => (
                <TableRow key={exp.id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/researcher/experiments/${exp.id}`} className="font-medium hover:text-primary">
                      {exp.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={exp.status} />
                  </TableCell>
                  <TableCell>{exp.conditions.length}</TableCell>
                  <TableCell>{exp.participantCount.toLocaleString()}</TableCell>
                  <TableCell>{exp.completionRate}%</TableCell>
                  <TableCell>
                    {exp.ethicsApprovalRef ? (
                      <span className="font-mono text-xs">{exp.ethicsApprovalRef}</span>
                    ) : (
                      <span className="text-xs text-destructive">Not on file</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
