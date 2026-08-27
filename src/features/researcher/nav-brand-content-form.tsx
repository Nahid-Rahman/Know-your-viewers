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
import { updateBrandNavContent, type BrandNavValues } from "@/lib/actions/site-content";
import { ContentSection as Section, RemoveRowButton } from "@/features/researcher/content-form-shared";

const schema = z.object({
  siteName: z.string().min(1, "Required."),
  siteDescription: z.string().min(1, "Required."),
  navContent: z.object({
    links: z.array(z.object({ href: z.string().min(1), label: z.string().min(1) })),
    ctaLabel: z.string().min(1, "Required."),
  }),
  footerContent: z.object({
    links: z.array(z.object({ href: z.string().min(1), label: z.string().min(1) })),
    copyrightText: z.string().min(1, "Required."),
    disclaimerText: z.string().min(1, "Required."),
  }),
});

type FormValues = z.infer<typeof schema>;

export function NavBrandContentForm({ content }: { content: BrandNavValues }) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: content });

  const navLinks = useFieldArray({ control: form.control, name: "navContent.links" });
  const footerLinks = useFieldArray({ control: form.control, name: "footerContent.links" });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const result = await updateBrandNavContent(values);
    setSubmitting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Brand and navigation updated.");
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="mb-4 font-semibold">Brand</p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="siteName" className="mb-1.5">Site name (navbar, footer, browser tab)</Label>
            <Input id="siteName" {...form.register("siteName")} />
          </div>
          <div>
            <Label htmlFor="siteDescription" className="mb-1.5">Site description (SEO / browser metadata)</Label>
            <Textarea id="siteDescription" rows={2} {...form.register("siteDescription")} />
          </div>
        </div>
      </div>

      <Section title="Navbar links" onAdd={() => navLinks.append({ href: "/", label: "" })}>
        {navLinks.fields.map((field, i) => (
          <div key={field.id} className="flex items-center gap-2">
            <Input placeholder="Label" {...form.register(`navContent.links.${i}.label`)} />
            <Input placeholder="Path (e.g. /support)" {...form.register(`navContent.links.${i}.href`)} />
            <RemoveRowButton onClick={() => navLinks.remove(i)} />
          </div>
        ))}
        <div className="pt-2">
          <Label htmlFor="navContent.ctaLabel" className="mb-1.5">Navbar CTA button text</Label>
          <Input id="navContent.ctaLabel" {...form.register("navContent.ctaLabel")} />
        </div>
      </Section>

      <Section title="Footer links" onAdd={() => footerLinks.append({ href: "/", label: "" })}>
        {footerLinks.fields.map((field, i) => (
          <div key={field.id} className="flex items-center gap-2">
            <Input placeholder="Label" {...form.register(`footerContent.links.${i}.label`)} />
            <Input placeholder="Path (e.g. /support)" {...form.register(`footerContent.links.${i}.href`)} />
            <RemoveRowButton onClick={() => footerLinks.remove(i)} />
          </div>
        ))}
        <div className="grid gap-4 pt-2 sm:grid-cols-2">
          <div>
            <Label htmlFor="footerContent.copyrightText" className="mb-1.5">Copyright line</Label>
            <Input id="footerContent.copyrightText" {...form.register("footerContent.copyrightText")} />
          </div>
        </div>
        <div>
          <Label htmlFor="footerContent.disclaimerText" className="mb-1.5">Disclaimer line</Label>
          <Textarea id="footerContent.disclaimerText" rows={2} {...form.register("footerContent.disclaimerText")} />
        </div>
      </Section>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting} className="bg-gradient-primary text-white hover:opacity-90">
          {submitting ? "Saving..." : "Save Brand & Navigation"}
        </Button>
      </div>
    </form>
  );
}
