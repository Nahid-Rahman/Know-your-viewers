import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
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
import { requireRoleOrRedirect } from "@/lib/auth";
import {
  getParticipantRows,
  getStreamers,
  getExperimentById,
  RECRUITMENT_SOURCE_LABELS,
  type ParticipantListFilters,
} from "@/lib/queries/research";
import { ParticipantFilters } from "@/features/participant/participant-filters";
import type { DebriefStatus, InterviewCandidateStatus } from "@/generated/prisma/enums";

export const metadata = { title: "Participants | LiveDrop Arena" };

const PAGE_SIZE = 25;

export default async function ParticipantsPage({
  searchParams,
}: PageProps<"/researcher/participants">) {
  await requireRoleOrRedirect("RESEARCHER");
  const sp = await searchParams;
  const get = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : undefined);

  const filters: ParticipantListFilters = {
    q: get("q"),
    experimentId: get("experimentId"),
    streamerId: get("streamerId"),
    entrySource: get("entrySource") as ParticipantListFilters["entrySource"],
    studyStatus: get("studyStatus") as ParticipantListFilters["studyStatus"],
    contactSubmitted: get("contactSubmitted") === "true" ? true : get("contactSubmitted") === "false" ? false : undefined,
    debriefStatus: get("debriefStatus") as DebriefStatus | undefined,
    dataUsePermission: get("dataUsePermission") as ParticipantListFilters["dataUsePermission"],
    interviewStatus: get("interviewStatus") as InterviewCandidateStatus | undefined,
    eligibility: get("eligibility") as ParticipantListFilters["eligibility"],
    from: get("from"),
    to: get("to"),
    page: get("page") ? Number(get("page")) : 1,
    pageSize: PAGE_SIZE,
  };

  const [{ rows, total, page, pageSize }, streamers, scopedExperiment] = await Promise.all([
    getParticipantRows(filters),
    getStreamers(),
    filters.experimentId ? getExperimentById(filters.experimentId) : Promise.resolve(null),
  ]);

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const buildPageHref = (p: number) => {
    const params = new URLSearchParams(
      Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])),
    );
    params.set("page", String(p));
    return `/researcher/participants?${params.toString()}`;
  };

  return (
    <div>
      <PageHeader
        title="Participants"
        description="Every participant's recruitment source, funnel progress, and follow-up status in one place."
      />

      {scopedExperiment && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs text-primary">
          Filtered to <span className="font-semibold">{scopedExperiment.title}</span>
          <Link href="/researcher/participants" className="ml-auto underline">
            Clear
          </Link>
        </div>
      )}

      <ParticipantFilters streamers={streamers} />

      {rows.length === 0 ? (
        <EmptyState
          title="No participants match these filters"
          description="Try widening the filters, or check back once more participants arrive."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Participant</TableHead>
                <TableHead>Streamer</TableHead>
                <TableHead>Stream</TableHead>
                <TableHead>Entry Source</TableHead>
                <TableHead>First Visit</TableHead>
                <TableHead>Current Stage</TableHead>
                <TableHead>Study Status</TableHead>
                <TableHead className="text-center">Contact</TableHead>
                <TableHead>Debrief</TableHead>
                <TableHead>Data Use</TableHead>
                <TableHead>Interview</TableHead>
                <TableHead>Eligibility</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-secondary/30">
                  <TableCell className="font-mono text-xs">
                    <Link href={`/researcher/participants/${r.id}`} className="hover:underline">
                      {r.anonymousCode}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.streamerName ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.streamSessionTitle ?? "—"}</TableCell>
                  <TableCell className="text-sm">{RECRUITMENT_SOURCE_LABELS[r.entrySource]}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(r.firstVisit).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm">{r.currentStage}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.studyStatus === "completed" ? "COMPLETED" : "DROPPED"} />
                  </TableCell>
                  <TableCell className="text-center">{r.contactSubmitted ? "✓" : "—"}</TableCell>
                  <TableCell><StatusBadge status={r.debriefStatus} /></TableCell>
                  <TableCell>
                    <StatusBadge
                      status={
                        r.dataUsePermission === "yes"
                          ? "GRANTED"
                          : r.dataUsePermission === "no"
                            ? "DECLINED"
                            : r.dataUsePermission === "withdrawn"
                              ? "WITHDRAWN"
                              : "PENDING"
                      }
                    />
                  </TableCell>
                  <TableCell><StatusBadge status={r.interviewStatus} /></TableCell>
                  <TableCell>
                    <StatusBadge status={r.eligibility === "eligible" ? "ELIGIBLE" : "EXCLUDED"} />
                  </TableCell>
                </TableRow>
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
