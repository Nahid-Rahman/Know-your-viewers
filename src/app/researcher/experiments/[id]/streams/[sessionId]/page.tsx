import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/common/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireExperimentPage } from "@/lib/study/researcher";
import { getPolicies, getSessionDetail } from "@/lib/study/admin-queries";
import { durationSummary, phaseSplit, sessionFunnel, submissionSummary, trafficSeries, BUCKET_OPTIONS } from "@/lib/study/stats";
import { blockingPoliciesForLive, POLICY_DEFINITIONS } from "@/lib/study/policy";
import { entryState } from "@/lib/study/session-state";
import { formatStudyTime, toStudyLocalInput } from "@/lib/study/time";
import { parseRewardConfig } from "@/lib/study/reward";
import { DEFAULT_HOMEPAGE_CONTENT, homepageContentSchema } from "@/lib/study/sessions";
import {
  activateSessionAction,
  archiveSessionAction,
  closeSessionAction,
  createDefaultConfigAction,
  setCollectionModeAction,
} from "@/lib/actions/study-admin";
import { ActionButton } from "@/features/study-admin/action-button";
import { TimingForm } from "@/features/study-admin/timing-form";
import { SessionConfigEditor } from "@/features/study-admin/session-config-editor";
import { AnnotationForm, PlatformMetricForm } from "@/features/study-admin/session-records-forms";
import { TrafficChart } from "@/features/study-admin/traffic-chart";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-4 sm:p-5", className)}>
      <h2 className="mb-3 font-display text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

const pct = (x: number | null) => (x === null ? "—" : `${(x * 100).toFixed(1)}%`);
const secs = (x: number | null) => (x === null ? "—" : x < 90 ? `${Math.round(x)} s` : `${(x / 60).toFixed(1)} min`);

export default async function SessionDetailPage({ params, searchParams }: PageProps<"/researcher/experiments/[id]/streams/[sessionId]">) {
  const { id, sessionId } = await params;
  await requireExperimentPage(id);
  const sp = await searchParams;
  const session = await getSessionDetail(sessionId).catch(() => null);
  if (!session || session.experimentId !== id) notFound();

  const isStudy = session.sessionType === "STUDY";
  const bucket = Number(sp.bucket) || 5;
  const policies = await getPolicies(id);
  const records = policies.map((p) => ({ key: p.key, status: p.status, value: p.value }));
  const liveBlocking = blockingPoliciesForLive(records);
  const rewardApproved = records.find((r) => r.key === "REWARD_PRESENTATION")?.status === "APPROVED";
  const entry = entryState(session, new Date());

  const [funnel, summary, durations, phases, traffic] = isStudy
    ? await Promise.all([
        sessionFunnel(sessionId),
        submissionSummary({ streamSessionId: sessionId }),
        durationSummary(sessionId),
        phaseSplit(sessionId),
        trafficSeries(sessionId, bucket),
      ])
    : [null, null, null, null, null];

  const cfg = session.currentConfig;
  const homepage = cfg ? homepageContentSchema.safeParse(cfg.homepageContent) : null;
  const markers = [
    ...(session.actualStartAt ? [{ at: session.actualStartAt.toISOString(), label: "Stream start" }] : []),
    ...(session.actualEndAt ? [{ at: session.actualEndAt.toISOString(), label: "Stream end" }] : []),
    ...(session.entryDeadlineAt ? [{ at: session.entryDeadlineAt.toISOString(), label: "Entry deadline" }] : []),
    ...session.annotations.map((a) => ({ at: a.occurredAt.toISOString(), label: a.type.replace(/_/g, " ").toLowerCase() })),
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            <Link href={`/researcher/experiments/${id}/streams`} className="hover:text-foreground">Sessions</Link> / {session.streamer.displayName}
          </p>
          <h2 className="font-display text-2xl font-bold">
            {session.streamer.displayName}
            {session.streamTitle ? ` — ${session.streamTitle}` : ""}
          </h2>
          <div className="mt-1 flex flex-wrap gap-2">
            <StatusBadge status={session.status} />
            <StatusBadge status={session.collectionMode} />
            <span className="text-xs text-muted-foreground">{isStudy ? "B — Study session" : "A — Normal session (no website)"}</span>
          </div>
          {isStudy && session.status === "ACTIVE" && (
            <p className="mt-1 text-xs text-muted-foreground">
              {entry.accepting
                ? `Accepting entries${entry.deadline ? ` until ${formatStudyTime(entry.deadline)}` : " — no deadline until the actual end is recorded"}.`
                : "Entries are closed (deadline passed or closed manually)."}{" "}
              <Link href="/" target="_blank" className="underline">Open public page</Link>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {session.status === "DRAFT" && (
            <ActionButton
              action={setCollectionModeAction.bind(null, sessionId, session.collectionMode === "TEST" ? "LIVE" : "TEST")}
              label={session.collectionMode === "TEST" ? "Switch to LIVE mode" : "Switch to TEST mode"}
              confirmTitle={session.collectionMode === "TEST" ? "Switch to LIVE collection mode?" : "Switch to TEST mode?"}
              confirmText={
                session.collectionMode === "TEST"
                  ? "LIVE sessions collect real participant data and can only be activated once every required decision is approved and the ethics reference is recorded."
                  : "TEST sessions are marked as synthetic and never enter a live draw or research export."
              }
            />
          )}
          {isStudy && session.status === "DRAFT" && (
            <ActionButton
              action={activateSessionAction.bind(null, sessionId)}
              label="Activate (make public)"
              variant="default"
              confirmTitle="Make this the public session?"
              confirmText="The homepage will show this streamer's configuration to every visitor. Only one study session can be active at a time."
            />
          )}
          {session.status === "ACTIVE" && (
            <ActionButton
              action={closeSessionAction.bind(null, sessionId)}
              label="Close entries now"
              variant="destructive"
              confirmTitle="Close entries for this session?"
              confirmText="The public page will show a closed state. Closed sessions are not reopened."
              reasonLabel="Reason (optional)"
            />
          )}
          {(session.status === "CLOSED" || (session.status === "DRAFT" && !isStudy)) && (
            <ActionButton action={archiveSessionAction.bind(null, sessionId)} label="Archive" confirmTitle="Archive this session?" />
          )}
        </div>
      </div>

      {isStudy && session.collectionMode === "LIVE" && liveBlocking.length > 0 && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm">
          <p className="font-semibold">Live collection is blocked until these decisions are approved:</p>
          <ul className="mt-1 list-disc pl-5 text-muted-foreground">
            {liveBlocking.map((k) => (
              <li key={k}>{POLICY_DEFINITIONS[k].title}</li>
            ))}
          </ul>
          <Link href={`/researcher/experiments/${id}/policy`} className="mt-2 inline-block text-primary underline">Open study decisions</Link>
        </div>
      )}

      <Card title="Stream timing">
        <div className="grid gap-3 md:grid-cols-2">
          <TimingForm sessionId={sessionId} field="actualStartAt" label="Actual start" currentLocal={toStudyLocalInput(session.actualStartAt)} />
          <TimingForm
            sessionId={sessionId}
            field="actualEndAt"
            label="Actual end"
            currentLocal={toStudyLocalInput(session.actualEndAt)}
            help={isStudy ? "Entry deadline = actual end + 2 hours, enforced on the server." : undefined}
          />
        </div>
        <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Planned start</dt><dd>{formatStudyTime(session.streamStartTime)}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Planned end</dt><dd>{formatStudyTime(session.streamEndTime)}</dd></div>
          {isStudy && (
            <>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Entry deadline</dt><dd>{session.entryDeadlineAt ? formatStudyTime(session.entryDeadlineAt) : "Not finalized — record the actual end"}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Entries closed manually</dt><dd>{formatStudyTime(session.entriesClosedAt)}</dd></div>
            </>
          )}
        </dl>
        {session.timingChanges.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-muted-foreground">Timing change log ({session.timingChanges.length})</summary>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {session.timingChanges.map((c) => (
                <li key={c.id}>
                  {formatStudyTime(c.changedAt)} — {c.field}: {formatStudyTime(c.previousValue)} → {formatStudyTime(c.newValue)}
                  {c.reason ? ` (${c.reason})` : ""}
                </li>
              ))}
            </ul>
          </details>
        )}
      </Card>

      {isStudy && funnel && summary && durations && phases && traffic && (
        <Card title="Website activity">
          <p className="mb-3 text-xs text-muted-foreground">
            Stages count <strong>distinct visits</strong> that reached them. A visit ends after 30 minutes without activity; browsers are
            first-party identifiers, not people. Durations are last-observed estimates, not verified attention.
            {session.collectionMode === "TEST" ? " This is a TEST session — synthetic data." : ""}
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stage</TableHead>
                    <TableHead className="text-right">Visits</TableHead>
                    <TableHead className="text-right">of landing</TableHead>
                    <TableHead className="text-right">of previous</TableHead>
                    <TableHead className="text-right">Events</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>All visits ({funnel.estimatedBrowsers} browsers)</TableCell>
                    <TableCell className="text-right">{funnel.visits}</TableCell>
                    <TableCell /><TableCell /><TableCell />
                  </TableRow>
                  {funnel.stages.map((s) => (
                    <TableRow key={s.type}>
                      <TableCell>{s.label}</TableCell>
                      <TableCell className="text-right">{s.visits}</TableCell>
                      <TableCell className="text-right">{pct(s.ofLanding)}</TableCell>
                      <TableCell className="text-right">{pct(s.ofPrevious)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{funnel.eventTotals[s.type] ?? 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-border p-2"><p className="text-xl font-bold">{summary.saved}</p><p className="text-xs text-muted-foreground">saved submissions</p></div>
                <div className="rounded-lg border border-border p-2"><p className="text-xl font-bold">{summary.canonical}</p><p className="text-xs text-muted-foreground">canonical (valid)</p></div>
                <div className="rounded-lg border border-border p-2"><p className="text-xl font-bold">{summary.duplicates}</p><p className="text-xs text-muted-foreground">duplicates ({summary.distinctPhonesWithDuplicates} phones)</p></div>
              </div>
              <div>
                <p className="mb-1 font-medium">Optional fields (of {summary.optional.denominator} canonical submissions)</p>
                <p className="text-muted-foreground">
                  Email {summary.optional.email} · IGN {summary.optional.ign} · Social {summary.optional.social} (Discord {summary.optional.discord}, Facebook {summary.optional.facebook})
                </p>
              </div>
              <div>
                <p className="mb-1 font-medium">Age group (canonical submitters only)</p>
                <p className="text-muted-foreground">
                  Below 18: {summary.ageGroups.BELOW_18 ?? 0} (aggregate only) · 18–30: {summary.ageGroups.AGE_18_30 ?? 0} · 31+: {summary.ageGroups.AGE_31_PLUS ?? 0}
                </p>
              </div>
              <div>
                <p className="mb-1 font-medium">Visit duration (n = {durations.elapsed.n})</p>
                <p className="text-muted-foreground">
                  Elapsed median {secs(durations.elapsed.median)} · mean {secs(durations.elapsed.mean)} · p90 {secs(durations.elapsed.p90)}
                </p>
                <p className="text-muted-foreground">
                  Estimated visible median {secs(durations.active.median)} · mean {secs(durations.active.mean)} · p90 {secs(durations.active.p90)}
                </p>
              </div>
              <div>
                <p className="mb-1 font-medium">By stream phase (from recorded actual times)</p>
                <p className="text-muted-foreground">
                  Visits — pre {phases.visits.PRE_STREAM}, live {phases.visits.LIVE}, post {phases.visits.POST_STREAM}, unknown {phases.visits.UNKNOWN}
                </p>
                <p className="text-muted-foreground">
                  Canonical submissions — pre {phases.canonicalSubmissions.PRE_STREAM}, live {phases.canonicalSubmissions.LIVE}, post {phases.canonicalSubmissions.POST_STREAM}, unknown {phases.canonicalSubmissions.UNKNOWN}
                </p>
                {!phases.hasActualStart && <p className="text-xs text-amber-300">Record the actual start/end to split live vs post-stream traffic.</p>}
              </div>
              <Link href={`/researcher/submissions?experimentId=${id}&sessionId=${sessionId}&includeTest=1`} className="text-primary underline">
                View submissions for this session
              </Link>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">Traffic over time</span>
              {BUCKET_OPTIONS.map((b) => (
                <Link
                  key={b}
                  href={`?bucket=${b}`}
                  className={cn("rounded-md border px-2 py-0.5 text-xs", b === traffic.bucketMinutes ? "border-primary text-primary" : "border-border text-muted-foreground")}
                >
                  {b} min
                </Link>
              ))}
              {traffic.peak && (
                <span className="text-xs text-muted-foreground">
                  Peak: {traffic.peak.visits} visits started in the {traffic.bucketMinutes}-min bucket at {formatStudyTime(traffic.peak.bucket)}
                </span>
              )}
            </div>
            <TrafficChart series={traffic.series} markers={markers} />
          </div>
        </Card>
      )}

      {isStudy && !cfg && session.status !== "ARCHIVED" && (
        <Card title="Homepage & wheel configuration">
          <p className="mb-3 text-sm text-muted-foreground">
            This session was created before homepage configurations existed. Create one to set the streamer&apos;s name, photo and
            homepage text.
          </p>
          <ActionButton action={createDefaultConfigAction.bind(null, sessionId)} label="Create homepage configuration" variant="default" successMessage="Configuration created." />
        </Card>
      )}

      {isStudy && cfg && (
        <Card title={`Homepage & wheel configuration (current: v${cfg.version})`}>
          <SessionConfigEditor
            sessionId={sessionId}
            rewardPresentationApproved={rewardApproved}
            disabled={session.status === "ARCHIVED"}
            initial={{
              streamerDisplayName: cfg.streamerDisplayName,
              streamerImageUrl: cfg.streamerImageUrl ?? "",
              welcomeText: cfg.welcomeText,
              channelUrl: cfg.channelUrl ?? "",
              platform: cfg.platform ?? "",
              homepageContent: homepage?.success ? homepage.data : DEFAULT_HOMEPAGE_CONTENT,
              rewardConfig: parseRewardConfig(cfg.rewardConfig),
            }}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Versions: {session.configs.map((c) => `v${c.version} (${formatStudyTime(c.createdAt)}${c.createdBy ? `, ${c.createdBy.name}` : ""})`).join(" · ")}
          </p>
        </Card>
      )}

      <Card title="Annotations">
        <p className="mb-2 text-xs text-muted-foreground">Stream start/end, chat questions or answers, known link sharing. Shown on the traffic chart; they don&apos;t imply causation.</p>
        <ul className="mb-3 space-y-1 text-sm">
          {session.annotations.map((a) => (
            <li key={a.id}>
              <span className="text-muted-foreground">{formatStudyTime(a.occurredAt)}</span> · <StatusBadge status={a.type} /> {a.note}
            </li>
          ))}
          {session.annotations.length === 0 && <li className="text-muted-foreground">None yet.</li>}
        </ul>
        <AnnotationForm sessionId={sessionId} />
      </Card>

      <Card title="Platform metrics (entered or imported)">
        <p className="mb-2 text-xs text-muted-foreground">
          Measured by the streaming platform, not this website — kept separate from website metrics. Missing values stay missing.
        </p>
        {session.platformMetrics.length > 0 && (
          <div className="mb-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Read at</TableHead><TableHead>Source</TableHead><TableHead>Window</TableHead>
                  <TableHead className="text-right">Duration</TableHead><TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Avg CCV</TableHead><TableHead className="text-right">Peak CCV</TableHead>
                  <TableHead className="text-right">Watch time</TableHead><TableHead className="text-right">Comments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {session.platformMetrics.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs">{formatStudyTime(m.measuredAt)}</TableCell>
                    <TableCell className="text-xs">{m.platform} · {m.source}</TableCell>
                    <TableCell className="text-xs">{m.windowStart ? `${formatStudyTime(m.windowStart)} → ${formatStudyTime(m.windowEnd)}` : "—"}</TableCell>
                    <TableCell className="text-right">{m.durationMinutes ?? "—"}</TableCell>
                    <TableCell className="text-right">{m.views ?? "—"}</TableCell>
                    <TableCell className="text-right">{m.avgConcurrentViewers ?? "—"}</TableCell>
                    <TableCell className="text-right">{m.peakConcurrentViewers ?? "—"}</TableCell>
                    <TableCell className="text-right">{m.watchTimeMinutes ?? "—"}</TableCell>
                    <TableCell className="text-right">{m.comments ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <PlatformMetricForm sessionId={sessionId} defaultPlatform={session.platform ?? session.streamer.platform} />
      </Card>

      {isStudy && session.trackingLinks.length > 0 && (
        <Card title="Tracking links for this session">
          <ul className="space-y-1 text-sm">
            {session.trackingLinks.map((l) => (
              <li key={l.id}>
                <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">/api/t/{l.uniqueCode}</code> · {l.entrySource}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Links of other (older) sessions are recorded as stale and are not credited to this one.</p>
        </Card>
      )}
    </div>
  );
}
