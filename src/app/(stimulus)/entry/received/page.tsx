"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Mail,
  Gamepad2,
  Zap as ZapIcon,
  Image as ImageIcon,
  ArrowRight,
  Headphones,
} from "lucide-react";
import { RarityBadge } from "@/components/common/rarity-badge";
import { CodeBlock } from "@/components/common/code-block";
import { TrustStrip } from "@/components/common/trust-strip";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { loadMockEntry, type MockEntry } from "@/features/stimulus/mock-entry-store";
import { getPublicSiteContent } from "@/lib/actions/site-content";
import { DEFAULT_SITE_CONTENT, type EntryReceivedContent } from "@/lib/site-content-defaults";

const DETAIL_ICONS = {
  email: Mail,
  phone: Mail,
  contact: Mail,
  streamNickname: ImageIcon,
  favouriteGameType: Gamepad2,
  livestreamFrequency: ZapIcon,
} as const;

const noopSubscribe = () => () => {};

export default function SubmissionReceivedPage() {
  const router = useRouter();
  // sessionStorage isn't available during SSR; useSyncExternalStore renders
  // the server snapshot (undefined) until the client has hydrated, then
  // reads the real value with no hydration mismatch.
  const entry = useSyncExternalStore<MockEntry | null | undefined>(
    noopSubscribe,
    loadMockEntry,
    () => undefined,
  );
  const [content, setContent] = useState<EntryReceivedContent>(DEFAULT_SITE_CONTENT.entryReceivedContent);

  useEffect(() => {
    if (entry === null) {
      router.replace("/");
    }
  }, [entry, router]);

  useEffect(() => {
    void getPublicSiteContent().then((c) => {
      if (c) setContent(c.entryReceivedContent);
    });
  }, []);

  if (entry === undefined || entry === null) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col items-center px-4 py-24 text-center text-sm text-muted-foreground">
        Loading your entry...
      </div>
    );
  }

  const details: Array<{ key: keyof typeof DETAIL_ICONS; label: string; value: string }> = [
    ...(entry.email || entry.phone
      ? [
          ...(entry.email ? [{ key: "email" as const, label: "Email", value: entry.email }] : []),
          ...(entry.phone ? [{ key: "phone" as const, label: "Phone", value: entry.phone }] : []),
        ]
      : [{ key: "contact" as const, label: "Email or Phone", value: "-" }]),
    { key: "streamNickname", label: "Stream Nickname", value: entry.streamNickname || "-" },
    { key: "favouriteGameType", label: "Favourite Game Type", value: entry.favouriteGameType || "-" },
    { key: "livestreamFrequency", label: "Livestream Frequency", value: entry.livestreamFrequency || "-" },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16">
      <div className="rounded-xl border border-primary/25 bg-card p-8">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full border border-accent-green/40 bg-accent-green/10">
            <CheckCircle2 className="size-7 text-accent-green" />
          </div>
          <span className="mb-4 rounded-full border border-accent-green/30 bg-accent-green/10 px-3 py-1 text-[11px] font-semibold tracking-[0.1em] text-accent-green uppercase">
            {content.badgeText}
          </span>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">{content.title}</h1>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">{content.subtext}</p>
        </div>

        <div className="mt-8 flex items-center justify-between rounded-xl border border-primary/25 bg-primary/5 p-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
              {content.resultLabel}
            </p>
            <p className="mt-1 font-bold">{entry.rewardLabel}</p>
            <p className="text-xs text-muted-foreground">{content.resultCaption}</p>
          </div>
          <RarityBadge rarity={entry.rewardRarity} />
        </div>

        <CodeBlock
          className="mt-4"
          label="Response Code"
          value={entry.responseCode}
          hint="Keep this code for future contact or verification."
        />

        <div className="mt-4 rounded-xl border border-border">
          <p className="border-b border-border px-4 py-3 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
            {content.submittedDetailsLabel}
          </p>
          <div className="divide-y divide-border">
            {details.map(({ key, label, value }) => {
              const Icon = DETAIL_ICONS[key];
              return (
                <div key={key} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Icon className="size-3.5" />
                    {label}
                  </span>
                  <span className="font-medium">{value}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/debrief"
            className={cn(buttonVariants({ size: "lg" }), "flex-1 bg-gradient-primary text-white hover:opacity-90")}
          >
            Continue
            <ArrowRight data-icon="inline-end" />
          </Link>
          <Link href="/support" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
            <Headphones data-icon="inline-start" />
            Contact Support
          </Link>
        </div>

        <TrustStrip tone="safe" className="mt-6" items={content.trustItems} />
      </div>
    </div>
  );
}
