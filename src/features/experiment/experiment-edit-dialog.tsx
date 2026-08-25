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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateExperiment } from "@/lib/actions/experiments";

const schema = z.object({
  title: z.string().min(4, "Give the study a descriptive title."),
  description: z.string().min(10, "Describe what this experiment studies."),
  objective: z.string().min(10, "State the research objective."),
  startDate: z.string().min(1, "Choose a start date."),
  endDate: z.string().optional(),
  ethicsApprovalRef: z.string().optional(),
});

type Values = z.infer<typeof schema>;

export function ExperimentEditDialog({
  experimentId,
  defaultValues,
  trigger,
}: {
  experimentId: string;
  defaultValues: Values;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues });

  async function onSubmit(values: Values) {
    setSubmitting(true);
    const result = await updateExperiment(experimentId, values);
    setSubmitting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Experiment updated.");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit experiment</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="edit-title" className="mb-1.5">Title</Label>
              <Input id="edit-title" {...form.register("title")} />
              {form.formState.errors.title && (
                <p className="mt-1 text-xs text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-description" className="mb-1.5">Description</Label>
              <Textarea id="edit-description" rows={3} {...form.register("description")} />
              {form.formState.errors.description && (
                <p className="mt-1 text-xs text-destructive">{form.formState.errors.description.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-objective" className="mb-1.5">Research Objective</Label>
              <Textarea id="edit-objective" rows={2} {...form.register("objective")} />
              {form.formState.errors.objective && (
                <p className="mt-1 text-xs text-destructive">{form.formState.errors.objective.message}</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="edit-startDate" className="mb-1.5">Start Date</Label>
                <Input id="edit-startDate" type="date" {...form.register("startDate")} />
                {form.formState.errors.startDate && (
                  <p className="mt-1 text-xs text-destructive">{form.formState.errors.startDate.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="edit-endDate" className="mb-1.5">End Date (optional)</Label>
                <Input id="edit-endDate" type="date" {...form.register("endDate")} />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-ethicsApprovalRef" className="mb-1.5">Ethics Approval Reference</Label>
              <Input id="edit-ethicsApprovalRef" {...form.register("ethicsApprovalRef")} />
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
