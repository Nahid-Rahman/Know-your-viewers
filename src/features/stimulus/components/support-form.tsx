"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  LightInput,
  LightSelect,
  LightTextarea,
  LightFieldLabel,
} from "@/components/common/light-field";

const ISSUE_TYPES = [
  "Entry follow-up / status check",
  "Reward verification",
  "Technical issue with the site",
  "Something else",
];

const supportSchema = z.object({
  emailOrPhone: z.string().min(3, "Enter the email or phone number you submitted."),
  responseCode: z.string().optional(),
  streamNickname: z.string().optional(),
  issueType: z.string().min(1, "Select an issue type."),
  message: z.string().min(5, "Tell us a little about the issue."),
});

type SupportValues = z.infer<typeof supportSchema>;

export function SupportForm() {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<SupportValues>({
    resolver: zodResolver(supportSchema),
    defaultValues: {
      emailOrPhone: "",
      responseCode: "",
      streamNickname: "",
      issueType: "",
      message: "",
    },
  });

  async function onSubmit() {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 500));
    setSubmitting(false);
    toast.success("Support request sent. Our team will follow up shortly.");
    form.reset();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <LightFieldLabel htmlFor="support-contact">Email or Phone *</LightFieldLabel>
        <LightInput id="support-contact" placeholder="viewer017@example.com" {...form.register("emailOrPhone")} />
        {form.formState.errors.emailOrPhone && (
          <p className="mt-1 text-xs text-destructive">{form.formState.errors.emailOrPhone.message}</p>
        )}
      </div>

      <div>
        <LightFieldLabel htmlFor="support-code">Response Code</LightFieldLabel>
        <LightInput id="support-code" placeholder="LDA-8K42" {...form.register("responseCode")} />
      </div>

      <div>
        <LightFieldLabel htmlFor="support-nickname">Stream Nickname</LightFieldLabel>
        <LightInput id="support-nickname" placeholder="RafiqPlaysBD" {...form.register("streamNickname")} />
      </div>

      <div>
        <LightFieldLabel htmlFor="support-issue">Issue Type</LightFieldLabel>
        <LightSelect id="support-issue" {...form.register("issueType")} defaultValue="">
          <option value="" disabled>
            Select an option
          </option>
          {ISSUE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </LightSelect>
        {form.formState.errors.issueType && (
          <p className="mt-1 text-xs text-destructive">{form.formState.errors.issueType.message}</p>
        )}
      </div>

      <div>
        <LightFieldLabel htmlFor="support-message">Message</LightFieldLabel>
        <LightTextarea id="support-message" rows={4} {...form.register("message")} />
        {form.formState.errors.message && (
          <p className="mt-1 text-xs text-destructive">{form.formState.errors.message.message}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="h-11 w-full bg-gradient-primary text-sm font-bold text-white hover:opacity-90"
      >
        {submitting ? "Sending..." : "SEND MESSAGE"}
      </Button>
    </form>
  );
}
