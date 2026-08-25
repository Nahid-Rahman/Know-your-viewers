"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setExperimentStatus } from "@/lib/actions/experiments";
import type { ExperimentStatus } from "@/generated/prisma/enums";

const NEXT_STATUS: Record<ExperimentStatus, { label: string; next: ExperimentStatus }[]> = {
  DRAFT: [{ label: "Activate", next: "ACTIVE" }],
  ACTIVE: [
    { label: "Mark Completed", next: "COMPLETED" },
    { label: "Archive", next: "ARCHIVED" },
  ],
  COMPLETED: [{ label: "Archive", next: "ARCHIVED" }],
  ARCHIVED: [],
};

export function ExperimentStatusControl({
  experimentId,
  status,
}: {
  experimentId: string;
  status: ExperimentStatus;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function transition(next: ExperimentStatus) {
    setPending(true);
    const result = await setExperimentStatus(experimentId, next);
    setPending(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(`Status changed to ${next}.`);
    router.refresh();
  }

  const options = NEXT_STATUS[status];
  if (options.length === 0) return null;

  return (
    <div className="flex gap-2">
      {options.map((o) => (
        <Button key={o.next} size="sm" variant="outline" disabled={pending} onClick={() => transition(o.next)}>
          {o.label}
        </Button>
      ))}
    </div>
  );
}
