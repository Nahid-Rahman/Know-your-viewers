"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bulkResearchExclusionAction } from "@/lib/actions/study-admin";

const SELECT = "h-9 rounded-md border border-input bg-transparent px-2 text-sm";
const REASONS = ["INCOMPLETE", "TECHNICAL_ERROR", "TEST_ENTRY", "INVALID_SUBMISSION", "PARTICIPANT_WITHDREW", "OTHER"] as const;

/**
 * Bulk manual research exclusion for the rows ticked in the submissions table
 * (checkboxes carry form="bulk-exclusion"). Excluding never bypasses a hard
 * rule, and removing an exclusion only removes the manual flag — entries stay
 * ineligible for any other recorded reason. Each change is audited.
 */
export function BulkExclusionForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [reason, setReason] = useState<(typeof REASONS)[number]>("INVALID_SUBMISSION");
  const [note, setNote] = useState("");

  function submit(excluded: boolean, form: HTMLFormElement) {
    const ids = new FormData(form).getAll("ids").map(String);
    if (!ids.length) return void toast.error("Tick at least one submission first.");
    start(async () => {
      const r = await bulkResearchExclusionAction(ids, excluded ? { excluded, reason, note } : { excluded });
      if ("error" in r) return void toast.error(r.error);
      toast.success(`${r.data.updated} submission(s) updated.`);
      router.refresh();
    });
  }

  return (
    <form
      id="bulk-exclusion"
      className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        submit(true, e.currentTarget);
      }}
    >
      <span className="font-medium">Selected rows:</span>
      <select aria-label="Exclusion reason" className={SELECT} value={reason} onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])}>
        {REASONS.map((r) => (
          <option key={r} value={r}>{r.replace(/_/g, " ").toLowerCase()}</option>
        ))}
      </select>
      <Input aria-label="Note (stored on each entry, not in the audit log)" placeholder="Note (optional)" className="w-56" value={note} onChange={(e) => setNote(e.target.value)} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>Exclude from research</Button>
      <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={(e) => submit(false, e.currentTarget.form!)}>
        Remove manual exclusion
      </Button>
      <span className="text-xs text-muted-foreground">Removing a manual exclusion never overrides under-18, duplicate, TEST, permission or purge rules.</span>
    </form>
  );
}
