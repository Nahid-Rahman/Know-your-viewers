"use client";

import { cloneElement, isValidElement, useState, type ReactElement } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createCondition, updateCondition, type ConditionFormValues } from "@/lib/actions/conditions";

const schema = z.object({
  name: z.string().min(2, "Name is required."),
  urgencyEnabled: z.boolean(),
  socialProofEnabled: z.boolean(),
  authorityBadgesEnabled: z.boolean(),
  rewardRarity: z.enum(["COMMON", "RARE", "EXCEPTIONAL", "PREMIUM"]),
  contactRequirement: z.enum(["OPTIONAL", "REQUIRED"]),
});

type Existing = ConditionFormValues & { id: string };

export function ConditionFormDialog({
  experimentId,
  condition,
  trigger,
}: {
  experimentId: string;
  condition?: Existing;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: condition ?? {
      name: "",
      urgencyEnabled: false,
      socialProofEnabled: false,
      authorityBadgesEnabled: false,
      rewardRarity: "COMMON",
      contactRequirement: "OPTIONAL",
    },
  });

  async function onSubmit(values: z.infer<typeof schema>) {
    setSubmitting(true);
    const result = condition
      ? await updateCondition(condition.id, values)
      : await createCondition(experimentId, values);
    setSubmitting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(condition ? "Condition updated." : "Condition created.");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      {isValidElement(trigger)
        ? cloneElement(trigger as ReactElement<{ onClick?: () => void }>, { onClick: () => setOpen(true) })
        : trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{condition ? "Edit condition" : "New condition"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="cond-name" className="mb-1.5">Name</Label>
              <Input id="cond-name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="mt-1 text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="cond-urgency">Urgency (countdown)</Label>
                <Controller
                  control={form.control}
                  name="urgencyEnabled"
                  render={({ field }) => (
                    <Switch id="cond-urgency" checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="cond-social">Social proof</Label>
                <Controller
                  control={form.control}
                  name="socialProofEnabled"
                  render={({ field }) => (
                    <Switch id="cond-social" checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="cond-authority">Authority badges</Label>
                <Controller
                  control={form.control}
                  name="authorityBadgesEnabled"
                  render={({ field }) => (
                    <Switch id="cond-authority" checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5">Reward rarity</Label>
                <Controller
                  control={form.control}
                  name="rewardRarity"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COMMON">Common</SelectItem>
                        <SelectItem value="RARE">Rare</SelectItem>
                        <SelectItem value="EXCEPTIONAL">Exceptional</SelectItem>
                        <SelectItem value="PREMIUM">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label className="mb-1.5">Contact requirement</Label>
                <Controller
                  control={form.control}
                  name="contactRequirement"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPTIONAL">Optional</SelectItem>
                        <SelectItem value="REQUIRED">Required</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-gradient-primary text-white hover:opacity-90">
                {submitting ? "Saving..." : condition ? "Save changes" : "Create condition"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
