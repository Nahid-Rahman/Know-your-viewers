"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  logAttemptAction,
  purgeResearchDataAction,
  recordPermissionAction,
  revealContactAction,
  saveFollowUpAction,
  saveInterviewAction,
  setDrawExclusionAction,
  setResearchExclusionAction,
} from "@/lib/actions/study-admin";

const SELECT = "h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm";

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  function run(fn: () => Promise<{ ok: true; data?: unknown } | { error: string }>, success: string, after?: () => void) {
    start(async () => {
      const r = await fn();
      if ("error" in r) return void toast.error(r.error);
      toast.success(success);
      after?.();
      router.refresh();
    });
  }
  return { pending, run };
}

/** Deliberate, audited reveal. Values live only in this component's memory. */
export function RevealContact({ submissionId }: { submissionId: string }) {
  const [purpose, setPurpose] = useState("");
  const [values, setValues] = useState<Record<string, string | null> | null>(null);
  const [pending, start] = useTransition();
  if (values) {
    return (
      <div className="rounded-lg border border-amber-400/40 bg-amber-400/5 p-3 text-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-muted-foreground">Phone</dt><dd className="font-mono">{values.phone ?? "(removed)"}</dd>
          <dt className="text-muted-foreground">Email</dt><dd>{values.email ?? "—"}</dd>
          <dt className="text-muted-foreground">In-game name</dt><dd>{values.ign ?? "—"}</dd>
          <dt className="text-muted-foreground">{values.socialType === "DISCORD" ? "Discord" : values.socialType === "FACEBOOK" ? "Facebook" : "Social"}</dt>
          <dd className="break-all">{values.social ?? "—"}</dd>
        </dl>
        <Button size="sm" variant="outline" className="mt-2" onClick={() => setValues(null)}>Hide</Button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Input aria-label="Purpose" placeholder="Purpose (e.g. follow-up call, prize payment)" className="w-72" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
      <Button
        size="sm"
        variant="outline"
        disabled={pending || !purpose.trim()}
        onClick={() =>
          start(async () => {
            const r = await revealContactAction(submissionId, purpose);
            if ("error" in r) return void toast.error(r.error);
            setValues(r.data as Record<string, string | null>);
          })
        }
      >
        Reveal contact details (logged)
      </Button>
    </div>
  );
}

export function PermissionForm({ submissionId }: { submissionId: string }) {
  const { pending, run } = useRun();
  const [v, setV] = useState({ type: "INTERVIEW_PROCEED", status: "GRANTED", noticeVersion: "", method: "PHONE_CALL", note: "" });
  const set = (k: keyof typeof v, val: string) => setV((p) => ({ ...p, [k]: val }));
  return (
    <form
      className="grid gap-2 sm:grid-cols-5"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => recordPermissionAction(submissionId, v as Parameters<typeof recordPermissionAction>[1]), "Permission recorded.", () => set("note", ""));
      }}
    >
      <select aria-label="Permission type" className={SELECT} value={v.type} onChange={(e) => set("type", e.target.value)}>
        <option value="INTERVIEW_PROCEED">Proceed with interview</option>
        <option value="WEBSITE_DATA_USE">Use website data in research</option>
        <option value="INTERVIEW_ANSWERS_USE">Use interview answers in research</option>
      </select>
      <select aria-label="Decision" className={SELECT} value={v.status} onChange={(e) => set("status", e.target.value)}>
        <option value="GRANTED">Granted</option>
        <option value="DECLINED">Declined</option>
        <option value="WITHDRAWN">Withdrawn</option>
        <option value="PENDING">Pending (e.g. asked to think about it)</option>
      </select>
      <Input aria-label="Notice / script version" placeholder="Script version (e.g. v1.2)" value={v.noticeVersion} onChange={(e) => set("noticeVersion", e.target.value)} />
      <select aria-label="Method" className={SELECT} value={v.method} onChange={(e) => set("method", e.target.value)}>
        <option value="PHONE_CALL">Phone call</option>
        <option value="WHATSAPP">WhatsApp</option>
        <option value="SMS">SMS</option>
        <option value="IN_PERSON">In person</option>
        <option value="OTHER">Other</option>
      </select>
      <Button size="sm" type="submit" disabled={pending}>Record</Button>
      <Input aria-label="Note" className="sm:col-span-5" placeholder="Note (optional)" value={v.note} onChange={(e) => set("note", e.target.value)} />
    </form>
  );
}

export function FollowUpForm({
  submissionId,
  initial,
  researchers,
}: {
  submissionId: string;
  initial: { status: string; assignedToId: string | null; nextFollowupAt: string; notes: string };
  researchers: { id: string; name: string }[];
}) {
  const { pending, run } = useRun();
  const [v, setV] = useState(initial);
  return (
    <form
      className="grid gap-2 sm:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveFollowUpAction(submissionId, { ...v, status: v.status as "REACHED" }), "Follow-up saved.");
      }}
    >
      <select aria-label="Follow-up status" className={SELECT} value={v.status} onChange={(e) => setV({ ...v, status: e.target.value })}>
        {["NOT_CONTACTED", "ATTEMPTING", "REACHED", "INTERVIEW_COMPLETED", "DECLINED_INTERVIEW", "UNREACHABLE"].map((s) => (
          <option key={s} value={s}>{s.replace(/_/g, " ").toLowerCase()}</option>
        ))}
      </select>
      <select aria-label="Assigned researcher" className={SELECT} value={v.assignedToId ?? ""} onChange={(e) => setV({ ...v, assignedToId: e.target.value || null })}>
        <option value="">Unassigned</option>
        {researchers.map((r) => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>
      <Input aria-label="Next follow-up (Dhaka)" type="datetime-local" value={v.nextFollowupAt} onChange={(e) => setV({ ...v, nextFollowupAt: e.target.value })} />
      <Button size="sm" type="submit" disabled={pending}>Save</Button>
      <Textarea aria-label="Follow-up notes" className="sm:col-span-4" rows={2} placeholder="Notes (no contact values)" value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />
    </form>
  );
}

export function AttemptForm({ submissionId }: { submissionId: string }) {
  const { pending, run } = useRun();
  const [v, setV] = useState({ outcome: "NO_ANSWER", method: "PHONE_CALL", note: "" });
  return (
    <form
      className="grid gap-2 sm:grid-cols-[1fr_1fr_2fr_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => logAttemptAction(submissionId, v as Parameters<typeof logAttemptAction>[1]), "Attempt logged.", () => setV({ ...v, note: "" }));
      }}
    >
      <select aria-label="Outcome" className={SELECT} value={v.outcome} onChange={(e) => setV({ ...v, outcome: e.target.value })}>
        {["ANSWERED", "NO_ANSWER", "WRONG_NUMBER", "CALL_BACK_LATER", "DECLINED", "UNREACHABLE"].map((s) => (
          <option key={s} value={s}>{s.replace(/_/g, " ").toLowerCase()}</option>
        ))}
      </select>
      <select aria-label="Method" className={SELECT} value={v.method} onChange={(e) => setV({ ...v, method: e.target.value })}>
        <option value="PHONE_CALL">Phone call</option>
        <option value="WHATSAPP">WhatsApp</option>
        <option value="SMS">SMS</option>
        <option value="OTHER">Other</option>
      </select>
      <Input aria-label="Note" placeholder="Note" value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} />
      <Button size="sm" type="submit" disabled={pending}>Log attempt</Button>
    </form>
  );
}

export function InterviewForm({ submissionId }: { submissionId: string }) {
  const { pending, run } = useRun();
  const empty = { mode: "PHONE_CALL", status: "COMPLETED", scriptVersion: "", scheduledAt: "", durationMinutes: "", summary: "", themes: "" };
  const [v, setV] = useState(empty);
  const set = (k: keyof typeof v, val: string) => setV((p) => ({ ...p, [k]: val }));
  return (
    <form
      className="grid gap-2 sm:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveInterviewAction(submissionId, null, v as Parameters<typeof saveInterviewAction>[2]), "Interview saved.", () => setV(empty));
      }}
    >
      <select aria-label="Mode" className={SELECT} value={v.mode} onChange={(e) => set("mode", e.target.value)}>
        <option value="PHONE_CALL">Phone call</option>
        <option value="WHATSAPP_CALL">WhatsApp call</option>
        <option value="GOOGLE_MEET">Google Meet</option>
        <option value="ZOOM">Zoom</option>
        <option value="IN_PERSON">In person</option>
        <option value="OTHER">Other</option>
      </select>
      <select aria-label="Status" className={SELECT} value={v.status} onChange={(e) => set("status", e.target.value)}>
        {["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW", "RESCHEDULED"].map((s) => (
          <option key={s} value={s}>{s.toLowerCase().replace("_", " ")}</option>
        ))}
      </select>
      <Input aria-label="Script version" placeholder="Script version" value={v.scriptVersion} onChange={(e) => set("scriptVersion", e.target.value)} />
      <div>
        <Label className="mb-1 text-xs">When (Dhaka)</Label>
        <Input type="datetime-local" value={v.scheduledAt} onChange={(e) => set("scheduledAt", e.target.value)} />
      </div>
      <div>
        <Label className="mb-1 text-xs">Duration (min)</Label>
        <Input inputMode="numeric" value={v.durationMinutes} onChange={(e) => set("durationMinutes", e.target.value)} />
      </div>
      <div>
        <Label className="mb-1 text-xs">Themes (comma-separated)</Label>
        <Input value={v.themes} onChange={(e) => set("themes", e.target.value)} />
      </div>
      <Textarea aria-label="Summary" className="sm:col-span-3" rows={3} placeholder="Summary (only used in research if interview-answer use is granted)" value={v.summary} onChange={(e) => set("summary", e.target.value)} />
      <Button size="sm" type="submit" disabled={pending}>Add interview record</Button>
    </form>
  );
}

export function ResearchExclusionForm({ submissionId, excluded }: { submissionId: string; excluded: boolean }) {
  const { pending, run } = useRun();
  const [reason, setReason] = useState("INVALID_SUBMISSION");
  const [note, setNote] = useState("");
  if (excluded) {
    return (
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setResearchExclusionAction(submissionId, { excluded: false }), "Exclusion removed.")}>
        Remove manual research exclusion
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      <select aria-label="Exclusion reason" className={`${SELECT} w-auto`} value={reason} onChange={(e) => setReason(e.target.value)}>
        {["INCOMPLETE", "TECHNICAL_ERROR", "TEST_ENTRY", "INVALID_SUBMISSION", "PARTICIPANT_WITHDREW", "OTHER"].map((r) => (
          <option key={r} value={r}>{r.replace(/_/g, " ").toLowerCase()}</option>
        ))}
      </select>
      <Input aria-label="Note" placeholder="Note" className="w-56" value={note} onChange={(e) => setNote(e.target.value)} />
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => run(() => setResearchExclusionAction(submissionId, { excluded: true, reason: reason as "OTHER", note }), "Excluded from research analysis.")}
      >
        Exclude from research
      </Button>
    </div>
  );
}

export function DrawExclusionForm({ submissionId, excluded }: { submissionId: string; excluded: boolean }) {
  const { pending, run } = useRun();
  const [note, setNote] = useState("");
  return (
    <div className="flex flex-wrap gap-2">
      <Input aria-label="Reason" placeholder="Reason (required, recorded)" className="w-64" value={note} onChange={(e) => setNote(e.target.value)} />
      <Button
        size="sm"
        variant="outline"
        disabled={pending || !note.trim()}
        onClick={() => run(() => setDrawExclusionAction(submissionId, !excluded, note), excluded ? "Draw eligibility restored." : "Excluded from the draw.", () => setNote(""))}
      >
        {excluded ? "Restore draw eligibility" : "Exclude from draw"}
      </Button>
    </div>
  );
}

export function PurgeResearchData({ submissionId }: { submissionId: string }) {
  const { pending, run } = useRun();
  type Plan = { eventsToDelete: number; optionalFieldsCleared: boolean; phoneKeptForPrize: boolean };
  const [plan, setPlan] = useState<Plan | null>(null);
  const [previewing, startPreview] = useTransition();
  return (
    <div className="space-y-2 text-sm">
      {!plan ? (
        <Button
          size="sm"
          variant="outline"
          disabled={previewing}
          onClick={() =>
            startPreview(async () => {
              const r = await purgeResearchDataAction(submissionId, true);
              if ("error" in r) return void toast.error(r.error);
              setPlan(r.data as Plan);
            })
          }
        >
          Preview research-data removal
        </Button>
      ) : (
        <div className="rounded-lg border border-border p-3">
          <p>Will delete {plan.eventsToDelete} website event(s){plan.optionalFieldsCleared ? ", clear email/IGN/social" : ""}.</p>
          <p className="text-muted-foreground">
            {plan.phoneKeptForPrize
              ? "Phone is kept: this entry still has a reward entitlement (until retention applies)."
              : "Phone is also removed (no reward entitlement)."}
          </p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="destructive" disabled={pending} onClick={() => run(() => purgeResearchDataAction(submissionId, false), "Research data removed.", () => setPlan(null))}>
              Remove now
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPlan(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
