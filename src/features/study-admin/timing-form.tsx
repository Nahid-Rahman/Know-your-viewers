"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recordActualTimeAction } from "@/lib/actions/study-admin";
import { toStudyLocalInput } from "@/lib/study/time";

/** Records/corrects the actual start or end (Asia/Dhaka input, UTC storage). */
export function TimingForm({
  sessionId,
  field,
  label,
  currentLocal,
  help,
}: {
  sessionId: string;
  field: "actualStartAt" | "actualEndAt";
  label: string;
  currentLocal: string;
  help?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentLocal);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const isCorrection = Boolean(currentLocal);

  function save(next: string) {
    start(async () => {
      const r = await recordActualTimeAction(sessionId, field, next, reason);
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      toast.success("Saved.");
      setReason("");
      router.refresh();
    });
  }

  function nowInDhaka() {
    return toStudyLocalInput(new Date());
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <Label className="mb-1.5" htmlFor={`t-${field}`}>
        {label} <span className="font-normal text-muted-foreground">(Asia/Dhaka)</span>
      </Label>
      <div className="flex flex-wrap gap-2">
        <Input id={`t-${field}`} type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} className="w-auto" />
        {!isCorrection && (
          <Button type="button" variant="outline" size="sm" onClick={() => setValue(nowInDhaka())}>
            Now
          </Button>
        )}
      </div>
      {isCorrection && (
        <Input
          className="mt-2"
          placeholder="Reason for correction (required)"
          value={reason}
          maxLength={300}
          onChange={(e) => setReason(e.target.value)}
        />
      )}
      {help && <p className="mt-1.5 text-xs text-muted-foreground">{help}</p>}
      <div className="mt-2 flex gap-2">
        <Button size="sm" disabled={pending || !value || value === currentLocal || (isCorrection && !reason.trim())} onClick={() => save(value)}>
          {isCorrection ? "Save correction" : "Record"}
        </Button>
      </div>
    </div>
  );
}
