"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { logContactAttempt } from "@/lib/actions/contacts";
import type { ContactOutcome } from "@/generated/prisma/enums";

const OUTCOMES: { value: ContactOutcome; label: string }[] = [
  { value: "ANSWERED", label: "Answered" },
  { value: "NO_ANSWER", label: "No Answer" },
  { value: "WRONG_NUMBER", label: "Wrong Number" },
  { value: "CALL_BACK_LATER", label: "Call Back Later" },
  { value: "DEBRIEF_COMPLETED", label: "Debrief Completed" },
  { value: "DECLINED", label: "Declined" },
  { value: "UNREACHABLE", label: "Unreachable" },
];

const OUTCOME_LABELS = Object.fromEntries(OUTCOMES.map((o) => [o.value, o.label])) as Record<ContactOutcome, string>;

export function LogAttemptDialog({ participantId }: { participantId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<ContactOutcome>("NO_ANSWER");
  const [note, setNote] = useState("");

  async function handleSubmit() {
    setPending(true);
    const result = await logContactAttempt(participantId, outcome, note || undefined);
    setPending(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Attempt logged.");
    setOpen(false);
    setNote("");
    router.refresh();
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Log attempt
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Log contact attempt</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1.5">Outcome</Label>
              <Select value={outcome} onValueChange={(v) => setOutcome((v ?? "NO_ANSWER") as ContactOutcome)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(value: ContactOutcome) => OUTCOME_LABELS[value] ?? value}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {OUTCOMES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5">Note (optional)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.currentTarget.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={pending} onClick={handleSubmit} className="bg-gradient-primary text-white hover:opacity-90">
              {pending ? "Saving..." : "Log attempt"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
