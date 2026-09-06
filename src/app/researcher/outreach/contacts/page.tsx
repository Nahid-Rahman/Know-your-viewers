import { EmptyState } from "@/components/common/empty-state";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getContactQueue, getResearchers, type ContactQueueFilters } from "@/lib/queries/research";
import { ContactFilters } from "@/features/outreach/contact-filters";
import { ContactRow } from "@/features/outreach/contact-row";
import type { ContactStatus } from "@/generated/prisma/enums";

export const metadata = { title: "Contacts | LiveDrop Arena" };

const PAGE_SIZE = 25;

export default async function ContactsPage({
  searchParams,
}: PageProps<"/researcher/outreach/contacts">) {
  const sp = await searchParams;
  const get = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : undefined);

  const filters: ContactQueueFilters = {
    q: get("q"),
    contactStatus: get("contactStatus") as ContactStatus | undefined,
    researcherAssignedId: get("researcherAssignedId"),
    overdueFollowup: get("overdueFollowup") === "true",
    page: get("page") ? Number(get("page")) : 1,
    pageSize: PAGE_SIZE,
  };

  const [{ rows, total, page, pageSize }, researchers] = await Promise.all([
    getContactQueue(filters),
    getResearchers(),
  ]);

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const buildPageHref = (p: number) => {
    const params = new URLSearchParams(
      Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])),
    );
    params.set("page", String(p));
    return `/researcher/outreach/contacts?${params.toString()}`;
  };

  return (
    <div>
      <ContactFilters researchers={researchers} />

      {rows.length === 0 ? (
        <EmptyState
          title="No contacts match these filters"
          description="Participants appear here once they submit their contact info to claim a reward."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Participant</TableHead>
                <TableHead>Streamer</TableHead>
                <TableHead>Prize</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Next Follow-up</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Prize Fulfillment</TableHead>
                <TableHead>Contact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <ContactRow key={row.participantId} row={row} researchers={researchers} />
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
