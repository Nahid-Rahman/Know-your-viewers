import { notFound } from "next/navigation";
import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/common/empty-state";
import { getExperimentById, getParticipantRows } from "@/lib/mock/research";

function Tick({ value }: { value: boolean | null }) {
  if (value === null) return <MinusCircle className="size-4 text-muted-foreground/40" />;
  return value ? (
    <CheckCircle2 className="size-4 text-accent-green" />
  ) : (
    <XCircle className="size-4 text-muted-foreground/40" />
  );
}

export default async function ParticipantsPage({
  params,
}: PageProps<"/researcher/experiments/[id]/participants">) {
  const { id } = await params;
  const experiment = getExperimentById(id);
  if (!experiment) notFound();

  const rows = getParticipantRows(id);

  return (
    <div>
      <p className="mb-4 rounded-lg border border-accent-cyan/25 bg-accent-cyan/10 p-3 text-xs text-accent-cyan">
        Participants are identified only by anonymous code. Contact details are stored
        separately, encrypted, and are never shown in this view.
      </p>

      {rows.length === 0 ? (
        <EmptyState title="No participants yet" description="Participant activity will appear here once the tracking link is live." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Anonymous Code</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Consent</TableHead>
                <TableHead className="text-center">Spun</TableHead>
                <TableHead className="text-center">Submitted Contact</TableHead>
                <TableHead className="text-center">Debriefed</TableHead>
                <TableHead className="text-center">Research Permission</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.anonymousCode}>
                  <TableCell className="font-mono text-xs">{r.anonymousCode}</TableCell>
                  <TableCell className="text-sm">{r.conditionName}</TableCell>
                  <TableCell className="text-sm">{r.consentStatus.toLowerCase()}</TableCell>
                  <TableCell className="text-center"><Tick value={r.spun} /></TableCell>
                  <TableCell className="text-center"><Tick value={r.submittedContact} /></TableCell>
                  <TableCell className="text-center"><Tick value={r.debriefed} /></TableCell>
                  <TableCell className="text-center"><Tick value={r.permissionGiven} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
