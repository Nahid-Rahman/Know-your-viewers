"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateStreamer } from "@/lib/actions/streamers";

const schema = z.object({
  displayName: z.string().min(2, "Enter a display name."),
  platform: z.string().min(1),
  channelUrl: z.string().min(1, "Enter a channel URL."),
  category: z.string().min(1, "Enter a category."),
  status: z.enum(["PENDING", "ACTIVE", "INACTIVE"]),
});

type Values = z.infer<typeof schema>;

export function StreamerEditDialog({
  streamerId,
  defaultValues,
  trigger,
}: {
  streamerId: string;
  defaultValues: Values;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues });

  async function onSubmit(values: Values) {
    setSubmitting(true);
    const result = await updateStreamer(streamerId, values);
    setSubmitting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Streamer updated.");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit streamer</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="edit-streamer-name" className="mb-1.5">Display name</Label>
              <Input id="edit-streamer-name" {...form.register("displayName")} />
            </div>
            <div>
              <Label htmlFor="edit-streamer-platform" className="mb-1.5">Platform</Label>
              <Input id="edit-streamer-platform" {...form.register("platform")} />
            </div>
            <div>
              <Label htmlFor="edit-streamer-channel" className="mb-1.5">Channel URL</Label>
              <Input id="edit-streamer-channel" {...form.register("channelUrl")} />
            </div>
            <div>
              <Label htmlFor="edit-streamer-category" className="mb-1.5">Category</Label>
              <Input id="edit-streamer-category" {...form.register("category")} />
            </div>
            <div>
              <Label className="mb-1.5">Status</Label>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-gradient-primary text-white hover:opacity-90">
                {submitting ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
