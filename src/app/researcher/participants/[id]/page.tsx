import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { RarityBadge, type Rarity } from "@/components/common/rarity-badge";
import { EmptyState } from "@/components/common/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requireRoleOrRedirect } from "@/lib/auth";
import { getParticipantDetail, RECRUITMENT_SOURCE_LABELS } from "@/lib/queries/research";
import { EligibilityForm } from "@/features/outreach/eligibility-form";

export const metadata = { title: "Participant | LiveDrop Arena" };

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function fmtDuration(seconds: number | null) {
  if (seconds === null) return "ongoing";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export default async function ParticipantDetailPage({
  params,
}: PageProps<"/researcher/participants/[id]">) {
  await requireRoleOrRedirect("RESEARCHER");
  const { id } = await params;
  const p = await getParticipantDetail(id);
  if (!p) notFound();

  return (
    <div>
      <Link
        href="/researcher/participants"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Participants
      </Link>

      <PageHeader title={p.anonymousCode} description={p.experimentTitle} />

      <div className="mb-6 grid gap-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Study Status</p>
          <div className="mt-1"><StatusBadge status={p.studyStatus === "completed" ? "COMPLETED" : "DROPPED"} /></div>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Current Stage</p>
          <p className="mt-1 text-sm font-medium">{p.currentStage}</p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Streamer</p>
          <p className="mt-1 text-sm font-medium">{p.streamerName ?? p.linkStreamerName ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Entry Source</p>
          <p className="mt-1 text-sm font-medium">{RECRUITMENT_SOURCE_LABELS[p.entrySource]}</p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">First Visit</p>
          <p className="mt-1 text-sm font-medium">{fmt(p.firstVisit)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Last Activity</p>
          <p className="mt-1 text-sm font-medium">{fmt(p.lastActivity)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Data Use Permission</p>
          <div className="mt-1">
            <StatusBadge
              status={
                p.dataUsePermission === "yes"
                  ? "GRANTED"
                  : p.dataUsePermission === "no"
                    ? "DECLINED"
                    : p.dataUsePermission === "withdrawn"
                      ? "WITHDRAWN"
                      : "PENDING"
              }
            />
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Eligibility</p>
          <div className="mt-1">
            <StatusBadge status={p.eligibility.eligible ? "ELIGIBLE" : "EXCLUDED"} />
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="journey">Journey</TabsTrigger>
          <TabsTrigger value="responses">Responses</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="debrief">Debrief</TabsTrigger>
          <TabsTrigger value="interview">Interview</TabsTrigger>
          <TabsTrigger value="decision">Research Decision</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="mb-3 font-semibold">Session</p>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Condition</dt><dd>{p.conditionName ?? "Unassigned"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Stream</dt><dd>{p.streamSessionTitle ?? "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Entry source</dt><dd>{RECRUITMENT_SOURCE_LABELS[p.entrySource]}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Study start</dt><dd>{fmt(p.firstVisit)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Last activity</dt><dd>{fmt(p.lastActivity)}</dd></div>
              </dl>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="mb-3 font-semibold">Reward result</p>
              {p.rewardLabel ? (
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{p.rewardLabel}</p>
                  {p.rewardRarity && <RarityBadge rarity={p.rewardRarity.toLowerCase() as Rarity} variant="pill" />}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No reward reached yet.</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Journey */}
        <TabsContent value="journey">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="mb-3 font-semibold">Timeline</p>
              {p.events.length === 0 ? (
                <EmptyState title="No events recorded" />
              ) : (
                <ol className="space-y-2 text-sm">
                  {p.events.map((e) => (
                    <li key={e.id} className="flex items-start gap-3">
                      <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                        {new Date(e.timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                      <span>
                        {e.type.replaceAll("_", " ").toLowerCase()}
                        {e.eventValue && <span className="text-muted-foreground"> — {e.eventValue}</span>}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="mb-3 font-semibold">Page duration summary</p>
              {p.pageDurations.length === 0 ? (
                <EmptyState title="No page-level data yet" />
              ) : (
                <div className="space-y-2 text-sm">
                  {p.pageDurations.map((pd) => (
                    <div key={pd.page} className="flex items-center justify-between">
                      <span className="capitalize">{pd.page.replaceAll("-", " ")}</span>
                      <span className="text-muted-foreground">
                        {fmtDuration(pd.durationSeconds)}
                        {pd.visitCount > 1 && ` · ${pd.visitCount} visits`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Responses */}
        <TabsContent value="responses">
          <div className="rounded-xl border border-border bg-card p-5">
            {p.responses.length === 0 ? (
              <EmptyState title="No survey responses" description="This participant hasn't completed the optional survey." />
            ) : (
              <ol className="space-y-4">
                {p.responses.map((r, i) => (
                  <li key={i}>
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Q{r.questionOrder} &middot; {r.surveyTitle}
                    </p>
                    <p className="mt-1 text-sm font-medium">{r.questionText}</p>
                    <p className="mt-1 text-sm text-primary">{r.answer}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </TabsContent>

        {/* Contact */}
        <TabsContent value="contact">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="mb-3 font-semibold">Context</p>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Contact submitted</dt><dd>{p.hasContact ? fmt(p.contactSubmittedAt) : "Not submitted"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Streamer</dt><dd>{p.streamerName ?? p.linkStreamerName ?? "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Stream</dt><dd>{p.streamSessionTitle ?? "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Prize</dt><dd>{p.rewardLabel ?? "—"}</dd></div>
              </dl>
              <p className="mt-4 text-xs text-muted-foreground">
                Phone number is encrypted and only ever decrypted from the Outreach &rarr; Contacts screen for an
                explicit follow-up action — never shown here.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="mb-3 font-semibold">Follow-up status</p>
              {p.contactWorkflow ? (
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd><StatusBadge status={p.contactWorkflow.contactStatus} /></dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Assigned to</dt><dd>{p.contactWorkflow.researcherAssignedName ?? "Unassigned"}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Next follow-up</dt><dd>{fmt(p.contactWorkflow.nextFollowupAt)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Prize fulfillment</dt><dd>{p.contactWorkflow.prizeFulfillmentStatus ? <StatusBadge status={p.contactWorkflow.prizeFulfillmentStatus} /> : "—"}</dd></div>
                  {p.contactWorkflow.contactNotes && (
                    <div className="pt-2"><dt className="mb-1 text-muted-foreground">Notes</dt><dd>{p.contactWorkflow.contactNotes}</dd></div>
                  )}
                </dl>
              ) : (
                <EmptyState title="No follow-up yet" description="Manage contact outreach from Outreach → Contacts." />
              )}
            </div>
            <div className="rounded-xl border border-border bg-card p-5 sm:col-span-2">
              <p className="mb-3 font-semibold">Attempt history</p>
              {p.contactAttempts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attempts logged.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {p.contactAttempts.map((a) => (
                    <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                      <div>
                        <StatusBadge status={a.outcome} />
                        {a.note && <span className="ml-2 text-muted-foreground">{a.note}</span>}
                      </div>
                      <span className="text-xs text-muted-foreground">{fmt(a.attemptedAt)}{a.researcherName ? ` · ${a.researcherName}` : ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Debrief */}
        <TabsContent value="debrief">
          <div className="rounded-xl border border-border bg-card p-5">
            {p.debrief ? (
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd><StatusBadge status={p.debrief.debriefStatus} /></dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Method</dt><dd>{p.debrief.debriefMethod ? <StatusBadge status={p.debrief.debriefMethod} /> : "On-page (automatic)"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Explanation shown</dt><dd>{p.debrief.explanationShown ? "Yes" : "No"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Permission given</dt><dd>{p.debrief.permissionGiven === null ? "—" : p.debrief.permissionGiven ? "Yes" : "No"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Sent at</dt><dd>{fmt(p.debrief.debriefSentAt)}</dd></div>
                {p.debrief.debriefNotes && (
                  <div className="sm:col-span-2"><dt className="mb-1 text-muted-foreground">Notes</dt><dd>{p.debrief.debriefNotes}</dd></div>
                )}
              </dl>
            ) : (
              <EmptyState title="Not yet reached" description="This participant hasn't reached the debrief step." />
            )}
          </div>
        </TabsContent>

        {/* Interview */}
        <TabsContent value="interview">
          <div className="grid gap-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="mb-3 font-semibold">Consent &amp; scheduling</p>
              {p.interviewConsent ? (
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="flex justify-between"><dt className="text-muted-foreground">Invited</dt><dd>{p.interviewConsent.invited ? fmt(p.interviewConsent.invitedAt) : "Not invited"}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Consent</dt><dd><StatusBadge status={p.interviewConsent.consent} /></dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd><StatusBadge status={p.interviewConsent.status} /></dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Preferred time</dt><dd>{p.interviewConsent.preferredContactTime ?? "—"}</dd></div>
                  {p.interviewConsent.notes && (
                    <div className="sm:col-span-2"><dt className="mb-1 text-muted-foreground">Notes</dt><dd>{p.interviewConsent.notes}</dd></div>
                  )}
                </dl>
              ) : (
                <EmptyState title="Not invited yet" description="Manage interview invitations from Outreach → Interviews." />
              )}
            </div>
            {p.interviews.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="mb-3 font-semibold">Interview records</p>
                <ul className="divide-y divide-border">
                  {p.interviews.map((iv) => (
                    <li key={iv.id} className="py-3 text-sm">
                      <div className="flex items-center justify-between">
                        <StatusBadge status={iv.status} />
                        <span className="text-xs text-muted-foreground">{fmt(iv.scheduledAt)}</span>
                      </div>
                      <p className="mt-2 text-muted-foreground">
                        {iv.interviewMode ? iv.interviewMode.replaceAll("_", " ").toLowerCase() : "Mode not set"}
                        {iv.interviewerName && ` · ${iv.interviewerName}`}
                        {iv.durationMinutes && ` · ${iv.durationMinutes} min`}
                      </p>
                      {iv.summary && <p className="mt-2">{iv.summary}</p>}
                      {iv.themes.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {iv.themes.map((t) => (
                            <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-xs">{t}</span>
                          ))}
                        </div>
                      )}
                      {(iv.transcriptFileUrl || iv.recordingFileUrl) && (
                        <div className="mt-2 flex gap-3 text-xs">
                          {iv.transcriptFileUrl && <a href={iv.transcriptFileUrl} className="text-primary underline" target="_blank" rel="noreferrer">Transcript</a>}
                          {iv.recordingFileUrl && <a href={iv.recordingFileUrl} className="text-primary underline" target="_blank" rel="noreferrer">Recording</a>}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Research Decision */}
        <TabsContent value="decision">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="mb-3 font-semibold">Data use permission</p>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Permission</dt>
                  <dd>
                    <StatusBadge
                      status={
                        p.dataUsePermission === "yes" ? "GRANTED" : p.dataUsePermission === "no" ? "DECLINED" : p.dataUsePermission === "withdrawn" ? "WITHDRAWN" : "PENDING"
                      }
                    />
                  </dd>
                </div>
                {p.consentNotes && (
                  <div className="pt-2"><dt className="mb-1 text-muted-foreground">Permission notes</dt><dd>{p.consentNotes}</dd></div>
                )}
              </dl>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="mb-3 font-semibold">Eligibility</p>
              {!p.eligibility.eligible && (
                <dl className="mb-3 space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-muted-foreground">Excluded by</dt><dd>{p.eligibility.excludedByName ?? "—"}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Excluded at</dt><dd>{fmt(p.eligibility.excludedAt)}</dd></div>
                </dl>
              )}
              <EligibilityForm
                participantId={p.id}
                eligible={p.eligibility.eligible}
                exclusionReason={p.eligibility.exclusionReason}
                reviewNotes={p.eligibility.reviewNotes}
              />
              <p className="mt-3 text-xs text-muted-foreground">
                Never set automatically — always an explicit research-team decision. Also editable from Outreach &rarr; Interviews.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Link href="/researcher/participants" className={cn(buttonVariants({ variant: "outline" }), "mt-6")}>
        <ArrowLeft data-icon="inline-start" />
        Back to Participants
      </Link>
    </div>
  );
}
