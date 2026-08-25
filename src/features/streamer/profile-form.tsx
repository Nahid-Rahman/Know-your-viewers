"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateStreamerProfile } from "@/lib/actions/settings";

const streamerProfileSchema = z.object({
  displayName: z.string().min(2, "Enter a display name."),
  platform: z.string().min(1),
  channelUrl: z.string().min(1, "Enter your channel URL."),
  category: z.string().min(1, "Enter a category."),
});

type StreamerProfileValues = z.infer<typeof streamerProfileSchema>;

export function StreamerProfileForm({ defaultValues }: { defaultValues: StreamerProfileValues }) {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<StreamerProfileValues>({
    resolver: zodResolver(streamerProfileSchema),
    defaultValues,
  });

  async function onSubmit(values: StreamerProfileValues) {
    setSubmitting(true);
    const result = await updateStreamerProfile(values);
    setSubmitting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Profile updated.");
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="displayName" className="mb-1.5">Display Name</Label>
          <Input id="displayName" {...form.register("displayName")} />
          {form.formState.errors.displayName && (
            <p className="mt-1 text-xs text-destructive">{form.formState.errors.displayName.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="platform" className="mb-1.5">Platform</Label>
          <Input id="platform" {...form.register("platform")} disabled />
        </div>
        <div>
          <Label htmlFor="channelUrl" className="mb-1.5">Channel URL</Label>
          <Input id="channelUrl" {...form.register("channelUrl")} />
          {form.formState.errors.channelUrl && (
            <p className="mt-1 text-xs text-destructive">{form.formState.errors.channelUrl.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="category" className="mb-1.5">Category</Label>
          <Input id="category" {...form.register("category")} />
          {form.formState.errors.category && (
            <p className="mt-1 text-xs text-destructive">{form.formState.errors.category.message}</p>
          )}
        </div>
      </div>
      <Button type="submit" disabled={submitting} className="mt-5">
        {submitting ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
