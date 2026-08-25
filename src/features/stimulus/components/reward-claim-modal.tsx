"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RarityBadge, type Rarity } from "@/components/common/rarity-badge";
import { LightInput, LightSelect, LightFieldLabel } from "@/components/common/light-field";
import { saveMockEntry, generateResponseCode } from "@/features/stimulus/mock-entry-store";
import { gameTypeOptions, watchFrequencyOptions } from "@/features/stimulus/config";

const entrySchema = z
  .object({
    email: z.string().optional(),
    phone: z.string().optional(),
    streamNickname: z.string().optional(),
    favouriteGameType: z.string().optional(),
    livestreamFrequency: z.string().optional(),
  })
  .refine((v) => Boolean(v.email?.trim() || v.phone?.trim()), {
    message: "Enter an email or phone number so the team can reach you.",
    path: ["email"],
  });

type EntryValues = z.infer<typeof entrySchema>;

export function RewardClaimModal({
  open,
  onOpenChange,
  reward,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reward: { label: string; rarity: Rarity };
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<EntryValues>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      email: "",
      phone: "",
      streamNickname: "",
      favouriteGameType: "",
      livestreamFrequency: "",
    },
  });

  async function onSubmit(values: EntryValues) {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 900));
    saveMockEntry({
      responseCode: generateResponseCode(),
      rewardLabel: reward.label,
      rewardRarity: reward.rarity,
      email: values.email?.trim() ?? "",
      phone: values.phone?.trim() ?? "",
      streamNickname: values.streamNickname?.trim() ?? "",
      favouriteGameType: values.favouriteGameType ?? "",
      livestreamFrequency: values.livestreamFrequency ?? "",
      submittedAt: new Date().toISOString(),
    });
    setSubmitting(false);
    onOpenChange(false);
    form.reset();
    // The reference stays on the page and updates a hero card in place; we
    // still continue into the debrief flow shortly after, since a session
    // that used deception must eventually reach retroactive consent.
    setTimeout(() => router.push("/entry/received"), 1400);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-lg">
        <DialogHeader>
          <p className="text-xs font-semibold text-muted-foreground uppercase">
            Step 2 of 2 &mdash; Confirm Entry
          </p>
        </DialogHeader>

        <div className="flex flex-col items-center py-2 text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-full border border-green/40 bg-green/10 text-2xl">
            📦
          </div>
          <span className="mb-3 text-xs font-semibold text-green uppercase">Reward Selected</span>
          <DialogTitle className="font-display text-xl font-bold">
            You unlocked a {reward.label}!
          </DialogTitle>
          <DialogDescription className="mt-1 max-w-sm">
            Your reward result has been saved. Complete a few basic details so our team can
            contact you regarding the next process after verification.
          </DialogDescription>
        </div>

        <div className="card-border flex items-center justify-between rounded-xl p-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">
              Your Viewer Drop Result
            </p>
            <p className="mt-1 font-bold">{reward.label}</p>
            <p className="text-xs text-muted-foreground">Selected from the LiveDrop reward roll.</p>
          </div>
          <RarityBadge rarity={reward.rarity} variant="pill" />
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <p className="text-sm font-bold">Complete your entry</p>
            <p className="text-xs text-muted-foreground">One contact method is required for follow-up.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <LightFieldLabel htmlFor="entry-email">Email (optional)</LightFieldLabel>
              <LightInput
                id="entry-email"
                type="email"
                placeholder="viewer017@example.com"
                {...form.register("email")}
              />
            </div>
            <div>
              <LightFieldLabel htmlFor="entry-phone">Phone Number (optional)</LightFieldLabel>
              <LightInput
                id="entry-phone"
                type="tel"
                placeholder="01XXXXXXXXX"
                {...form.register("phone")}
              />
            </div>
          </div>
          {form.formState.errors.email && (
            <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
          )}

          <div>
            <LightFieldLabel htmlFor="entry-nickname">Stream Nickname</LightFieldLabel>
            <LightInput id="entry-nickname" placeholder="RafiqPlaysBD" {...form.register("streamNickname")} />
          </div>

          <div>
            <LightFieldLabel htmlFor="entry-game">Favourite Game Type</LightFieldLabel>
            <LightSelect id="entry-game" {...form.register("favouriteGameType")} defaultValue="">
              <option value="" disabled>
                Select an option
              </option>
              {gameTypeOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </LightSelect>
          </div>

          <div>
            <LightFieldLabel htmlFor="entry-frequency">Livestream Frequency</LightFieldLabel>
            <LightSelect id="entry-frequency" {...form.register("livestreamFrequency")} defaultValue="">
              <option value="" disabled>
                Select an option
              </option>
              {watchFrequencyOptions.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </LightSelect>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-green/25 bg-green/10 p-3.5">
            <span className="mt-0.5 shrink-0 text-green" aria-hidden>🛡</span>
            <p className="text-xs text-green">
              <span className="font-bold">Safe follow-up only.</span> We only need one contact
              method for follow-up. Never share your password, OTP, payment details, game login,
              ID, full address, or account access.
            </p>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="h-11 w-full bg-gradient-primary text-sm font-bold text-white hover:opacity-90"
          >
            {submitting ? "SUBMITTING…" : "SUBMIT ENTRY"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            After submission, you will receive a response code for future follow-up.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
