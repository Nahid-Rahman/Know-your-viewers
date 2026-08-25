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

export function GenerateLinkButton({
  experimentId,
  streamers,
}: {
  experimentId: string;
  streamers: { id: string; displayName: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [streamerId, setStreamerId] = useState<string>("none");
  const [pending, setPending] = useState(false);

  async function handleGenerate() {
    setPending(true);
    const result = await createTrackingLink(experimentId, streamerId === "none" ? null : streamerId);
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
          <div>
            <Label className="mb-1.5">Streamer (optional)</Label>
            <Select value={streamerId} onValueChange={(value) => setStreamerId(value ?? "none")}>
              <SelectTrigger className="w-full">
                <SelectValue />
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
