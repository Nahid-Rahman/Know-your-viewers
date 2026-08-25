"use client";

import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Controller } from "react-hook-form";
import { updateSiteContent, type SiteContentValues } from "@/lib/actions/site-content";

const schema = z.object({
  heroHeadline: z.string().min(1, "Required."),
  heroSubtext: z.string().min(1, "Required."),
  claimedCount: z.string().min(1, "Required."),
  countdownSeconds: z.number().int().min(0),
  trustBadges: z.array(z.object({ icon: z.string().min(1), title: z.string().min(1), description: z.string().min(1) })),
  gameCategories: z.array(z.object({ tag: z.string().min(1), title: z.string().min(1), description: z.string().min(1) })),
  rewardPool: z.array(
    z.object({
      label: z.string().min(1),
      sub: z.string().min(1),
      rarity: z.enum(["common", "rare", "exceptional", "premium"]),
    }),
  ),
  gameTypeOptions: z.array(z.object({ value: z.string().min(1) })),
  watchFrequencyOptions: z.array(z.object({ value: z.string().min(1) })),
  faqItems: z.array(z.object({ q: z.string().min(1), a: z.string().min(1) })),
});

type FormValues = z.infer<typeof schema>;

function Section({ title, children, onAdd }: { title: string; children: React.ReactNode; onAdd: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-semibold">{title}</p>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus data-icon="inline-start" className="size-3.5" />
          Add
        </Button>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function RemoveRowButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" size="icon" onClick={onClick} aria-label="Remove">
      <Trash2 className="size-4 text-destructive" />
    </Button>
  );
}

export function SiteContentForm({ content }: { content: SiteContentValues }) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...content,
      gameTypeOptions: content.gameTypeOptions.map((value) => ({ value })),
      watchFrequencyOptions: content.watchFrequencyOptions.map((value) => ({ value })),
    },
  });

  const trustBadges = useFieldArray({ control: form.control, name: "trustBadges" });
  const gameCategories = useFieldArray({ control: form.control, name: "gameCategories" });
  const rewardPool = useFieldArray({ control: form.control, name: "rewardPool" });
  const gameTypeOptions = useFieldArray({ control: form.control, name: "gameTypeOptions" });
  const watchFrequencyOptions = useFieldArray({ control: form.control, name: "watchFrequencyOptions" });
  const faqItems = useFieldArray({ control: form.control, name: "faqItems" });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const result = await updateSiteContent({
      ...values,
      gameTypeOptions: values.gameTypeOptions.map((o) => o.value),
      watchFrequencyOptions: values.watchFrequencyOptions.map((o) => o.value),
    });
    setSubmitting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Stimulus content updated.");
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="mb-4 font-semibold">Hero</p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="heroHeadline" className="mb-1.5">Headline</Label>
            <Textarea id="heroHeadline" rows={4} {...form.register("heroHeadline")} />
            <p className="mt-1 text-xs text-muted-foreground">
              Use a new line to break lines, and wrap text in **double asterisks** to highlight it in
              the gradient colour — e.g. UNLOCK{"\n"}YOUR{"\n"}**VIEWER DROP**
            </p>
          </div>
          <div>
            <Label htmlFor="heroSubtext" className="mb-1.5">Subtext</Label>
            <Textarea id="heroSubtext" rows={2} {...form.register("heroSubtext")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="claimedCount" className="mb-1.5">Claimed count (social proof)</Label>
              <Input id="claimedCount" {...form.register("claimedCount")} />
            </div>
            <div>
              <Label htmlFor="countdownSeconds" className="mb-1.5">Countdown length (seconds)</Label>
              <Input id="countdownSeconds" type="number" {...form.register("countdownSeconds", { valueAsNumber: true })} />
            </div>
          </div>
        </div>
      </div>

      <Section title="Trust badges" onAdd={() => trustBadges.append({ icon: "★", title: "", description: "" })}>
        {trustBadges.fields.map((field, i) => (
          <div key={field.id} className="flex items-start gap-2 rounded-lg border border-border p-3">
            <Input className="w-16" placeholder="Icon" {...form.register(`trustBadges.${i}.icon`)} />
            <Input placeholder="Title" {...form.register(`trustBadges.${i}.title`)} />
            <Input placeholder="Description" {...form.register(`trustBadges.${i}.description`)} />
            <RemoveRowButton onClick={() => trustBadges.remove(i)} />
          </div>
        ))}
      </Section>

      <Section
        title="Game categories"
        onAdd={() => gameCategories.append({ tag: "", title: "", description: "" })}
      >
        {gameCategories.fields.map((field, i) => (
          <div key={field.id} className="flex items-start gap-2 rounded-lg border border-border p-3">
            <Input className="w-32" placeholder="Tag" {...form.register(`gameCategories.${i}.tag`)} />
            <Input placeholder="Title" {...form.register(`gameCategories.${i}.title`)} />
            <Input placeholder="Description" {...form.register(`gameCategories.${i}.description`)} />
            <RemoveRowButton onClick={() => gameCategories.remove(i)} />
          </div>
        ))}
      </Section>

      <Section
        title="Reward pool"
        onAdd={() => rewardPool.append({ label: "", sub: "", rarity: "common" })}
      >
        {rewardPool.fields.map((field, i) => (
          <div key={field.id} className="flex items-start gap-2 rounded-lg border border-border p-3">
            <Input placeholder="Label" {...form.register(`rewardPool.${i}.label`)} />
            <Input placeholder="Sub-label" {...form.register(`rewardPool.${i}.sub`)} />
            <Controller
              control={form.control}
              name={`rewardPool.${i}.rarity`}
              render={({ field: rarityField }) => (
                <Select value={rarityField.value} onValueChange={rarityField.onChange}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="common">Common</SelectItem>
                    <SelectItem value="rare">Rare</SelectItem>
                    <SelectItem value="exceptional">Exceptional</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <RemoveRowButton onClick={() => rewardPool.remove(i)} />
          </div>
        ))}
      </Section>

      <Section title="Favourite game type options" onAdd={() => gameTypeOptions.append({ value: "" })}>
        {gameTypeOptions.fields.map((field, i) => (
          <div key={field.id} className="flex items-center gap-2">
            <Input {...form.register(`gameTypeOptions.${i}.value`)} />
            <RemoveRowButton onClick={() => gameTypeOptions.remove(i)} />
          </div>
        ))}
      </Section>

      <Section
        title="Livestream frequency options"
        onAdd={() => watchFrequencyOptions.append({ value: "" })}
      >
        {watchFrequencyOptions.fields.map((field, i) => (
          <div key={field.id} className="flex items-center gap-2">
            <Input {...form.register(`watchFrequencyOptions.${i}.value`)} />
            <RemoveRowButton onClick={() => watchFrequencyOptions.remove(i)} />
          </div>
        ))}
      </Section>

      <Section title="FAQ" onAdd={() => faqItems.append({ q: "", a: "" })}>
        {faqItems.fields.map((field, i) => (
          <div key={field.id} className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <Input placeholder="Question" {...form.register(`faqItems.${i}.q`)} />
              <RemoveRowButton onClick={() => faqItems.remove(i)} />
            </div>
            <Textarea rows={2} placeholder="Answer" {...form.register(`faqItems.${i}.a`)} />
          </div>
        ))}
      </Section>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting} className="bg-gradient-primary text-white hover:opacity-90">
          {submitting ? "Saving..." : "Save Content"}
        </Button>
      </div>
    </form>
  );
}
