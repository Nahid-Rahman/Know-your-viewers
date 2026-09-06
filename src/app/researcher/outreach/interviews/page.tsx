import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getInterviewQueue, type InterviewQueueFilters } from "@/lib/queries/research";
import { InterviewFilters } from "@/features/outreach/interview-filters";
import { InterviewRow } from "@/features/outreach/interview-row";
import type { InterviewCandidateStatus } from "@/generated/prisma/enums";

export const metadata = { title: "Interviews | LiveDrop Arena" };

const PAGE_SIZE = 25;

export default async function InterviewsPage({
  searchParams,
}: PageProps<"/researcher/outreach/interviews">) {
  const sp = await searchParams;
  const get = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : undefined);

  const filters: InterviewQueueFilters = {
    q: get("q"),
    status: get("status") as InterviewCandidateStatus | undefined,
    page: get("page") ? Number(get("page")) : 1,
    pageSize: PAGE_SIZE,
  };

  const { rows, total, page, pageSize } = await getInterviewQueue(filters);

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const buildPageHref = (p: number) => {
    const params = new URLSearchParams(
      Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])),
    );
    params.set("page", String(p));
    return `/researcher/outreach/interviews?${params.toString()}`;
  };

  return (
    <div>
      <InterviewFilters />

      {rows.length === 0 ? (
        <EmptyState
          title="No interview candidates match these filters"
          description="Participants become interview candidates once they submit contact info."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Participant</TableHead>
                <TableHead>Streamer</TableHead>
                <TableHead>Invited</TableHead>
                <TableHead>Consent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Latest Interview</TableHead>
                <TableHead>Eligibility</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <InterviewRow key={row.participantId} row={row} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Showing {(page - 1) * pageSize + 1}&ndash;{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={buildPageHref(Math.max(page - 1, 1))}
              aria-disabled={page <= 1}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), page <= 1 && "pointer-events-none opacity-40")}
            >
              Previous
            </Link>
            <span>
              Page {page} of {totalPages}
            </span>
            <Link
              href={buildPageHref(Math.min(page + 1, totalPages))}
              aria-disabled={page >= totalPages}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                page >= totalPages && "pointer-events-none opacity-40",
              )}
            >
              Next
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
