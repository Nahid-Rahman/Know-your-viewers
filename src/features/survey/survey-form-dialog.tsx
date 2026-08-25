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
import { createSurvey, updateSurvey } from "@/lib/actions/surveys";

const schema = z.object({
  title: z.string().min(2, "Give the survey a title."),
  description: z.string().optional(),
});

type Values = z.infer<typeof schema>;

export function SurveyFormDialog({
  experimentId,
  survey,
  trigger,
}: {
  experimentId: string;
  survey?: { id: string; title: string; description: string };
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: survey ?? { title: "", description: "" },
  });

  async function onSubmit(values: Values) {
    setSubmitting(true);
    const result = survey ? await updateSurvey(survey.id, values) : await createSurvey(experimentId, values);
    setSubmitting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(survey ? "Survey updated." : "Survey created.");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{survey ? "Edit survey" : "New survey"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="survey-title" className="mb-1.5">Title</Label>
              <Input id="survey-title" {...form.register("title")} />
              {form.formState.errors.title && (
                <p className="mt-1 text-xs text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="survey-description" className="mb-1.5">Description (optional)</Label>
              <Textarea id="survey-description" rows={2} {...form.register("description")} />
            </div>
            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-gradient-primary text-white hover:opacity-90">
                {submitting ? "Saving..." : survey ? "Save changes" : "Create survey"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
