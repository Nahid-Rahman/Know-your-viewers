"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateResearcherProfile } from "@/lib/actions/settings";

const profileSchema = z.object({ name: z.string().min(2, "Enter your name.") });
type ProfileValues = z.infer<typeof profileSchema>;

export function ResearcherSettingsForm({ name, email }: { name: string; email: string }) {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), defaultValues: { name } });

  async function onSubmit(values: ProfileValues) {
    setSubmitting(true);
    const result = await updateResearcherProfile(values);
    setSubmitting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Profile updated.");
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name" className="mb-1.5">Name</Label>
          <Input id="name" {...form.register("name")} />
          {form.formState.errors.name && (
            <p className="mt-1 text-xs text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="email" className="mb-1.5">Email</Label>
          <Input id="email" type="email" defaultValue={email} disabled />
        </div>
      </div>
      <Button type="submit" disabled={submitting} className="mt-4">
        {submitting ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
