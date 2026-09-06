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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createStreamSession,
  updateStreamSession,
  type StreamSessionInput,
} from "@/lib/actions/stream-sessions";
import type { StreamSessionRow } from "@/lib/queries/research";

/** `2026-09-06T16:09` (datetime-local's own format) has no timezone — treated as local time both ways. */
function toLocalInputValue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function StreamSessionDialog({
  experimentId,
  streamers,
  session,
  triggerLabel,
  triggerVariant = "default",
}: {
  /** Required when creating a new session; ignored when editing an existing one. */
  experimentId?: string;
  streamers: { id: string; displayName: string }[];
  session?: StreamSessionRow;
  triggerLabel: React.ReactNode;
  triggerVariant?: "default" | "outline" | "ghost";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState<StreamSessionInput>({
    streamerId: session?.streamerId ?? streamers[0]?.id ?? "",
    platform: session?.platform ?? "",
    gameName: session?.gameName ?? "",
    streamTitle: session?.streamTitle ?? "",
    streamStartTime: toLocalInputValue(session?.streamStartTime ?? null),
    streamEndTime: toLocalInputValue(session?.streamEndTime ?? null),
    campaignStartTime: toLocalInputValue(session?.campaignStartTime ?? null),
    campaignEndTime: toLocalInputValue(session?.campaignEndTime ?? null),
    estimatedViewerCount: session?.estimatedViewerCount ?? null,
    qrDisplayed: session?.qrDisplayed ?? false,
    chatLinkPosted: session?.chatLinkPosted ?? false,
    notes: session?.notes ?? "",
  });

  function set<K extends keyof StreamSessionInput>(key: K, value: StreamSessionInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.streamerId) {
      toast.error("Pick a streamer.");
      return;
    }
    if (!session && !experimentId) {
      toast.error("Missing experiment.");
      return;
    }
    setPending(true);
    const result = session
      ? await updateStreamSession(session.id, form)
      : await createStreamSession(experimentId!, form);
    setPending(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(session ? "Stream session updated." : "Stream session created.");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant === "default" ? undefined : triggerVariant}
        className={triggerVariant === "default" ? "bg-gradient-primary text-white hover:opacity-90" : undefined}
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{session ? "Edit stream session" : "New stream session"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="mb-1.5">Streamer</Label>
              <Select value={form.streamerId} onValueChange={(v) => set("streamerId", v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string) => streamers.find((s) => s.id === value)?.displayName ?? value}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {streamers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-1.5">Stream title</Label>
              <Input
                value={form.streamTitle ?? ""}
                onChange={(e) => set("streamTitle", e.currentTarget.value)}
                placeholder="Weekend Squad Grind"
              />
            </div>
            <div>
              <Label className="mb-1.5">Platform</Label>
              <Input
                value={form.platform ?? ""}
                onChange={(e) => set("platform", e.currentTarget.value)}
                placeholder="Twitch"
              />
            </div>
            <div>
              <Label className="mb-1.5">Game</Label>
              <Input
                value={form.gameName ?? ""}
                onChange={(e) => set("gameName", e.currentTarget.value)}
                placeholder="Valorant"
              />
            </div>
            <div>
              <Label className="mb-1.5">Stream start</Label>
              <Input
                type="datetime-local"
                value={form.streamStartTime ?? ""}
                onChange={(e) => set("streamStartTime", e.currentTarget.value)}
              />
            </div>
            <div>
              <Label className="mb-1.5">Stream end</Label>
              <Input
                type="datetime-local"
                value={form.streamEndTime ?? ""}
                onChange={(e) => set("streamEndTime", e.currentTarget.value)}
              />
            </div>
            <div>
              <Label className="mb-1.5">Campaign start</Label>
              <Input
                type="datetime-local"
                value={form.campaignStartTime ?? ""}
                onChange={(e) => set("campaignStartTime", e.currentTarget.value)}
              />
            </div>
            <div>
              <Label className="mb-1.5">Campaign end</Label>
              <Input
                type="datetime-local"
                value={form.campaignEndTime ?? ""}
                onChange={(e) => set("campaignEndTime", e.currentTarget.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-1.5">Estimated viewer count</Label>
              <Input
                type="number"
                min={0}
                value={form.estimatedViewerCount ?? ""}
                onChange={(e) => set("estimatedViewerCount", e.currentTarget.value ? Number(e.currentTarget.value) : null)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.qrDisplayed ?? false} onCheckedChange={(checked) => set("qrDisplayed", checked)} />
              QR code displayed on stream
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.chatLinkPosted ?? false} onCheckedChange={(checked) => set("chatLinkPosted", checked)} />
              Chat link posted
            </label>
            <div className="sm:col-span-2">
              <Label className="mb-1.5">Notes</Label>
              <Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.currentTarget.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={pending} onClick={handleSave} className="bg-gradient-primary text-white hover:opacity-90">
              {pending ? "Saving..." : session ? "Save changes" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
