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
import { updateDebriefContent, type DebriefContentValues } from "@/lib/actions/site-content";
import { ContentSection as Section, RemoveRowButton } from "@/features/researcher/content-form-shared";

const schema = z.object({
  heroLabel: z.string().min(1, "Required."),
  title: z.string().min(1, "Required."),
  introParagraph: z.string().min(1, "Required."),
  simulatedElementsTitle: z.string().min(1, "Required."),
  simulatedElements: z.array(z.object({ value: z.string().min(1) })),
  dataUsageTitle: z.string().min(1, "Required."),
  dataUsageParagraph: z.string().min(1, "Required."),
  choiceTitle: z.string().min(1, "Required."),
  choiceParagraph: z.string().min(1, "Required."),
  grantedMessage: z.string().min(1, "Required."),
  declinedMessage: z.string().min(1, "Required."),
  footerContactText: z.string().min(1, "Required."),
});

type FormValues = z.infer<typeof schema>;

export function DebriefContentForm({ content }: { content: DebriefContentValues }) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...content,
      simulatedElements: content.simulatedElements.map((value) => ({ value })),
    },
  });

  const simulatedElements = useFieldArray({ control: form.control, name: "simulatedElements" });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const result = await updateDebriefContent({
      ...values,
      simulatedElements: values.simulatedElements.map((o) => o.value),
    });
    setSubmitting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Debrief page content updated.");
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <p className="rounded-xl border border-primary/25 bg-primary/5 p-4 text-xs text-muted-foreground">
        This is the post-study consent/deception disclosure page — please review any change with your
        ethics board before saving.
      </p>

      <div className="rounded-xl border border-border bg-card p-6">
        <p className="mb-4 font-semibold">Header</p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="heroLabel" className="mb-1.5">Eyebrow label</Label>
            <Input id="heroLabel" {...form.register("heroLabel")} />
          </div>
          <div>
            <Label htmlFor="title" className="mb-1.5">Title</Label>
            <Textarea id="title" rows={2} {...form.register("title")} />
          </div>
          <div>
            <Label htmlFor="introParagraph" className="mb-1.5">Intro paragraph</Label>
            <Textarea id="introParagraph" rows={4} {...form.register("introParagraph")} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <p className="mb-4 font-semibold">What was simulated</p>
        <Label htmlFor="simulatedElementsTitle" className="mb-1.5">Card title</Label>
        <Input id="simulatedElementsTitle" {...form.register("simulatedElementsTitle")} />
      </div>

      <Section title="Simulated elements" onAdd={() => simulatedElements.append({ value: "" })}>
        {simulatedElements.fields.map((field, i) => (
          <div key={field.id} className="flex items-center gap-2">
            <Textarea rows={2} {...form.register(`simulatedElements.${i}.value`)} />
            <RemoveRowButton onClick={() => simulatedElements.remove(i)} />
          </div>
        ))}
      </Section>

      <div className="rounded-xl border border-border bg-card p-6">
        <p className="mb-4 font-semibold">Data usage</p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="dataUsageTitle" className="mb-1.5">Card title</Label>
            <Input id="dataUsageTitle" {...form.register("dataUsageTitle")} />
          </div>
          <div>
            <Label htmlFor="dataUsageParagraph" className="mb-1.5">Paragraph</Label>
            <Textarea id="dataUsageParagraph" rows={4} {...form.register("dataUsageParagraph")} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <p className="mb-4 font-semibold">Consent choice</p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="choiceTitle" className="mb-1.5">Card title</Label>
            <Input id="choiceTitle" {...form.register("choiceTitle")} />
          </div>
          <div>
            <Label htmlFor="choiceParagraph" className="mb-1.5">Paragraph</Label>
            <Textarea id="choiceParagraph" rows={2} {...form.register("choiceParagraph")} />
          </div>
          <div>
            <Label htmlFor="grantedMessage" className="mb-1.5">Message after granting consent</Label>
            <Textarea id="grantedMessage" rows={2} {...form.register("grantedMessage")} />
          </div>
          <div>
            <Label htmlFor="declinedMessage" className="mb-1.5">Message after declining consent</Label>
            <Textarea id="declinedMessage" rows={2} {...form.register("declinedMessage")} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <p className="mb-4 font-semibold">Footer</p>
        <Label htmlFor="footerContactText" className="mb-1.5">Contact text (links to the support page follow automatically)</Label>
        <Textarea id="footerContactText" rows={2} {...form.register("footerContactText")} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting} className="bg-gradient-primary text-white hover:opacity-90">
          {submitting ? "Saving..." : "Save Debrief Page"}
        </Button>
      </div>
    </form>
  );
}
