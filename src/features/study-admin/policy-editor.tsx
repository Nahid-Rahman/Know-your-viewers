"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/common/status-badge";
import { savePolicyAction } from "@/lib/actions/study-admin";
import { POLICY_DEFINITIONS, type PolicyKey } from "@/lib/study/policy";

type Row = {
  key: PolicyKey;
  status: "PENDING" | "APPROVED";
  value: Record<string, unknown> | null;
  note: string;
  approvalRef: string;
  decidedBy: string | null;
  decidedAt: string | null;
};

const numOrNull = (s: string) => (s.trim() === "" ? null : Number(s));

function ValueFields({ k, value, onChange }: { k: PolicyKey; value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }) {
  const str = (x: unknown) => (x === null || x === undefined ? "" : String(x));
  if (k === "WINNER_COUNT") {
    return (
      <div>
        <Label className="mb-1" htmlFor={`v-${k}`}>Winner count</Label>
        <Input id={`v-${k}`} type="number" min={1} className="w-32" value={str(value.winnerCount)} onChange={(e) => onChange({ winnerCount: numOrNull(e.target.value) })} />
      </div>
    );
  }
  if (k === "UNDER18_CONTACT_AND_REWARD") {
    const sel = (field: string) => (
      <select
        aria-label={field}
        className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
        value={value[field] === undefined ? "" : String(value[field])}
        onChange={(e) => onChange({ ...value, [field]: e.target.value === "" ? undefined : e.target.value === "true" })}
      >
        <option value="">— not decided —</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
    return (
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">Under-18 may be contacted {sel("contactAllowed")}</label>
        <label className="flex items-center gap-2">Under-18 eligible for the draw {sel("rewardEligible")}</label>
      </div>
    );
  }
  if (k === "RETENTION") {
    const f = (field: string, label: string) => (
      <div>
        <Label className="mb-1" htmlFor={`v-${field}`}>{label}</Label>
        <Input id={`v-${field}`} type="number" min={1} placeholder="undecided" value={str(value[field])} onChange={(e) => onChange({ ...value, [field]: numOrNull(e.target.value) })} />
      </div>
    );
    return (
      <div className="grid gap-2 sm:grid-cols-4">
        {f("contactDays", "Phone kept (days)")}
        {f("optionalFieldDays", "Optional fields (days)")}
        {f("eventDays", "Website events (days)")}
        {f("supportDays", "Support requests (days)")}
      </div>
    );
  }
  if (k === "COLLECTION_NOTICE") {
    return (
      <div className="grid gap-2">
        <div>
          <Label className="mb-1" htmlFor="v-nv">Notice version</Label>
          <Input id="v-nv" className="w-40" value={str(value.noticeVersion)} onChange={(e) => onChange({ ...value, noticeVersion: e.target.value })} />
        </div>
        <div>
          <Label className="mb-1" htmlFor="v-nt">Notice text (shown on the homepage of LIVE sessions once approved)</Label>
          <Textarea id="v-nt" rows={3} value={str(value.noticeText)} onChange={(e) => onChange({ ...value, noticeText: e.target.value })} />
        </div>
      </div>
    );
  }
  return null;
}

export function PolicyEditor({ experimentId, row, canWrite }: { experimentId: string; row: Row; canWrite: boolean }) {
  const router = useRouter();
  const def = POLICY_DEFINITIONS[row.key];
  const [value, setValue] = useState<Record<string, unknown>>(row.value ?? {});
  const [note, setNote] = useState(row.note);
  const [ref, setRef] = useState(row.approvalRef);
  const [pending, start] = useTransition();
  const hasValue = ["WINNER_COUNT", "UNDER18_CONTACT_AND_REWARD", "RETENTION", "COLLECTION_NOTICE"].includes(row.key);

  function save(status: "PENDING" | "APPROVED") {
    start(async () => {
      const r = await savePolicyAction(experimentId, row.key, {
        status,
        value: hasValue ? (Object.values(value).some((x) => x !== undefined && x !== null && x !== "") ? value : null) : null,
        note,
        approvalRef: ref,
      });
      if ("error" in r) return void toast.error(r.error);
      toast.success(status === "APPROVED" ? "Recorded as approved." : "Saved as pending.");
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{def.title}</p>
          <p className="text-xs text-muted-foreground">{def.description}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {def.requiredForLiveCollection && "Required before live collection. "}
            {def.requiredForLiveDraw && "Required before a live draw."}
          </p>
        </div>
        <div className="text-right">
          <StatusBadge status={row.status} />
          {row.decidedBy && <p className="mt-1 text-xs text-muted-foreground">by {row.decidedBy} · {row.decidedAt}</p>}
        </div>
      </div>
      <fieldset disabled={!canWrite || pending} className="mt-3 space-y-2">
        {hasValue && <ValueFields k={row.key} value={value} onChange={setValue} />}
        <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
          <Textarea aria-label="Decision note" rows={2} placeholder="What was decided / still open" value={note} onChange={(e) => setNote(e.target.value)} />
          <Input aria-label="Approval reference" placeholder="Approval ref (e.g. IRB letter, supervisor email date)" value={ref} onChange={(e) => setRef(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => save("PENDING")}>Save as pending</Button>
          <Button size="sm" onClick={() => save("APPROVED")}>Record as approved</Button>
        </div>
      </fieldset>
    </div>
  );
}
