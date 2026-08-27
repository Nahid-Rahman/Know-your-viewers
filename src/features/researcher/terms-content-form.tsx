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
import { updateTermsContent, type TermsContentValues } from "@/lib/actions/site-content";
import { ContentSection as Section, RemoveRowButton } from "@/features/researcher/content-form-shared";

const schema = z.object({
  pageTitle: z.string().min(1, "Required."),
  heroEyebrow: z.string().min(1, "Required."),
  heroTitle: z.string().min(1, "Required."),
  heroSubtext: z.string().min(1, "Required."),
  heroBadges: z.array(z.object({ value: z.string().min(1) })),
  section1Eyebrow: z.string().min(1, "Required."),
  section1Title: z.string().min(1, "Required."),
  section1Description: z.string().min(1, "Required."),
  summaryItems: z.array(z.object({ value: z.string().min(1) })),
  section2Eyebrow: z.string().min(1, "Required."),
  section2Title: z.string().min(1, "Required."),
  section2Description: z.string().min(1, "Required."),
  infoWeUse: z.array(z.object({ icon: z.string().min(1), label: z.string().min(1) })),
  safetyNoticeEyebrow: z.string().min(1, "Required."),
  safetyNoticeTitle: z.string().min(1, "Required."),
  safetyNoticeDescription: z.string().min(1, "Required."),
  neverCollect: z.array(z.object({ value: z.string().min(1) })),
  section4Eyebrow: z.string().min(1, "Required."),
  section4Title: z.string().min(1, "Required."),
  section4Description: z.string().min(1, "Required."),
  sampleResponseCode: z.string().min(1, "Required."),
  ctaTitle: z.string().min(1, "Required."),
  ctaDescription: z.string().min(1, "Required."),
});

type FormValues = z.infer<typeof schema>;

export function TermsContentForm({ content }: { content: TermsContentValues }) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...content,
      heroBadges: content.heroBadges.map((value) => ({ value })),
      summaryItems: content.summaryItems.map((value) => ({ value })),
      neverCollect: content.neverCollect.map((value) => ({ value })),
    },
  });

  const heroBadges = useFieldArray({ control: form.control, name: "heroBadges" });
  const summaryItems = useFieldArray({ control: form.control, name: "summaryItems" });
  const infoWeUse = useFieldArray({ control: form.control, name: "infoWeUse" });
  const neverCollect = useFieldArray({ control: form.control, name: "neverCollect" });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const result = await updateTermsContent({
      ...values,
      heroBadges: values.heroBadges.map((o) => o.value),
      summaryItems: values.summaryItems.map((o) => o.value),
      neverCollect: values.neverCollect.map((o) => o.value),
    });
    setSubmitting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Terms page content updated.");
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="mb-4 font-semibold">Page</p>
        <Label htmlFor="pageTitle" className="mb-1.5">Browser tab title</Label>
        <Input id="pageTitle" {...form.register("pageTitle")} />
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

      <Section title="Hero badges" onAdd={() => heroBadges.append({ value: "" })}>
        {heroBadges.fields.map((field, i) => (
          <div key={field.id} className="flex items-center gap-2">
            <Input {...form.register(`heroBadges.${i}.value`)} />
            <RemoveRowButton onClick={() => heroBadges.remove(i)} />
          </div>
        ))}
      </Section>

      <div className="rounded-xl border border-border bg-card p-6">
        <p className="mb-4 font-semibold">Section 01 — Event terms summary</p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="section1Eyebrow" className="mb-1.5">Section label</Label>
            <Input id="section1Eyebrow" {...form.register("section1Eyebrow")} />
          </div>
          <div>
            <Label htmlFor="section1Title" className="mb-1.5">Title</Label>
            <Input id="section1Title" {...form.register("section1Title")} />
          </div>
          <div>
            <Label htmlFor="section1Description" className="mb-1.5">Description</Label>
            <Textarea id="section1Description" rows={2} {...form.register("section1Description")} />
          </div>
        </div>
      </div>

      <Section title="Summary items" onAdd={() => summaryItems.append({ value: "" })}>
        {summaryItems.fields.map((field, i) => (
          <div key={field.id} className="flex items-center gap-2">
            <Input {...form.register(`summaryItems.${i}.value`)} />
            <RemoveRowButton onClick={() => summaryItems.remove(i)} />
          </div>
        ))}
      </Section>

      <div className="rounded-xl border border-border bg-card p-6">
        <p className="mb-4 font-semibold">Section 02 — Information we use</p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="section2Eyebrow" className="mb-1.5">Section label</Label>
            <Input id="section2Eyebrow" {...form.register("section2Eyebrow")} />
          </div>
          <div>
            <Label htmlFor="section2Title" className="mb-1.5">Title</Label>
            <Input id="section2Title" {...form.register("section2Title")} />
          </div>
          <div>
            <Label htmlFor="section2Description" className="mb-1.5">Description</Label>
            <Textarea id="section2Description" rows={2} {...form.register("section2Description")} />
          </div>
        </div>
      </div>

      <Section title="Information-we-use rows" onAdd={() => infoWeUse.append({ icon: "", label: "" })}>
        {infoWeUse.fields.map((field, i) => (
          <div key={field.id} className="flex items-center gap-2">
            <Input className="w-16" placeholder="Icon" {...form.register(`infoWeUse.${i}.icon`)} />
            <Input placeholder="Label" {...form.register(`infoWeUse.${i}.label`)} />
            <RemoveRowButton onClick={() => infoWeUse.remove(i)} />
          </div>
        ))}
      </Section>

      <div className="rounded-xl border border-border bg-card p-6">
        <p className="mb-4 font-semibold">Safety notice</p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="safetyNoticeEyebrow" className="mb-1.5">Section label</Label>
            <Input id="safetyNoticeEyebrow" {...form.register("safetyNoticeEyebrow")} />
          </div>
          <div>
            <Label htmlFor="safetyNoticeTitle" className="mb-1.5">Title</Label>
            <Textarea id="safetyNoticeTitle" rows={2} {...form.register("safetyNoticeTitle")} />
            <p className="mt-1 text-xs text-muted-foreground">Wrap text in **double asterisks** to highlight it.</p>
          </div>
          <div>
            <Label htmlFor="safetyNoticeDescription" className="mb-1.5">Description</Label>
            <Textarea id="safetyNoticeDescription" rows={2} {...form.register("safetyNoticeDescription")} />
          </div>
        </div>
      </div>

      <Section title="Never collect list" onAdd={() => neverCollect.append({ value: "" })}>
        {neverCollect.fields.map((field, i) => (
          <div key={field.id} className="flex items-center gap-2">
            <Input {...form.register(`neverCollect.${i}.value`)} />
            <RemoveRowButton onClick={() => neverCollect.remove(i)} />
          </div>
        ))}
      </Section>

      <div className="rounded-xl border border-border bg-card p-6">
        <p className="mb-4 font-semibold">Section 04 — Follow-up contact</p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="section4Eyebrow" className="mb-1.5">Section label</Label>
            <Input id="section4Eyebrow" {...form.register("section4Eyebrow")} />
          </div>
          <div>
            <Label htmlFor="section4Title" className="mb-1.5">Title</Label>
            <Input id="section4Title" {...form.register("section4Title")} />
          </div>
          <div>
            <Label htmlFor="section4Description" className="mb-1.5">Description</Label>
            <Textarea id="section4Description" rows={2} {...form.register("section4Description")} />
          </div>
          <div>
            <Label htmlFor="sampleResponseCode" className="mb-1.5">Sample response code</Label>
            <Input id="sampleResponseCode" {...form.register("sampleResponseCode")} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <p className="mb-4 font-semibold">Ready-to-participate CTA</p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="ctaTitle" className="mb-1.5">Title</Label>
            <Input id="ctaTitle" {...form.register("ctaTitle")} />
          </div>
          <div>
            <Label htmlFor="ctaDescription" className="mb-1.5">Description</Label>
            <Textarea id="ctaDescription" rows={2} {...form.register("ctaDescription")} />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting} className="bg-gradient-primary text-white hover:opacity-90">
          {submitting ? "Saving..." : "Save Terms Page"}
        </Button>
      </div>
    </form>
  );
}
