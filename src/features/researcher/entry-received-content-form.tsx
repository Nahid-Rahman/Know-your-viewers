"use client";

import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateEntryReceivedContent, type EntryReceivedContentValues } from "@/lib/actions/site-content";
import { ContentSection as Section, RemoveRowButton } from "@/features/researcher/content-form-shared";

const schema = z.object({
  badgeText: z.string().min(1, "Required."),
  title: z.string().min(1, "Required."),
  subtext: z.string().min(1, "Required."),
  resultLabel: z.string().min(1, "Required."),
  resultCaption: z.string().min(1, "Required."),
  submittedDetailsLabel: z.string().min(1, "Required."),
  trustItems: z.array(z.object({ value: z.string().min(1) })),
});

type FormValues = z.infer<typeof schema>;

export function EntryReceivedContentForm({ content }: { content: EntryReceivedContentValues }) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ...content, trustItems: content.trustItems.map((value) => ({ value })) },
  });

  const trustItems = useFieldArray({ control: form.control, name: "trustItems" });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const result = await updateEntryReceivedContent({
      ...values,
      trustItems: values.trustItems.map((o) => o.value),
    });
    setSubmitting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Entry confirmation content updated.");
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="mb-4 font-semibold">Confirmation</p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="badgeText" className="mb-1.5">Badge text</Label>
            <Input id="badgeText" {...form.register("badgeText")} />
          </div>
          <div>
            <Label htmlFor="title" className="mb-1.5">Title</Label>
            <Input id="title" {...form.register("title")} />
          </div>
          <div>
            <Label htmlFor="subtext" className="mb-1.5">Subtext</Label>
            <Textarea id="subtext" rows={2} {...form.register("subtext")} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <p className="mb-4 font-semibold">Result card</p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="resultLabel" className="mb-1.5">Label</Label>
            <Input id="resultLabel" {...form.register("resultLabel")} />
          </div>
          <div>
            <Label htmlFor="resultCaption" className="mb-1.5">Caption</Label>
            <Input id="resultCaption" {...form.register("resultCaption")} />
          </div>
          <div>
            <Label htmlFor="submittedDetailsLabel" className="mb-1.5">Submitted-details label</Label>
            <Input id="submittedDetailsLabel" {...form.register("submittedDetailsLabel")} />
          </div>
        </div>
      </div>

      <Section title="Trust strip items" onAdd={() => trustItems.append({ value: "" })}>
        {trustItems.fields.map((field, i) => (
          <div key={field.id} className="flex items-center gap-2">
            <Input {...form.register(`trustItems.${i}.value`)} />
            <RemoveRowButton onClick={() => trustItems.remove(i)} />
          </div>
        ))}
      </Section>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting} className="bg-gradient-primary text-white hover:opacity-90">
          {submitting ? "Saving..." : "Save Entry Confirmation"}
        </Button>
      </div>
    </form>
  );
}
