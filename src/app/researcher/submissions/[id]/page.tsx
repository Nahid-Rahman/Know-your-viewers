import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/common/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { researcherScope } from "@/lib/study/researcher";
import { getAuditEntries, getSubmissionDetail, getVisitTimeline } from "@/lib/study/admin-queries";
import { currentPermissions } from "@/lib/study/submission-admin";
import { AGE_GROUP_LABELS } from "@/lib/study/constants";
import { maskPhone } from "@/lib/study/phone";
import { analyticsPhase } from "@/lib/study/session-state";
import { formatStudyTime, toStudyLocalInput } from "@/lib/study/time";
import { promoteDuplicateAction } from "@/lib/actions/study-admin";
import { ActionButton } from "@/features/study-admin/action-button";
import {
  AttemptForm,
  DrawExclusionForm,
  FollowUpForm,
  InterviewForm,
  PermissionForm,
  PurgeResearchData,
  ResearchExclusionForm,
  RevealContact,
} from "@/features/study-admin/submission-forms";

export const dynamic = "force-dynamic";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <h2 className="mb-3 font-display text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-1.5 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

const ATTRIBUTION_LABELS: Record<string, string> = {
  TRACKING_LINK: "Tracking link of this session",
  ACTIVE_SESSION: "Active-session default (no link code)",
  STALE_TRACKING_LINK: "Old link of another session (not credited)",
  UNKNOWN_TRACKING_CODE: "Unknown link code",
};

export default async function SubmissionDetailPage({ params }: PageProps<"/researcher/submissions/[id]">) {
  const { id } = await params;
  const { scope } = await researcherScope();
  const { scope: contactScope } = await researcherScope("contact");
  const { scope: writeScope } = await researcherScope("write");
  const s = await getSubmissionDetail(id).catch(() => null);
  if (!s || !scope.includes(s.experimentId)) notFound();
  const canContact = contactScope.includes(s.experimentId);
  const canWrite = writeScope.includes(s.experimentId);

  const [timeline, auditEntries, researchers] = await Promise.all([
    getVisitTimeline(s.visitId),
    getAuditEntries({ entityType: "Submission", entityId: s.id }),
    prisma.user.findMany({ where: { role: "RESEARCHER" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const perms = currentPermissions(s.permissions);
  const checks: [string, boolean][] = [
    ["Canonical (not a duplicate)", s.status === "CANONICAL"],
    ["Live data (not TEST)", !s.isTest],
    ["Adult age group (detailed under-18 records are excluded)", s.ageGroup !== "BELOW_18"],
    ["Website-data use GRANTED", perms.WEBSITE_DATA_USE === "GRANTED"],
    ["Not manually excluded", !s.researchExcluded],
    ["Research data not purged", !s.researchDataPurgedAt],
  ];
  const researchEligible = checks.every(([, ok]) => ok);
  const win = s.drawWins.find((w) => w.draw.status === "FINALIZED");

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-muted-foreground">
          <Link href="/researcher/submissions" className="hover:text-foreground">Submissions</Link> / {s.responseCode}
        </p>
        <h1 className="font-display text-2xl font-bold">
          <span className="font-mono">{s.responseCode}</span>
        </h1>
        <div className="mt-1 flex flex-wrap gap-2">
          <StatusBadge status={s.status} />
          {s.isTest && <StatusBadge status="TEST" />}
          {win && <StatusBadge status="WINNER" />}
        </div>
      </div>

      {s.status === "DUPLICATE" && s.canonical && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm">
          Duplicate of{" "}
          <Link href={`/researcher/submissions/${s.canonical.id}`} className="font-mono underline">{s.canonical.responseCode}</Link> (same normalized phone
          in this campaign, submitted {formatStudyTime(s.canonical.submittedAt)}). Saved for review and duplicate statistics; excluded from valid counts,
          research exports and the draw. A phone match is an operational rule, not proof of the same person.
          {canContact && (
            <div className="mt-2">
              <ActionButton
                action={promoteDuplicateAction.bind(null, s.id)}
                label="Make this the canonical entry…"
                confirmTitle="Correct the canonical entry?"
                confirmText="The current canonical entry becomes a duplicate of this one. Use only for a documented correction; it's blocked after a finalized draw."
                reasonLabel="Reason (required, recorded)"
                reasonRequired
              />
            </div>
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Submission">
          <dl>
            <Row label="Submitted">{formatStudyTime(s.submittedAt)}</Row>
            <Row label="Campaign">{s.experiment.title}</Row>
            <Row label="Streamer / session">
              <Link href={`/researcher/experiments/${s.experimentId}/streams/${s.streamSessionId}`} className="hover:underline">
                {s.streamSession.streamer.displayName}{s.streamSession.streamTitle ? ` — ${s.streamSession.streamTitle}` : ""}
              </Link>
            </Row>
            <Row label="Stream phase">{analyticsPhase(s.streamSession, s.submittedAt).replace("_", " ").toLowerCase()}</Row>
            <Row label="Page configuration">v{s.config.version}</Row>
            <Row label="Age group">{AGE_GROUP_LABELS[s.ageGroup]}</Row>
            <Row label="Phone">{s.contact?.phonePurgedAt ? "removed" : maskPhone(s.contact?.phoneTail)}</Row>
            <Row label="Email / IGN / social">
              {[s.emailProvided && "email", s.ignProvided && "IGN", s.socialProvided && (s.socialType === "DISCORD" ? "Discord" : "Facebook")]
                .filter(Boolean)
                .join(", ") || "none supplied"}
              {s.contact?.optionalPurgedAt ? " (values removed)" : ""}
            </Row>
            <Row label="Wheel result">{s.spinOutcome ? `${s.spinOutcome.resultLabel} (${s.spinOutcome.mechanism.toLowerCase()})` : "no spin"}</Row>
          </dl>
          {s.duplicates.length > 0 && (
            <p className="mt-3 text-sm">
              Later duplicates:{" "}
              {s.duplicates.map((d, i) => (
                <span key={d.id}>
                  {i > 0 && ", "}
                  <Link href={`/researcher/submissions/${d.id}`} className="font-mono underline">{d.responseCode}</Link>
                </span>
              ))}
            </p>
          )}
          {canContact && (
            <div className="mt-4">
              <RevealContact submissionId={s.id} />
            </div>
          )}
        </Section>

        <Section title="Attribution (provenance)">
          <dl>
            <Row label="Source">{ATTRIBUTION_LABELS[s.attributionSource]}</Row>
            <Row label="Tracking link">{s.trackingLink ? `${s.trackingLink.uniqueCode} (${s.trackingLink.entrySource})` : "—"}</Row>
            <Row label="Received link code">{s.visit.receivedRefCode ?? "—"}</Row>
            <Row label="Referrer host">{s.visit.referrerHost ?? "none sent"}</Row>
            <Row label="Visit started">{formatStudyTime(s.visit.startedAt)}</Row>
            <Row label="Visit last seen">{formatStudyTime(s.visit.lastSeenAt)}</Row>
            <Row label="Estimated visible time">{Math.round(s.visit.activeMs / 1000)} s</Row>
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">
            Session attribution isn&apos;t proof the person came from the livestream — referrers can be absent and links can be shared.
          </p>
        </Section>
      </div>

      <Section title="Research eligibility">
        <ul className="mb-3 space-y-1 text-sm">
          {checks.map(([label, ok]) => (
            <li key={label} className={ok ? "text-accent-green" : "text-muted-foreground"}>
              {ok ? "✓" : "✗"} {label}
            </li>
          ))}
        </ul>
        <p className="mb-3 text-sm">
          Result: <StatusBadge status={researchEligible ? "ELIGIBLE" : "EXCLUDED"} />
          {s.researchExcluded && ` (manual: ${s.researchExclusionReason?.replace(/_/g, " ").toLowerCase()}${s.researchExclusionNote ? ` — ${s.researchExclusionNote}` : ""})`}
        </p>
        {canWrite && <ResearchExclusionForm submissionId={s.id} excluded={s.researchExcluded} />}
        {canContact && (perms.WEBSITE_DATA_USE === "DECLINED" || perms.WEBSITE_DATA_USE === "WITHDRAWN") && !s.researchDataPurgedAt && (
          <div className="mt-3">
            <PurgeResearchData submissionId={s.id} />
          </div>
        )}
      </Section>

      <Section title="Permissions">
        <div className="mb-3 flex flex-wrap gap-4 text-sm">
          <span>Proceed with interview: <StatusBadge status={perms.INTERVIEW_PROCEED} /></span>
          <span>Website data use: <StatusBadge status={perms.WEBSITE_DATA_USE} /></span>
          <span>Interview answers use: <StatusBadge status={perms.INTERVIEW_ANSWERS_USE} /></span>
        </div>
        <p className="mb-2 text-xs text-muted-foreground">
          Each permission is recorded separately with its script version — one answer is never copied into another. A later interview
          permission is not a substitute for the approved initial collection procedure. Unreachable people stay pending.
        </p>
        {s.permissions.length > 0 && (
          <div className="mb-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead><TableHead>Type</TableHead><TableHead>Decision</TableHead>
                  <TableHead>Script</TableHead><TableHead>Method</TableHead><TableHead>By</TableHead><TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.permissions.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs">{formatStudyTime(p.recordedAt)}</TableCell>
                    <TableCell className="text-xs">{p.type.replace(/_/g, " ").toLowerCase()}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell className="text-xs">{p.noticeVersion}</TableCell>
                    <TableCell className="text-xs">{p.method.replace("_", " ").toLowerCase()}</TableCell>
                    <TableCell className="text-xs">{p.recordedBy.name}</TableCell>
                    <TableCell className="text-xs">{p.note ?? ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {canWrite && <PermissionForm submissionId={s.id} />}
      </Section>

      <Section title="Follow-up and interviews">
        {canWrite && (
          <FollowUpForm
            submissionId={s.id}
            researchers={researchers}
            initial={{
              status: s.followUp?.status ?? "NOT_CONTACTED",
              assignedToId: s.followUp?.assignedToId ?? null,
              nextFollowupAt: toStudyLocalInput(s.followUp?.nextFollowupAt),
              notes: s.followUp?.notes ?? "",
            }}
          />
        )}
        <h3 className="mt-4 mb-2 text-sm font-semibold">Contact attempts</h3>
        <ul className="mb-2 space-y-1 text-sm">
          {s.attempts.map((a) => (
            <li key={a.id} className="text-muted-foreground">
              {formatStudyTime(a.attemptedAt)} · {a.outcome.replace(/_/g, " ").toLowerCase()} via {a.method.replace("_", " ").toLowerCase()} · {a.researcher.name}
              {a.note ? ` — ${a.note}` : ""}
            </li>
          ))}
          {s.attempts.length === 0 && <li className="text-muted-foreground">None.</li>}
        </ul>
        {canWrite && <AttemptForm submissionId={s.id} />}
        <h3 className="mt-4 mb-2 text-sm font-semibold">Interviews</h3>
        <ul className="mb-2 space-y-2 text-sm">
          {s.interviews.map((i) => (
            <li key={i.id} className="rounded-lg border border-border p-2">
              <StatusBadge status={i.status} /> {i.mode.replace("_", " ").toLowerCase()} · {formatStudyTime(i.scheduledAt)} · {i.durationMinutes ?? "?"} min ·
              script {i.scriptVersion ?? "—"} · {i.interviewer.name}
              {i.themes.length > 0 && <p className="text-xs text-muted-foreground">Themes: {i.themes.join(", ")}</p>}
              {i.summary && <p className="mt-1 text-xs">{i.summary}</p>}
            </li>
          ))}
          {s.interviews.length === 0 && <li className="text-muted-foreground">None.</li>}
        </ul>
        {canWrite && <InterviewForm submissionId={s.id} />}
      </Section>

      <Section title="Reward">
        <dl className="mb-3">
          <Row label="Draw eligibility">
            {s.status !== "CANONICAL" ? "not eligible (duplicate)" : s.isTest ? "test draws only" : s.drawExcluded ? `excluded — ${s.drawExclusionNote ?? ""}` : "eligible"}
          </Row>
          <Row label="Winner">{win ? `Yes — rank ${win.rank} (${formatStudyTime(win.draw.executedAt)})` : "No finalized win"}</Row>
          {win && <Row label="Payout">{`${win.payoutStatus.toLowerCase()}${win.paymentRef ? ` · ref ${win.paymentRef}` : ""}${win.paidAt ? ` · ${formatStudyTime(win.paidAt)}` : ""}`}</Row>}
        </dl>
        <p className="mb-2 text-xs text-muted-foreground">Research permission, interview participation and optional fields don&apos;t affect draw eligibility.</p>
        {canContact && s.status === "CANONICAL" && <DrawExclusionForm submissionId={s.id} excluded={s.drawExcluded} />}
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Visit event timeline">
          <ol className="max-h-80 space-y-1 overflow-y-auto text-xs">
            {timeline.map((e) => (
              <li key={e.id} className="flex justify-between gap-2">
                <span>
                  {e.type.replace(/_/g, " ").toLowerCase()}
                  {e.element ? ` · ${e.element}` : ""}
                  {e.submissionId && e.submissionId !== s.id ? " (other submission)" : ""}
                </span>
                <span className="text-muted-foreground">{formatStudyTime(e.occurredAt)}</span>
              </li>
            ))}
            {timeline.length === 0 && <li className="text-muted-foreground">No events (or removed).</li>}
          </ol>
        </Section>
        <Section title="Administrative history">
          <ol className="max-h-80 space-y-1 overflow-y-auto text-xs">
            {auditEntries.map((a) => (
              <li key={a.id}>
                <span className="text-muted-foreground">{formatStudyTime(a.createdAt)}</span> · {a.action.replace(/_/g, " ").toLowerCase()} by{" "}
                {a.actor?.name ?? "system"}
              </li>
            ))}
            {auditEntries.length === 0 && <li className="text-muted-foreground">No administrative actions yet.</li>}
          </ol>
        </Section>
      </div>
    </div>
  );
}
