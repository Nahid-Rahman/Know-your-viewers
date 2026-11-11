"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LightFieldLabel, LightInput } from "@/components/common/light-field";
import { submitStudyEntry } from "@/lib/actions/study-public";
import { AGE_GROUP_OPTIONS, FIELD_LIMITS, type TrackableField } from "@/lib/study/constants";
import { entryFormSchema, type EntryFormInput, type EntryFormValues } from "@/lib/study/submission-schema";
import type { ClientEvent } from "@/lib/study/events-client";
import { cn } from "@/lib/utils";

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

const RADIO_CARD =
  "flex cursor-pointer items-center justify-center rounded-lg border border-border-strong/60 px-3 py-2.5 text-sm font-semibold transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/15 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/60";

export function EntryFormDialog({
  open,
  onOpenChange,
  visitId,
  result,
  track,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitId: string | null;
  result: { label: string; headline: string; explanation: string } | null;
  track: (e: ClientEvent) => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  // One key per intended submission: retries/double clicks reuse it, so the
  // server returns the same row instead of saving a fake duplicate.
  const [idempotencyKey, setIdempotencyKey] = useState(newKey);
  const touched = useRef(new Set<TrackableField>());

  const form = useForm<EntryFormInput, unknown, EntryFormValues>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: { phone: "", ageGroup: undefined, email: "", ign: "", socialType: "", socialHandle: "" },
  });
  const socialType = useWatch({ control: form.control, name: "socialType" });
  const errors = form.formState.errors;

  function interacted(field: TrackableField) {
    if (touched.current.has(field)) return;
    touched.current.add(field);
    track({ type: "FIELD_INTERACTED", element: field });
  }

  async function onSubmit(values: EntryFormValues) {
    if (!visitId || submitting) return;
    setSubmitting(true);
    setServerError(null);
    track({ type: "SUBMISSION_ATTEMPTED" });
    try {
      const r = await submitStudyEntry({ visitId, idempotencyKey, values });
      if (!r.ok) {
        setServerError(r.error);
        setSubmitting(false);
        return;
      }
      setIdempotencyKey(newKey());
      router.push(`/entry/received?s=${encodeURIComponent(r.submissionId)}`);
    } catch {
      // Network failure: keep the same key so a retry can't double-save.
      setServerError("Couldn't reach the server. Check your connection and press Submit again.");
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !submitting) track({ type: "FORM_CLOSED" });
        if (!submitting) onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold">Enter the prize draw</DialogTitle>
          {result && (
            <div className="mt-2 rounded-2xl border border-accent-green/50 bg-accent-green/10 px-4 py-3 text-center shadow-[0_0_32px_-12px_var(--green)]">
              <p className="text-[10px] font-black tracking-[0.3em] text-accent-green uppercase">🎉 Your wheel result</p>
              <p className="mt-1 font-display text-2xl font-black text-accent-green">{result.label}</p>
            </div>
          )}
          <DialogDescription>{result ? result.explanation : "Leave your details to enter the draw."}</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <LightFieldLabel htmlFor="entry-phone">Phone number (required)</LightFieldLabel>
            <LightInput
              id="entry-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="01XXXXXXXXX"
              maxLength={FIELD_LIMITS.phoneRaw}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby="entry-phone-help entry-phone-error"
              onFocus={() => interacted("phone")}
              {...form.register("phone")}
            />
            <p id="entry-phone-help" className="mt-1 text-xs text-muted-foreground">
              Used only to contact draw winners and for follow-up. Bangladesh numbers can start with 01 or +880.
            </p>
            {errors.phone && (
              <p id="entry-phone-error" className="mt-1 text-xs text-destructive" role="alert">
                {errors.phone.message}
              </p>
            )}
          </div>

          <fieldset aria-describedby="entry-age-error">
            <legend className="mb-1.5 block text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              Age group (required)
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {AGE_GROUP_OPTIONS.map((o) => (
                <label key={o.value} className={RADIO_CARD}>
                  <input
                    type="radio"
                    value={o.value}
                    className="sr-only"
                    onFocus={() => interacted("ageGroup")}
                    {...form.register("ageGroup")}
                  />
                  {o.label}
                </label>
              ))}
            </div>
            {errors.ageGroup && (
              <p id="entry-age-error" className="mt-1 text-xs text-destructive" role="alert">
                {errors.ageGroup.message}
              </p>
            )}
          </fieldset>

          <div className="rounded-xl border border-border p-3.5">
            <p className="text-sm font-bold">Optional</p>
            <p className="mb-3 text-xs text-muted-foreground">
              You can skip everything below. Skipping does not affect your entry or your chance in the draw.
            </p>
            <div className="space-y-3">
              <div>
                <LightFieldLabel htmlFor="entry-email">Email (optional)</LightFieldLabel>
                <LightInput
                  id="entry-email"
                  type="email"
                  autoComplete="email"
                  maxLength={FIELD_LIMITS.email}
                  aria-invalid={Boolean(errors.email)}
                  onFocus={() => interacted("email")}
                  {...form.register("email")}
                />
                {errors.email && <p className="mt-1 text-xs text-destructive" role="alert">{errors.email.message}</p>}
              </div>
              <div>
                <LightFieldLabel htmlFor="entry-ign">In-game name (optional)</LightFieldLabel>
                <LightInput
                  id="entry-ign"
                  autoComplete="off"
                  maxLength={FIELD_LIMITS.ign}
                  aria-invalid={Boolean(errors.ign)}
                  onFocus={() => interacted("ign")}
                  {...form.register("ign")}
                />
                {errors.ign && <p className="mt-1 text-xs text-destructive" role="alert">{errors.ign.message}</p>}
              </div>
              <fieldset>
                <legend className="mb-1.5 block text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                  Social contact (optional — choose one)
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "", label: "Skip" },
                    { value: "DISCORD", label: "Discord" },
                    { value: "FACEBOOK", label: "Facebook" },
                  ].map((o) => (
                    <label key={o.value || "none"} className={RADIO_CARD}>
                      <input
                        type="radio"
                        value={o.value}
                        className="sr-only"
                        onFocus={() => interacted("socialType")}
                        {...form.register("socialType", {
                          onChange: (e) => {
                            if (!e.target.value) form.setValue("socialHandle", "");
                          },
                        })}
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
                {errors.socialType && <p className="mt-1 text-xs text-destructive" role="alert">{errors.socialType.message}</p>}
                {socialType ? (
                  <div className="mt-2">
                    <LightFieldLabel htmlFor="entry-social">
                      {socialType === "DISCORD" ? "Discord username" : "Facebook profile link or name"}
                    </LightFieldLabel>
                    <LightInput
                      id="entry-social"
                      autoComplete="off"
                      maxLength={socialType === "DISCORD" ? FIELD_LIMITS.discord : FIELD_LIMITS.facebook}
                      placeholder={socialType === "DISCORD" ? "username" : "facebook.com/your.profile"}
                      aria-invalid={Boolean(errors.socialHandle)}
                      onFocus={() => interacted("socialHandle")}
                      {...form.register("socialHandle")}
                    />
                    {errors.socialHandle && (
                      <p className="mt-1 text-xs text-destructive" role="alert">{errors.socialHandle.message}</p>
                    )}
                  </div>
                ) : null}
              </fieldset>
            </div>
          </div>

          <p className="rounded-xl border border-green/25 bg-green/10 p-3 text-xs text-green">
            <span className="font-bold">We will never ask for</span> your bKash PIN, OTP, passwords, NID or any account login.
          </p>

          {serverError && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              {serverError}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting || !visitId}
            className={cn("h-11 w-full bg-gradient-primary text-sm font-bold text-white hover:opacity-90")}
          >
            {submitting ? "Submitting…" : "Submit entry"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
