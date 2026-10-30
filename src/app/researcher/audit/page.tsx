import { PageHeader } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { researcherScope } from "@/lib/study/researcher";
import { getAuditEntries } from "@/lib/study/admin-queries";
import { formatStudyTime } from "@/lib/study/time";

export const metadata = { title: "Audit Log | LiveDrop Arena" };
export const dynamic = "force-dynamic";

/** Administrative actions on the researcher's campaigns (latest 300). Never contains contact values. */
export default async function AuditPage() {
  const { user, scope } = await researcherScope();
  const entries = await getAuditEntries({ OR: [{ experimentId: { in: scope } }, { actorId: user.id }] }, 300);
  return (
    <div>
      <PageHeader title="Audit log" description="Contact reveals, exports, permission records, timing corrections, draws, payouts and other administrative actions." />
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When (Dhaka)</TableHead>
              <TableHead>Who</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Record</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-xs whitespace-nowrap">{formatStudyTime(e.createdAt)}</TableCell>
                <TableCell className="text-xs">{e.actor?.name ?? "system"}</TableCell>
                <TableCell className="text-xs font-medium">{e.action.replace(/_/g, " ").toLowerCase()}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {e.entityType}
                  {e.entityId ? ` ${e.entityId.slice(0, 8)}` : ""}
                </TableCell>
                <TableCell className="max-w-md truncate font-mono text-[11px] text-muted-foreground" title={JSON.stringify(e.detail)}>
                  {e.detail ? JSON.stringify(e.detail) : ""}
                </TableCell>
              </TableRow>
            ))}
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-sm text-muted-foreground">No entries yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
