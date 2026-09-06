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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTrackingLink } from "@/lib/actions/tracking-links";
import { RECRUITMENT_SOURCE_LABELS, type EntrySourceValue } from "@/lib/entry-source";

export function GenerateLinkButton({
  experimentId,
  streamers,
  streamSessions,
}: {
  experimentId: string;
  streamers: { id: string; displayName: string }[];
  streamSessions: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [streamerId, setStreamerId] = useState<string>("none");
  const [streamSessionId, setStreamSessionId] = useState<string>("none");
  const [entrySource, setEntrySource] = useState<EntrySourceValue>("OTHER");
  const [pending, setPending] = useState(false);

  const streamerLabels = new Map(streamers.map((s) => [s.id, s.displayName]));
  const streamSessionLabels = new Map(streamSessions.map((s) => [s.id, s.label]));

  async function handleGenerate() {
    setPending(true);
    const result = await createTrackingLink(experimentId, {
      streamerId: streamerId === "none" ? null : streamerId,
      streamSessionId: streamSessionId === "none" ? null : streamSessionId,
      entrySource,
    });
    setPending(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Tracking link generated.");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-gradient-primary text-white hover:opacity-90">
        Generate Link
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New tracking link</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1.5">Streamer (optional)</Label>
              <Select value={streamerId} onValueChange={(value) => setStreamerId(value ?? "none")}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(value: string) => (value === "none" ? "Unassigned" : (streamerLabels.get(value) ?? value))}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {streamers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5">Entry source</Label>
              <Select
                value={entrySource}
                onValueChange={(value) => setEntrySource((value ?? "OTHER") as EntrySourceValue)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{(value: EntrySourceValue) => RECRUITMENT_SOURCE_LABELS[value] ?? value}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RECRUITMENT_SOURCE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5">Stream session</Label>
              <Select value={streamSessionId} onValueChange={(value) => setStreamSessionId(value ?? "none")}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(value: string) => (value === "none" ? "None" : (streamSessionLabels.get(value) ?? value))}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {streamSessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Required for QR Code / Chat Link / Stream Description entry sources.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={pending} onClick={handleGenerate} className="bg-gradient-primary text-white hover:opacity-90">
              {pending ? "Generating..." : "Generate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
