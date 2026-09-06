"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setEligibility } from "@/lib/actions/research-eligibility";
import type { ExclusionReason } from "@/generated/prisma/enums";

function humanize(value: string) {
  return value.toLowerCase().split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

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

export function EligibilityForm({
  participantId,
  eligible: initialEligible,
  exclusionReason: initialReason,
  reviewNotes: initialNotes,
}: {
  participantId: string;
  eligible: boolean;
  exclusionReason: string | null;
  reviewNotes: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [eligible, setEligibleState] = useState(initialEligible);
  const [exclusionReason, setExclusionReason] = useState<ExclusionReason>((initialReason as ExclusionReason) ?? "OTHER");
  const [reviewNotes, setReviewNotes] = useState(initialNotes ?? "");

  async function handleSave() {
    setPending(true);
    const result = await setEligibility(participantId, {
      eligible,
      exclusionReason: eligible ? null : exclusionReason,
      reviewNotes,
    });
    setPending(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Eligibility updated.");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={eligible} onCheckedChange={(checked) => setEligibleState(checked)} />
        Eligible for analysis
      </label>
      {!eligible && (
        <div>
          <Label className="mb-1.5">Exclusion reason</Label>
          <Select value={exclusionReason} onValueChange={(v) => setExclusionReason((v ?? "OTHER") as ExclusionReason)}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue>{(v: string) => humanize(v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {EXCLUSION_REASONS.map((r) => (
                <SelectItem key={r} value={r}>{humanize(r)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div>
        <Label className="mb-1.5">Review notes</Label>
        <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.currentTarget.value)} />
      </div>
      <Button type="button" size="sm" disabled={pending} onClick={handleSave} className="bg-gradient-primary text-white hover:opacity-90">
        {pending ? "Saving..." : "Save eligibility"}
      </Button>
    </div>
  );
}
