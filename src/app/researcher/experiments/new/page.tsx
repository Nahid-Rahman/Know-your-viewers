"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const experimentSchema = z.object({
  title: z.string().min(4, "Give the study a descriptive title."),
  description: z.string().min(10, "Describe what this experiment studies."),
  objective: z.string().min(10, "State the research objective."),
  startDate: z.string().min(1, "Choose a start date."),
  endDate: z.string().optional(),
  ethicsApprovalRef: z.string().optional(),
});

type ExperimentValues = z.infer<typeof experimentSchema>;

export default function NewExperimentPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ExperimentValues>({
    resolver: zodResolver(experimentSchema),
    defaultValues: {
      title: "",
      description: "",
      objective: "",
      startDate: "",
      endDate: "",
      ethicsApprovalRef: "",
    },
  });

  async function onSubmit(values: ExperimentValues) {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    if (!values.ethicsApprovalRef) {
      toast.warning("Saved as Draft. An ethics approval reference is required before this can go Active.");
    } else {
      toast.success("Experiment created.");
    }
    router.push("/researcher/experiments");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New Experiment" description="Studies start in Draft and require an ethics approval reference before they can go Active." />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 rounded-xl border border-border bg-card p-6">
        <div>
          <Label htmlFor="title" className="mb-1.5">Title</Label>
          <Input id="title" placeholder="e.g. Persuasion Cues in Viewer Reward Recruitment" {...form.register("title")} />
          {form.formState.errors.title && (
            <p className="mt-1 text-xs text-destructive">{form.formState.errors.title.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="description" className="mb-1.5">Description</Label>
          <Textarea id="description" rows={3} placeholder="What does this study examine?" {...form.register("description")} />
          {form.formState.errors.description && (
            <p className="mt-1 text-xs text-destructive">{form.formState.errors.description.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="objective" className="mb-1.5">Research Objective</Label>
          <Textarea id="objective" rows={2} placeholder="What question should this study answer?" {...form.register("objective")} />
          {form.formState.errors.objective && (
            <p className="mt-1 text-xs text-destructive">{form.formState.errors.objective.message}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="startDate" className="mb-1.5">Start Date</Label>
            <Input id="startDate" type="date" {...form.register("startDate")} />
            {form.formState.errors.startDate && (
              <p className="mt-1 text-xs text-destructive">{form.formState.errors.startDate.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="endDate" className="mb-1.5">End Date (optional)</Label>
            <Input id="endDate" type="date" {...form.register("endDate")} />
          </div>
        </div>

        <div>
          <Label htmlFor="ethicsApprovalRef" className="mb-1.5">Ethics Approval Reference</Label>
          <Input id="ethicsApprovalRef" placeholder="e.g. IRB-2026-0417" {...form.register("ethicsApprovalRef")} />
          <p className="mt-1 text-xs text-muted-foreground">
            Leave blank to save as Draft. Required before the study can be set to Active.
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t border-border pt-5">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="bg-gradient-primary text-white hover:opacity-90">
            {submitting ? "Creating..." : "Create Experiment"}
          </Button>
        </div>
      </form>
    </div>
  );
}
