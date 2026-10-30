import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { researcherScope } from "@/lib/study/researcher";
import { listSubmissions, SUBMISSION_PAGE_SIZE, type SubmissionListFilters } from "@/lib/study/admin-queries";
import { currentPermissions } from "@/lib/study/submission-admin";
import { AGE_GROUP_LABELS, AGE_GROUP_OPTIONS } from "@/lib/study/constants";
import { formatStudyTime } from "@/lib/study/time";
import { QueryFilters, type FilterDef } from "@/features/study-admin/query-filters";

export const metadata = { title: "Submissions | LiveDrop Arena" };
export const dynamic = "force-dynamic";

export default async function SubmissionsPage({ searchParams }: PageProps<"/researcher/submissions">) {
  const { scope } = await researcherScope();
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const filters: SubmissionListFilters = {
    scope,
    q: get("q"),
    experimentId: get("experimentId"),
    sessionId: get("sessionId"),
    streamerId: get("streamerId"),
    view: (get("view") as SubmissionListFilters["view"]) ?? "valid",
    includeTest: get("includeTest") === "1",
    ageGroup: get("ageGroup") as SubmissionListFilters["ageGroup"],
    permission: get("permission") as SubmissionListFilters["permission"],
    followUp: get("followUp"),
    research: get("research") as SubmissionListFilters["research"],
    winner: get("winner") as SubmissionListFilters["winner"],
    payout: get("payout") as SubmissionListFilters["payout"],
    from: get("from"),
    to: get("to"),
    page: Number(get("page")) || 1,
  };

  const [{ rows, total, page }, experiments, sessions] = await Promise.all([
    listSubmissions(filters),
    prisma.experiment.findMany({ where: { id: { in: scope } }, select: { id: true, title: true }, orderBy: { createdAt: "desc" } }),
    prisma.streamSession.findMany({
      where: { experimentId: { in: scope }, sessionType: "STUDY" },
      select: { id: true, streamTitle: true, streamer: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const streamers = [...new Map(sessions.map((s) => [s.streamer.id, s.streamer])).values()];

  const defs: FilterDef[] = [
    { key: "q", label: "Response code", type: "text", placeholder: "LD-XXXX-XXXX" },
    { key: "view", label: "Entries", type: "select", anyLabel: "Valid (canonical)", options: [{ value: "duplicates", label: "Duplicates only" }, { value: "all", label: "All saved" }] },
    { key: "experimentId", label: "Campaign", type: "select", options: experiments.map((e) => ({ value: e.id, label: e.title })) },
    { key: "sessionId", label: "Session", type: "select", options: sessions.map((s) => ({ value: s.id, label: `${s.streamer.displayName}${s.streamTitle ? ` — ${s.streamTitle}` : ""}` })) },
    { key: "streamerId", label: "Streamer", type: "select", options: streamers.map((s) => ({ value: s.id, label: s.displayName })) },
    { key: "ageGroup", label: "Age group", type: "select", options: AGE_GROUP_OPTIONS.map((o) => ({ value: o.value, label: o.label })) },
    { key: "permission", label: "Website-data permission", type: "select", options: ["PENDING", "GRANTED", "DECLINED", "WITHDRAWN"].map((v) => ({ value: v, label: v.toLowerCase() })) },
    { key: "followUp", label: "Follow-up", type: "select", options: ["NOT_CONTACTED", "ATTEMPTING", "REACHED", "INTERVIEW_COMPLETED", "DECLINED_INTERVIEW", "UNREACHABLE"].map((v) => ({ value: v, label: v.replace(/_/g, " ").toLowerCase() })) },
    { key: "research", label: "Research eligibility", type: "select", options: [{ value: "eligible", label: "Not excluded" }, { value: "excluded", label: "Excluded / purged" }] },
    { key: "winner", label: "Draw", type: "select", options: [{ value: "winner", label: "Winners" }, { value: "not_winner", label: "Not winners" }] },
    { key: "payout", label: "Payout", type: "select", options: ["PENDING", "PAID", "FAILED", "UNREACHABLE"].map((v) => ({ value: v, label: v.toLowerCase() })) },
    { key: "from", label: "From (Dhaka date)", type: "date" },
    { key: "to", label: "To (Dhaka date)", type: "date" },
    { key: "includeTest", label: "Include TEST data", type: "checkbox" },
  ];

  const totalPages = Math.max(Math.ceil(total / SUBMISSION_PAGE_SIZE), 1);
  const href = (p: number) => {
    const params = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
    params.set("page", String(p));
    return `/researcher/submissions?${params.toString()}`;
  };

  return (
    <div>
      <PageHeader
        title="Submissions"
        description="Every saved entry from the revised study flow. Valid (canonical) entries are shown by default; duplicates are kept and listed separately. Phone numbers are masked — reveal them from a submission's detail page (audited)."
      />
      <QueryFilters defs={defs} />
      {rows.length === 0 ? (
        <EmptyState title="No submissions match" description="Widen the filters, or include TEST data to see synthetic entries." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Submitted (Dhaka)</TableHead>
                <TableHead>Streamer / session</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Original</TableHead>
                <TableHead>Research</TableHead>
                <TableHead>Data use</TableHead>
                <TableHead>Follow-up</TableHead>
                <TableHead>Draw</TableHead>
                <TableHead>Payout</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => {
                const perm = currentPermissions(s.permissions);
                const win = s.drawWins[0];
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">
                      <Link href={`/researcher/submissions/${s.id}`} className="hover:underline">{s.responseCode}</Link>
                      {s.isTest && <span className="ml-1 text-[10px] text-amber-300">TEST</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatStudyTime(s.submittedAt)}</TableCell>
                    <TableCell className="text-xs">
                      {s.streamSession.streamer.displayName}
                      {s.streamSession.streamTitle ? <span className="block text-muted-foreground">{s.streamSession.streamTitle}</span> : null}
                    </TableCell>
                    <TableCell className="text-xs">{AGE_GROUP_LABELS[s.ageGroup]}</TableCell>
                    <TableCell><StatusBadge status={s.status} /></TableCell>
                    <TableCell className="font-mono text-xs">{s.canonical?.responseCode ?? "—"}</TableCell>
                    <TableCell>
                      {s.researchExcluded || s.researchDataPurgedAt ? (
                        <span title={s.researchExclusionReason ?? "research data purged"}><StatusBadge status="EXCLUDED" /></span>
                      ) : (
                        <StatusBadge status="ELIGIBLE" />
                      )}
                    </TableCell>
                    <TableCell><StatusBadge status={perm.WEBSITE_DATA_USE} /></TableCell>
                    <TableCell><StatusBadge status={s.followUp?.status ?? "NOT_CONTACTED"} /></TableCell>
                    <TableCell>{win ? <StatusBadge status="WINNER" /> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{win ? <StatusBadge status={win.payoutStatus} /> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      {total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <p>
            {(page - 1) * SUBMISSION_PAGE_SIZE + 1}&ndash;{Math.min(page * SUBMISSION_PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Link href={href(Math.max(page - 1, 1))} className={cn(buttonVariants({ variant: "outline", size: "sm" }), page <= 1 && "pointer-events-none opacity-40")}>Previous</Link>
            <span>Page {page} of {totalPages}</span>
            <Link href={href(Math.min(page + 1, totalPages))} className={cn(buttonVariants({ variant: "outline", size: "sm" }), page >= totalPages && "pointer-events-none opacity-40")}>Next</Link>
          </div>
        </div>
      )}
    </div>
  );
}
