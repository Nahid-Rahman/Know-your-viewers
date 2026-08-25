"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { assignStreamerToExperiment, unassignStreamerFromExperiment } from "@/lib/actions/streamers";

export function StreamerAssignmentPanel({
  experimentId,
  allStreamers,
  assignedStreamerIds,
}: {
  experimentId: string;
  allStreamers: { id: string; displayName: string; platform: string; category: string }[];
  assignedStreamerIds: string[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const assignedSet = new Set(assignedStreamerIds);

  async function toggle(streamerId: string, assigned: boolean) {
    setPendingId(streamerId);
    const result = assigned
      ? await unassignStreamerFromExperiment(experimentId, streamerId)
      : await assignStreamerToExperiment(experimentId, streamerId);
    setPendingId(null);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  if (allStreamers.length === 0) {
    return <p className="text-sm text-muted-foreground">No streamers exist yet — add one from the Streamers page.</p>;
  }

  return (
    <div className="space-y-2">
      {allStreamers.map((s) => {
        const assigned = assignedSet.has(s.id);
        return (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium">{s.displayName}</p>
              <p className="text-xs text-muted-foreground">
                {s.platform} &bull; {s.category}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant={assigned ? "outline" : "default"}
              disabled={pendingId === s.id}
              onClick={() => toggle(s.id, assigned)}
            >
              {assigned ? "Unassign" : "Assign"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
