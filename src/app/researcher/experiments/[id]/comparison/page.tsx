import { requireExperimentPage } from "@/lib/study/researcher";
import { prisma } from "@/lib/prisma";
import { formatStudyTime } from "@/lib/study/time";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/common/empty-state";

export const dynamic = "force-dynamic";

const ROWS: { key: string; label: string }[] = [
  { key: "durationMinutes", label: "Stream duration (min)" },
  { key: "views", label: "Views" },
  { key: "avgConcurrentViewers", label: "Avg concurrent viewers" },
  { key: "peakConcurrentViewers", label: "Peak concurrent viewers" },
  { key: "watchTimeMinutes", label: "Watch time (min)" },
  { key: "avgViewDurationSeconds", label: "Avg view duration (s)" },
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Comments / chat" },
  { key: "shares", label: "Shares" },
  { key: "newFollowers", label: "New followers" },
];

/**
 * Side-by-side platform metrics for normal (A) and study (B) sessions. Shows
 * the differences that limit comparison (length, game, measurement window)
 * and never derives website conversion rates for A sessions, which had no
 * website link. A difference between A and B is not attributable to the
 * reward alone: website availability and promotional cues differ too.
 */
export default async function ComparisonPage({ params }: PageProps<"/researcher/experiments/[id]/comparison">) {
  const { id } = await params;
  await requireExperimentPage(id);
  const sessions = await prisma.streamSession.findMany({
    where: { experimentId: id, status: { not: "ARCHIVED" } },
    include: {
      streamer: { select: { displayName: true } },
      platformMetrics: { orderBy: { measuredAt: "desc" }, take: 1 },
      _count: { select: { submissions: { where: { status: "CANONICAL" } } } },
    },
    orderBy: { createdAt: "asc" },
  });
  if (!sessions.length) return <EmptyState title="No sessions yet" description="Create sessions and record their platform metrics to compare them here." />;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Latest recorded platform measurement per session. Blank = not recorded (not zero). A and B sessions differ in website availability
        and promotional cues as well as rewards, so differences are not a causal effect of rewards alone.
      </p>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              {sessions.map((s) => (
                <TableHead key={s.id} className="min-w-44">
                  {s.sessionType === "STUDY" ? "B" : "A"} · {s.streamer.displayName}
                  <span className="block text-xs font-normal text-muted-foreground">{s.streamTitle ?? ""}</span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="text-muted-foreground">Game / content</TableCell>
              {sessions.map((s) => <TableCell key={s.id}>{s.gameName ?? "—"}</TableCell>)}
            </TableRow>
            <TableRow>
              <TableCell className="text-muted-foreground">Actual start → end (Dhaka)</TableCell>
              {sessions.map((s) => (
                <TableCell key={s.id} className="text-xs">{formatStudyTime(s.actualStartAt)} → {formatStudyTime(s.actualEndAt)}</TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="text-muted-foreground">Measurement source / window</TableCell>
              {sessions.map((s) => {
                const m = s.platformMetrics[0];
                return (
                  <TableCell key={s.id} className="text-xs">
                    {m ? `${m.source}; read ${formatStudyTime(m.measuredAt)}${m.windowStart ? `; window ${formatStudyTime(m.windowStart)} → ${formatStudyTime(m.windowEnd)}` : ""}` : "no metrics recorded"}
                  </TableCell>
                );
              })}
            </TableRow>
            {ROWS.map((r) => (
              <TableRow key={r.key}>
                <TableCell>{r.label}</TableCell>
                {sessions.map((s) => {
                  const v = (s.platformMetrics[0] as Record<string, unknown> | undefined)?.[r.key];
                  return <TableCell key={s.id}>{v === null || v === undefined ? "—" : String(v)}</TableCell>;
                })}
              </TableRow>
            ))}
            <TableRow>
              <TableCell>Website canonical submissions</TableCell>
              {sessions.map((s) => (
                <TableCell key={s.id}>{s.sessionType === "STUDY" ? s._count.submissions : "n/a (no website link)"}</TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="text-muted-foreground">Notes</TableCell>
              {sessions.map((s) => <TableCell key={s.id} className="text-xs">{s.platformMetrics[0]?.notes ?? s.notes ?? ""}</TableCell>)}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
