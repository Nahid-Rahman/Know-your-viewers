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
import { getDebriefQueue, type DebriefQueueFilters } from "@/lib/queries/research";
import { DebriefFilters } from "@/features/outreach/debrief-filters";
import { DebriefRow } from "@/features/outreach/debrief-row";
import type { DebriefStatus } from "@/generated/prisma/enums";

export const metadata = { title: "Debrief | LiveDrop Arena" };

const PAGE_SIZE = 25;

export default async function DebriefQueuePage({
  searchParams,
}: PageProps<"/researcher/outreach/debrief">) {
  const sp = await searchParams;
  const get = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : undefined);

  const filters: DebriefQueueFilters = {
    q: get("q"),
    debriefStatus: get("debriefStatus") as DebriefStatus | undefined,
    page: get("page") ? Number(get("page")) : 1,
    pageSize: PAGE_SIZE,
  };

  const { rows, total, page, pageSize } = await getDebriefQueue(filters);

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const buildPageHref = (p: number) => {
    const params = new URLSearchParams(
      Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])),
    );
    params.set("page", String(p));
    return `/researcher/outreach/debrief?${params.toString()}`;
  };

  return (
    <div>
      <DebriefFilters />

      {rows.length === 0 ? (
        <EmptyState
          title="Debrief queue is empty"
          description="Every reachable participant has either finished the on-page debrief themselves or already been marked resolved here."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Participant</TableHead>
                <TableHead>Streamer</TableHead>
                <TableHead>Contact Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Debrief Status</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <DebriefRow key={row.participantId} row={row} />
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
