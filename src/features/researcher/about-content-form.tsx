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
import { updateAboutContent, type AboutContentValues } from "@/lib/actions/site-content";
import { ContentSection as Section, RemoveRowButton } from "@/features/researcher/content-form-shared";

const schema = z.object({
  pageTitle: z.string().min(1, "Required."),
  heroEyebrow: z.string().min(1, "Required."),
  heroTitle: z.string().min(1, "Required."),
  heroSubtext: z.string().min(1, "Required."),
  liveBadges: z.array(z.object({ value: z.string().min(1) })),
  whatIsEyebrow: z.string().min(1, "Required."),
  whatIsTitle: z.string().min(1, "Required."),
  whatIsDescription: z.string().min(1, "Required."),
  howItWorksEyebrow: z.string().min(1, "Required."),
  howItWorksTitle: z.string().min(1, "Required."),
  steps: z.array(z.object({ title: z.string().min(1), description: z.string().min(1) })),
  infoRequiredEyebrow: z.string().min(1, "Required."),
  infoRequiredTitle: z.string().min(1, "Required."),
  infoRequiredDescription: z.string().min(1, "Required."),
  requiredFields: z.array(z.object({ value: z.string().min(1) })),
  statFieldsTotalValue: z.string().min(1, "Required."),
  statFieldsTotalLabel: z.string().min(1, "Required."),
  statSensitiveDataValue: z.string().min(1, "Required."),
  statSensitiveDataLabel: z.string().min(1, "Required."),
  safetyEyebrow: z.string().min(1, "Required."),
  safetyTitle: z.string().min(1, "Required."),
  safetyDescription: z.string().min(1, "Required."),
  neverCollected: z.array(z.object({ value: z.string().min(1) })),
});

type FormValues = z.infer<typeof schema>;

export function AboutContentForm({ content }: { content: AboutContentValues }) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...content,
      liveBadges: content.liveBadges.map((value) => ({ value })),
      requiredFields: content.requiredFields.map((value) => ({ value })),
      neverCollected: content.neverCollected.map((value) => ({ value })),
    },
  });

  const liveBadges = useFieldArray({ control: form.control, name: "liveBadges" });
  const steps = useFieldArray({ control: form.control, name: "steps" });
  const requiredFields = useFieldArray({ control: form.control, name: "requiredFields" });
  const neverCollected = useFieldArray({ control: form.control, name: "neverCollected" });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const result = await updateAboutContent({
      ...values,
      liveBadges: values.liveBadges.map((o) => o.value),
      requiredFields: values.requiredFields.map((o) => o.value),
      neverCollected: values.neverCollected.map((o) => o.value),
    });
    setSubmitting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("About page content updated.");
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="mb-4 font-semibold">Page</p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="pageTitle" className="mb-1.5">Browser tab title</Label>
            <Input id="pageTitle" {...form.register("pageTitle")} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <p className="mb-4 font-semibold">Hero</p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="heroEyebrow" className="mb-1.5">Eyebrow label</Label>
            <Input id="heroEyebrow" {...form.register("heroEyebrow")} />
          </div>
          <div>
            <Label htmlFor="heroTitle" className="mb-1.5">Title</Label>
            <Textarea id="heroTitle" rows={2} {...form.register("heroTitle")} />
            <p className="mt-1 text-xs text-muted-foreground">
              Use a new line to break lines, and wrap text in **double asterisks** to highlight it.
            </p>
          </div>
          <div>
            <Label htmlFor="heroSubtext" className="mb-1.5">Subtext</Label>
            <Textarea id="heroSubtext" rows={2} {...form.register("heroSubtext")} />
          </div>
        </div>
      </div>

      <Section title="Live badges" onAdd={() => liveBadges.append({ value: "" })}>
        {liveBadges.fields.map((field, i) => (
          <div key={field.id} className="flex items-center gap-2">
            <Input {...form.register(`liveBadges.${i}.value`)} />
            <RemoveRowButton onClick={() => liveBadges.remove(i)} />
          </div>
        ))}
      </Section>

      <div className="rounded-xl border border-border bg-card p-6">
        <p className="mb-4 font-semibold">&quot;What is&quot; card</p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="whatIsEyebrow" className="mb-1.5">Eyebrow label</Label>
            <Input id="whatIsEyebrow" {...form.register("whatIsEyebrow")} />
          </div>
          <div>
            <Label htmlFor="whatIsTitle" className="mb-1.5">Title</Label>
            <Input id="whatIsTitle" {...form.register("whatIsTitle")} />
          </div>
          <div>
            <Label htmlFor="whatIsDescription" className="mb-1.5">Description</Label>
            <Textarea id="whatIsDescription" rows={2} {...form.register("whatIsDescription")} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <p className="mb-4 font-semibold">How it works</p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="howItWorksEyebrow" className="mb-1.5">Eyebrow label</Label>
            <Input id="howItWorksEyebrow" {...form.register("howItWorksEyebrow")} />
          </div>
          <div>
            <Label htmlFor="howItWorksTitle" className="mb-1.5">Title</Label>
            <Input id="howItWorksTitle" {...form.register("howItWorksTitle")} />
          </div>
        </div>
      </div>

      <Section title="Steps">
        {steps.fields.map((field, i) => (
          <div key={field.id} className="space-y-2 rounded-lg border border-border p-3">
            <Input placeholder="Title" {...form.register(`steps.${i}.title`)} />
            <Textarea rows={2} placeholder="Description" {...form.register(`steps.${i}.description`)} />
          </div>
        ))}
      </Section>

      <div className="rounded-xl border border-border bg-card p-6">
        <p className="mb-4 font-semibold">Information required</p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="infoRequiredEyebrow" className="mb-1.5">Eyebrow label</Label>
            <Input id="infoRequiredEyebrow" {...form.register("infoRequiredEyebrow")} />
          </div>
          <div>
            <Label htmlFor="infoRequiredTitle" className="mb-1.5">Title</Label>
            <Input id="infoRequiredTitle" {...form.register("infoRequiredTitle")} />
          </div>
          <div>
            <Label htmlFor="infoRequiredDescription" className="mb-1.5">Description</Label>
            <Textarea id="infoRequiredDescription" rows={2} {...form.register("infoRequiredDescription")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="statFieldsTotalValue" className="mb-1.5">Stat 1 value</Label>
              <Input id="statFieldsTotalValue" {...form.register("statFieldsTotalValue")} />
            </div>
            <div>
              <Label htmlFor="statFieldsTotalLabel" className="mb-1.5">Stat 1 label</Label>
              <Input id="statFieldsTotalLabel" {...form.register("statFieldsTotalLabel")} />
            </div>
            <div>
              <Label htmlFor="statSensitiveDataValue" className="mb-1.5">Stat 2 value</Label>
              <Input id="statSensitiveDataValue" {...form.register("statSensitiveDataValue")} />
            </div>
            <div>
              <Label htmlFor="statSensitiveDataLabel" className="mb-1.5">Stat 2 label</Label>
              <Input id="statSensitiveDataLabel" {...form.register("statSensitiveDataLabel")} />
            </div>
          </div>
        </div>
      </div>

      <Section title="Required fields list" onAdd={() => requiredFields.append({ value: "" })}>
        {requiredFields.fields.map((field, i) => (
          <div key={field.id} className="flex items-center gap-2">
            <Input {...form.register(`requiredFields.${i}.value`)} />
            <RemoveRowButton onClick={() => requiredFields.remove(i)} />
          </div>
        ))}
      </Section>

      <div className="rounded-xl border border-border bg-card p-6">
        <p className="mb-4 font-semibold">Safety &amp; trust</p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="safetyEyebrow" className="mb-1.5">Eyebrow label</Label>
            <Input id="safetyEyebrow" {...form.register("safetyEyebrow")} />
          </div>
          <div>
            <Label htmlFor="safetyTitle" className="mb-1.5">Title</Label>
            <Input id="safetyTitle" {...form.register("safetyTitle")} />
          </div>
          <div>
            <Label htmlFor="safetyDescription" className="mb-1.5">Description</Label>
            <Textarea id="safetyDescription" rows={2} {...form.register("safetyDescription")} />
          </div>
        </div>
      </div>

      <Section title="Never collected list" onAdd={() => neverCollected.append({ value: "" })}>
        {neverCollected.fields.map((field, i) => (
          <div key={field.id} className="flex items-center gap-2">
            <Input {...form.register(`neverCollected.${i}.value`)} />
            <RemoveRowButton onClick={() => neverCollected.remove(i)} />
          </div>
        ))}
      </Section>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting} className="bg-gradient-primary text-white hover:opacity-90">
          {submitting ? "Saving..." : "Save About Page"}
        </Button>
      </div>
    </form>
  );
}
