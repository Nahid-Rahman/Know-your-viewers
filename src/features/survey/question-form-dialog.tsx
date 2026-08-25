"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createQuestion, updateQuestion } from "@/lib/actions/surveys";

const formSchema = z.object({
  questionText: z.string().min(2, "Enter the question text."),
  questionType: z.enum(["MULTIPLE_CHOICE", "LIKERT", "RATING", "TEXT"]),
  optionsText: z.string().optional(),
  order: z.number().int().min(1),
});

type FormValues = z.infer<typeof formSchema>;

export function QuestionFormDialog({
  surveyId,
  question,
  nextOrder,
  trigger,
}: {
  surveyId: string;
  question?: { id: string; questionText: string; questionType: string; options?: string[] | null; order: number };
  nextOrder: number;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: question
      ? {
          questionText: question.questionText,
          questionType: question.questionType as FormValues["questionType"],
          optionsText: (question.options ?? []).join("\n"),
          order: question.order,
        }
      : { questionText: "", questionType: "TEXT", optionsText: "", order: nextOrder },
  });

  const questionType = useWatch({ control: form.control, name: "questionType" });
  const needsOptions = questionType === "MULTIPLE_CHOICE" || questionType === "LIKERT";

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const payload = {
      questionText: values.questionText,
      questionType: values.questionType,
      options: needsOptions
        ? values.optionsText
            ?.split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
      order: values.order,
    };
    const result = question ? await updateQuestion(question.id, payload) : await createQuestion(surveyId, payload);
    setSubmitting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(question ? "Question updated." : "Question added.");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{question ? "Edit question" : "Add question"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="q-text" className="mb-1.5">Question text</Label>
              <Textarea id="q-text" rows={2} {...form.register("questionText")} />
              {form.formState.errors.questionText && (
                <p className="mt-1 text-xs text-destructive">{form.formState.errors.questionText.message}</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5">Type</Label>
                <Controller
                  control={form.control}
                  name="questionType"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MULTIPLE_CHOICE">Multiple choice</SelectItem>
                        <SelectItem value="LIKERT">Likert</SelectItem>
                        <SelectItem value="RATING">Rating (1-5)</SelectItem>
                        <SelectItem value="TEXT">Text</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label htmlFor="q-order" className="mb-1.5">Order</Label>
                <Input id="q-order" type="number" {...form.register("order", { valueAsNumber: true })} />
              </div>
            </div>
            {needsOptions && (
              <div>
                <Label htmlFor="q-options" className="mb-1.5">Options (one per line)</Label>
                <Textarea id="q-options" rows={4} {...form.register("optionsText")} />
              </div>
            )}
            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-gradient-primary text-white hover:opacity-90">
                {submitting ? "Saving..." : question ? "Save changes" : "Add question"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
