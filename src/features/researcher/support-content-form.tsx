"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateSupportContent, type SupportContentValues } from "@/lib/actions/site-content";
import { ContentSection as Section } from "@/features/researcher/content-form-shared";

const schema = z.object({
  pageTitle: z.string().min(1, "Required."),
  heroEyebrow: z.string().min(1, "Required."),
  heroTitle: z.string().min(1, "Required."),
  heroSubtext: z.string().min(1, "Required."),
  infoCards: z.array(z.object({ icon: z.string().min(1), title: z.string().min(1), description: z.string().min(1) })),
  formFooterText: z.string().min(1, "Required."),
  bottomTrustText: z.string().min(1, "Required."),
});

type FormValues = z.infer<typeof schema>;

export function SupportContentForm({ content }: { content: SupportContentValues }) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: content });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const result = await updateSupportContent(values);
    setSubmitting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Support page content updated.");
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

      <Section title="Info cards">
        {content.infoCards.map((_, i) => (
          <div key={i} className="flex items-start gap-2 rounded-lg border border-border p-3">
            <Input className="w-16" placeholder="Icon" {...form.register(`infoCards.${i}.icon`)} />
            <Input placeholder="Title" {...form.register(`infoCards.${i}.title`)} />
            <Input placeholder="Description" {...form.register(`infoCards.${i}.description`)} />
          </div>
        ))}
      </Section>

      <div className="rounded-xl border border-border bg-card p-6">
        <p className="mb-4 font-semibold">Footer text</p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="formFooterText" className="mb-1.5">Below the support form</Label>
            <Textarea id="formFooterText" rows={2} {...form.register("formFooterText")} />
          </div>
          <div>
            <Label htmlFor="bottomTrustText" className="mb-1.5">Bottom trust strip</Label>
            <Input id="bottomTrustText" {...form.register("bottomTrustText")} />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting} className="bg-gradient-primary text-white hover:opacity-90">
          {submitting ? "Saving..." : "Save Support Page"}
        </Button>
      </div>
    </form>
  );
}
