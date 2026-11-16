"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LightInput, LightSelect, LightTextarea, LightFieldLabel } from "@/components/common/light-field";
import {
  lookupSupportEntry,
  submitSupportRequest,
  type SupportContactField,
  type SupportLookup,
} from "@/lib/actions/support";
import { FIELD_LIMITS } from "@/lib/study/constants";

const ISSUE_TYPES = [
  "Entry follow-up / status check",
  "Reward verification",
  "Technical issue with the site",
  "Something else",
];

const CODE_RE = /^LD-[A-Z2-9]{4}-[A-Z2-9]{4}$/;

const FIELDS: { key: SupportContactField; label: string; placeholder?: string; type?: string; max: number }[] = [
  { key: "name", label: "Your name", max: FIELD_LIMITS.name },
  { key: "phone", label: "Phone number", placeholder: "01XXXXXXXXX", type: "tel", max: FIELD_LIMITS.phoneRaw },
  { key: "email", label: "Email", type: "email", max: FIELD_LIMITS.email },
  { key: "ign", label: "In-game name with tag", placeholder: "Name#TAG", max: FIELD_LIMITS.ign },
  { key: "discord", label: "Discord username", placeholder: "username", max: FIELD_LIMITS.discord },
  { key: "facebook", label: "Facebook profile link or name", placeholder: "facebook.com/your.profile", max: FIELD_LIMITS.facebook },
];
const REQUIRED: SupportContactField[] = ["name", "phone"];

const supportSchema = z.object({
  responseCode: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string(),
  ign: z.string(),
  discord: z.string(),
  facebook: z.string(),
  issueType: z.string().min(1, "Select an issue type."),
  message: z.string().trim().min(5, "Tell us a little about the issue."),
});
type SupportValues = z.infer<typeof supportSchema>;

const EMPTY: SupportValues = {
  responseCode: "",
  name: "",
  phone: "",
  email: "",
  ign: "",
  discord: "",
  facebook: "",
  issueType: "",
  message: "",
};

export function SupportForm() {
  const [submitting, setSubmitting] = useState(false);
  // The code last looked up and its result (null while the lookup runs).
  const [lookupState, setLookupState] = useState<{ code: string; result: SupportLookup | null } | null>(null);
  const lookup = lookupState?.result ?? null;
  const looking = Boolean(lookupState && !lookupState.result);

  const form = useForm<SupportValues>({ resolver: zodResolver(supportSchema), defaultValues: EMPTY });
  const errors = form.formState.errors;
  const entry = lookup?.found ? lookup : null;

  async function findEntry(raw: string) {
    const code = raw.trim().toUpperCase();
    if (code === lookupState?.code) return;
    if (!CODE_RE.test(code)) {
      setLookupState(code ? { code, result: { found: false } } : null);
      return;
    }
    setLookupState({ code, result: null });
    let result: SupportLookup;
    try {
      result = await lookupSupportEntry(code);
    } catch {
      result = { found: false, error: "Couldn't look up the code. You can still fill in your details." };
    }
    // Ignore a stale answer if the code changed meanwhile.
    setLookupState((prev) => (prev?.code === code ? { code, result } : prev));
  }

  async function onSubmit(values: SupportValues) {
    // Fields already on the entry are not re-sent; the server reads them from the entry.
    const typed = { ...values };
    for (const f of FIELDS) if (entry?.fields[f.key].onFile) typed[f.key] = "";
    for (const f of REQUIRED) {
      if (!entry?.fields[f].onFile && !values[f].trim()) {
        form.setError(f, { message: f === "name" ? "Enter your name." : "Enter your phone number." });
        return;
      }
    }
    setSubmitting(true);
    const result = await submitSupportRequest(typed);
    setSubmitting(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Support request sent. Our team will follow up shortly.");
    form.reset(EMPTY);
    setLookupState(null);
  }

  const codeField = form.register("responseCode");

  let codeStatus: React.ReactNode = "From your entry confirmation. We'll fill in the details we already have.";
  if (looking) {
    codeStatus = (
      <span className="inline-flex items-center gap-1">
        <Loader2 className="size-3 animate-spin" aria-hidden /> Looking up your entry…
      </span>
    );
  } else if (entry) {
    codeStatus = (
      <span className="inline-flex items-center gap-1 text-accent-green">
        <CheckCircle2 className="size-3" aria-hidden /> Entry found — details we already have are filled in.
      </span>
    );
  } else if (lookup && !lookup.found) {
    codeStatus = lookup.error ?? "No entry found with this code. Fill in your details below.";
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <LightFieldLabel htmlFor="support-code">Response code</LightFieldLabel>
        <LightInput
          id="support-code"
          placeholder="LD-XXXX-XXXX"
          autoComplete="off"
          maxLength={20}
          aria-describedby="support-code-status"
          {...codeField}
          onChange={(e) => {
            void codeField.onChange(e);
            const code = e.target.value.trim().toUpperCase();
            if (CODE_RE.test(code)) void findEntry(code);
            else if (lookupState) setLookupState(null);
          }}
          onBlur={(e) => {
            void codeField.onBlur(e);
            void findEntry(e.target.value);
          }}
        />
        <p id="support-code-status" className="mt-1 text-xs text-muted-foreground" aria-live="polite">
          {codeStatus}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => {
          const state = entry?.fields[f.key];
          const id = `support-${f.key}`;
          if (state?.onFile) {
            return (
              <div key={f.key}>
                <LightFieldLabel htmlFor={id}>{f.label}</LightFieldLabel>
                <LightInput
                  id={id}
                  value={state.value ?? state.masked ?? "On file"}
                  readOnly
                  aria-readonly
                  className="cursor-default opacity-80"
                />
                <p className="mt-1 text-xs text-accent-green">Already on file</p>
              </div>
            );
          }
          const required = REQUIRED.includes(f.key);
          return (
            <div key={f.key}>
              <LightFieldLabel htmlFor={id}>
                {f.label} {required ? "*" : "(optional)"}
              </LightFieldLabel>
              <LightInput
                id={id}
                type={f.type}
                placeholder={f.placeholder}
                maxLength={f.max}
                autoComplete="off"
                aria-invalid={Boolean(errors[f.key])}
                {...form.register(f.key)}
              />
              {errors[f.key] && <p className="mt-1 text-xs text-destructive">{errors[f.key]?.message}</p>}
            </div>
          );
        })}
      </div>

      <div>
        <LightFieldLabel htmlFor="support-issue">Issue type *</LightFieldLabel>
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
        {errors.issueType && <p className="mt-1 text-xs text-destructive">{errors.issueType.message}</p>}
      </div>

      <div>
        <LightFieldLabel htmlFor="support-message">Describe the issue *</LightFieldLabel>
        <LightTextarea id="support-message" rows={4} {...form.register("message")} />
        {errors.message && <p className="mt-1 text-xs text-destructive">{errors.message.message}</p>}
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
