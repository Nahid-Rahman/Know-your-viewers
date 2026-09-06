"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  updateInterviewConsent,
  createInterviewRecord,
  updateInterviewRecord,
} from "@/lib/actions/interviews";
import { setEligibility } from "@/lib/actions/research-eligibility";
import type { InterviewQueueRow } from "@/lib/queries/research";
import type {
  InterviewConsentAnswer,
  InterviewCandidateStatus,
  InterviewMode,
  InterviewRecordStatus,
  ExclusionReason,
} from "@/generated/prisma/enums";

function humanize(value: string) {
  return value.toLowerCase().split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

const CANDIDATE_STATUSES: InterviewCandidateStatus[] = [
  "NOT_INVITED",
  "INVITED",
  "ACCEPTED",
  "DECLINED",
  "SCHEDULED",
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
];
const INTERVIEW_MODES: InterviewMode[] = ["PHONE_CALL", "WHATSAPP_CALL", "GOOGLE_MEET", "ZOOM", "IN_PERSON", "OTHER"];
const RECORD_STATUSES: InterviewRecordStatus[] = ["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW", "RESCHEDULED"];
const CONSENT_TO_STATUS: Partial<Record<InterviewConsentAnswer, InterviewCandidateStatus>> = {
  YES: "ACCEPTED",
  NO: "DECLINED",
};

const EXCLUSION_REASONS: ExclusionReason[] = [
  "INCOMPLETE",
  "DUPLICATE",
  "TECHNICAL_ERROR",
  "TEST_ACCOUNT",
  "INVALID_SUBMISSION",
  "PARTICIPANT_DECLINED_DATA_USE",
  "PARTICIPANT_WITHDREW",
  "OTHER",
];

function toLocalInputValue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function InterviewDialog({ row }: { row: InterviewQueueRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const [consent, setConsent] = useState<InterviewConsentAnswer>(row.consent);
  const [status, setStatus] = useState<InterviewCandidateStatus>(row.status);
  const [preferredContactTime, setPreferredContactTime] = useState(row.preferredContactTime ?? "");
  const [consentNotes, setConsentNotes] = useState(row.consentNotes ?? "");

  const [interviewMode, setInterviewMode] = useState<InterviewMode>(
    (row.latestInterview?.interviewMode as InterviewMode) ?? "GOOGLE_MEET",
  );
  const [recordStatus, setRecordStatus] = useState<InterviewRecordStatus>(
    (row.latestInterview?.status as InterviewRecordStatus) ?? "SCHEDULED",
  );
  const [scheduledAt, setScheduledAt] = useState(toLocalInputValue(row.latestInterview?.scheduledAt ?? null));
  const [durationMinutes, setDurationMinutes] = useState<number | "">(row.latestInterview?.durationMinutes ?? "");
  const [summary, setSummary] = useState(row.latestInterview?.summary ?? "");
  const [themes, setThemes] = useState(row.latestInterview?.themes.join(", ") ?? "");
  const [researcherNotes, setResearcherNotes] = useState(row.latestInterview?.researcherNotes ?? "");

  const [eligible, setEligible] = useState(row.eligible);
  const [exclusionReason, setExclusionReason] = useState<ExclusionReason>(
    (row.exclusionReason as ExclusionReason) ?? "OTHER",
  );
  const [reviewNotes, setReviewNotes] = useState(row.reviewNotes ?? "");

  async function saveConsent() {
    setPending(true);
    const result = await updateInterviewConsent(row.participantId, {
      consent,
      status,
      preferredContactTime,
      notes: consentNotes,
    });
    setPending(false);
    if ("error" in result) return toast.error(result.error);
    toast.success("Consent & status updated.");
    router.refresh();
  }

  async function saveInterviewRecord() {
    setPending(true);
    const input = {
      interviewMode,
      status: recordStatus,
      scheduledAt: scheduledAt || null,
      durationMinutes: durationMinutes === "" ? null : Number(durationMinutes),
      summary,
      themes: themes.split(",").map((t) => t.trim()).filter(Boolean),
      researcherNotes,
    };
    const result = row.latestInterview
      ? await updateInterviewRecord(row.latestInterview.id, input)
      : await createInterviewRecord(row.participantId, input);
    setPending(false);
    if ("error" in result) return toast.error(result.error);
    toast.success("Interview record saved.");
    router.refresh();
  }

  async function saveNewInterviewRecord() {
    setPending(true);
    const result = await createInterviewRecord(row.participantId, {
      interviewMode,
      status: "SCHEDULED",
      scheduledAt: scheduledAt || null,
      durationMinutes: durationMinutes === "" ? null : Number(durationMinutes),
    });
    setPending(false);
    if ("error" in result) return toast.error(result.error);
    toast.success("New interview scheduled.");
    setOpen(false);
    router.refresh();
  }

  async function saveEligibility() {
    setPending(true);
    const result = await setEligibility(row.participantId, {
      eligible,
      exclusionReason: eligible ? null : exclusionReason,
      reviewNotes,
    });
    setPending(false);
    if ("error" in result) return toast.error(result.error);
    toast.success("Eligibility updated.");
    router.refresh();
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Manage
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{row.anonymousCode} &middot; Interview</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <section>
              <p className="mb-2 text-sm font-semibold">Consent &amp; candidate status</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5">Consent</Label>
                  <Select
                    value={consent}
                    onValueChange={(v) => {
                      const next = (v ?? "PENDING") as InterviewConsentAnswer;
                      setConsent(next);
                      const derivedStatus = CONSENT_TO_STATUS[next];
                      if (derivedStatus) setStatus(derivedStatus);
                    }}
                  >
                    <SelectTrigger className="w-full"><SelectValue>{(v: string) => humanize(v)}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="YES">Yes</SelectItem>
                      <SelectItem value="NO">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5">Candidate status</Label>
                  <Select value={status} onValueChange={(v) => setStatus((v ?? "NOT_INVITED") as InterviewCandidateStatus)}>
                    <SelectTrigger className="w-full"><SelectValue>{(v: string) => humanize(v)}</SelectValue></SelectTrigger>
                    <SelectContent>
                      {CANDIDATE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{humanize(s)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1.5">Preferred contact time</Label>
                  <Input value={preferredContactTime} onChange={(e) => setPreferredContactTime(e.currentTarget.value)} placeholder="Weekday evenings" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1.5">Notes</Label>
                  <Textarea value={consentNotes} onChange={(e) => setConsentNotes(e.currentTarget.value)} />
                </div>
              </div>
              <div className="mt-2 flex justify-end">
                <Button type="button" size="sm" disabled={pending} onClick={saveConsent} className="bg-gradient-primary text-white hover:opacity-90">
                  Save consent &amp; status
                </Button>
              </div>
            </section>

            <div className="border-t border-border" />

            <section>
              <p className="mb-2 text-sm font-semibold">
                {row.latestInterview ? "Latest interview record" : "Schedule interview"}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5">Mode</Label>
                  <Select value={interviewMode} onValueChange={(v) => setInterviewMode((v ?? "GOOGLE_MEET") as InterviewMode)}>
                    <SelectTrigger className="w-full"><SelectValue>{(v: string) => humanize(v)}</SelectValue></SelectTrigger>
                    <SelectContent>
                      {INTERVIEW_MODES.map((m) => (
                        <SelectItem key={m} value={m}>{humanize(m)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5">Record status</Label>
                  <Select value={recordStatus} onValueChange={(v) => setRecordStatus((v ?? "SCHEDULED") as InterviewRecordStatus)}>
                    <SelectTrigger className="w-full"><SelectValue>{(v: string) => humanize(v)}</SelectValue></SelectTrigger>
                    <SelectContent>
                      {RECORD_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{humanize(s)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5">Scheduled at</Label>
                  <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.currentTarget.value)} />
                </div>
                <div>
                  <Label className="mb-1.5">Duration (minutes)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.currentTarget.value ? Number(e.currentTarget.value) : "")}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1.5">Themes (comma-separated)</Label>
                  <Input value={themes} onChange={(e) => setThemes(e.currentTarget.value)} placeholder="streamer trust, prize motivation" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1.5">Summary</Label>
                  <Textarea value={summary} onChange={(e) => setSummary(e.currentTarget.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1.5">Researcher notes</Label>
                  <Textarea value={researcherNotes} onChange={(e) => setResearcherNotes(e.currentTarget.value)} />
                </div>
              </div>
              <div className="mt-2 flex flex-wrap justify-end gap-2">
                {row.latestInterview && (
                  <Button type="button" size="sm" variant="outline" disabled={pending} onClick={saveNewInterviewRecord}>
                    Schedule new (reschedule)
                  </Button>
                )}
                <Button type="button" size="sm" disabled={pending} onClick={saveInterviewRecord} className="bg-gradient-primary text-white hover:opacity-90">
                  {row.latestInterview ? "Save interview record" : "Schedule interview"}
                </Button>
              </div>
            </section>

            <div className="border-t border-border" />

            <section>
              <p className="mb-2 text-sm font-semibold">Research eligibility</p>
              <p className="mb-2 text-xs text-muted-foreground">Never set automatically — this is always a manual research-team decision.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <Checkbox checked={eligible} onCheckedChange={(checked) => setEligible(checked)} />
                  Eligible for analysis
                </label>
                {!eligible && (
                  <div className="sm:col-span-2">
                    <Label className="mb-1.5">Exclusion reason</Label>
                    <Select value={exclusionReason} onValueChange={(v) => setExclusionReason((v ?? "OTHER") as ExclusionReason)}>
                      <SelectTrigger className="w-full"><SelectValue>{(v: string) => humanize(v)}</SelectValue></SelectTrigger>
                      <SelectContent>
                        {EXCLUSION_REASONS.map((r) => (
                          <SelectItem key={r} value={r}>{humanize(r)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <Label className="mb-1.5">Review notes</Label>
                  <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.currentTarget.value)} />
                </div>
              </div>
              <div className="mt-2 flex justify-end">
                <Button type="button" size="sm" disabled={pending} onClick={saveEligibility} className="bg-gradient-primary text-white hover:opacity-90">
                  Save eligibility
                </Button>
              </div>
            </section>
          </div>

          <div className="flex justify-end border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
