import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { researcherScope } from "@/lib/study/researcher";
import { listSupportRequests } from "@/lib/study/support-admin";
import { formatStudyTime } from "@/lib/study/time";
import { OpenSupportRequest } from "@/features/study-admin/support-request-open";

export const metadata = { title: "Support Requests | LiveDrop Arena" };
export const dynamic = "force-dynamic";

export default async function SupportRequestsPage() {
  const { user } = await researcherScope();
  const rows = await listSupportRequests(user);

  return (
    <div>
      <PageHeader
        title="Support Requests"
        description="Messages sent from the public Support page, newest first. Contact details and the message are encrypted — open a request to read it (each open is logged in the audit log)."
      />
      {rows.length === 0 ? (
        <EmptyState title="No support requests yet" description="Requests sent from the Support page will appear here." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Received (Dhaka)</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Response code</TableHead>
                <TableHead className="w-[45%]">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="align-top">
                  <TableCell className="text-xs whitespace-nowrap text-muted-foreground">{formatStudyTime(r.createdAt)}</TableCell>
                  <TableCell className="text-sm">{r.issueType}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {r.submission ? (
                      <Link href={`/researcher/submissions/${r.submission.id}`} className="hover:underline">
                        {r.responseCode}
                      </Link>
                    ) : (
                      (r.responseCode ?? "—")
                    )}
                    {r.submission?.isTest && <span className="ml-1 text-[10px] text-amber-300">TEST</span>}
                    {r.responseCode && !r.submission && (
                      <span className="block text-[10px] text-muted-foreground">no matching entry</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.purgedAt ? (
                      <span className="text-xs text-muted-foreground">Removed by retention</span>
                    ) : r.canOpen ? (
                      <OpenSupportRequest id={r.id} />
                    ) : (
                      <span className="text-xs text-muted-foreground">Contact access needed</span>
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
