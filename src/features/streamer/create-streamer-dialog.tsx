"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CopyableCode } from "@/components/common/copyable-code";
import { createStreamerAccount } from "@/lib/actions/streamers";

const schema = z.object({
  name: z.string().min(2, "Enter a name."),
  email: z.string().email("Enter a valid email address."),
  platform: z.string().min(1, "Enter a platform."),
  channelUrl: z.string().min(1, "Enter a channel URL."),
  category: z.string().min(1, "Enter a category."),
});

type Values = z.infer<typeof schema>;

export function CreateStreamerDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", platform: "", channelUrl: "", category: "" },
  });

  async function onSubmit(values: Values) {
    setSubmitting(true);
    const result = await createStreamerAccount(values);
    setSubmitting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setCreated({ email: values.email, tempPassword: result.tempPassword });
    form.reset();
    router.refresh();
  }

  function handleClose(next: boolean) {
    setOpen(next);
    if (!next) setCreated(null);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-gradient-primary text-white hover:opacity-90">
        New Streamer
      </Button>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          {created ? (
            <>
              <DialogHeader>
                <DialogTitle>Streamer account created</DialogTitle>
                <DialogDescription>
                  Share these login details with the streamer — this password is shown only once.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="mb-1 text-xs text-muted-foreground uppercase">Email</p>
                  <CopyableCode value={created.email} />
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground uppercase">Temporary password</p>
                  <CopyableCode value={created.tempPassword} />
                </div>
              </div>
              <div className="flex justify-end border-t border-border pt-4">
                <Button onClick={() => handleClose(false)}>Done</Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>New streamer</DialogTitle>
                <DialogDescription>Creates a real login for them — no self-registration needed.</DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="streamer-name" className="mb-1.5">Name</Label>
                  <Input id="streamer-name" {...form.register("name")} />
                  {form.formState.errors.name && (
                    <p className="mt-1 text-xs text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="streamer-email" className="mb-1.5">Email</Label>
                  <Input id="streamer-email" type="email" {...form.register("email")} />
                  {form.formState.errors.email && (
                    <p className="mt-1 text-xs text-destructive">{form.formState.errors.email.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="streamer-platform" className="mb-1.5">Platform</Label>
                  <Input id="streamer-platform" placeholder="Twitch, YouTube, ..." {...form.register("platform")} />
                  {form.formState.errors.platform && (
                    <p className="mt-1 text-xs text-destructive">{form.formState.errors.platform.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="streamer-channelUrl" className="mb-1.5">Channel URL</Label>
                  <Input id="streamer-channelUrl" {...form.register("channelUrl")} />
                  {form.formState.errors.channelUrl && (
                    <p className="mt-1 text-xs text-destructive">{form.formState.errors.channelUrl.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="streamer-category" className="mb-1.5">Category</Label>
                  <Input id="streamer-category" {...form.register("category")} />
                  {form.formState.errors.category && (
                    <p className="mt-1 text-xs text-destructive">{form.formState.errors.category.message}</p>
                  )}
                </div>
                <div className="flex justify-end gap-3 border-t border-border pt-4">
                  <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting} className="bg-gradient-primary text-white hover:opacity-90">
                    {submitting ? "Creating..." : "Create streamer"}
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
