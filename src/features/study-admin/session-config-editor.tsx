"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveSessionConfigAction } from "@/lib/actions/study-admin";
import { BKASH_REWARD_KEY, type RewardConfig } from "@/lib/study/reward";
import { StreamerImageUpload } from "./streamer-image-upload";

export type ConfigEditorValue = {
  streamerDisplayName: string;
  streamerImageUrl: string;
  welcomeText: string;
  channelUrl: string;
  platform: string;
  homepageContent: { heroHeadline: string; heroSubtext: string; howItWorks: string[]; faqItems: { q: string; a: string }[] };
  rewardConfig: RewardConfig;
};

const TIERS = ["common", "rare", "exceptional", "premium"] as const;

/**
 * Edits the session's homepage + wheel configuration. Saving always creates a
 * NEW immutable version; earlier visits/submissions keep the version they saw.
 */
export function SessionConfigEditor({
  sessionId,
  initial,
  rewardPresentationApproved,
  disabled,
}: {
  sessionId: string;
  initial: ConfigEditorValue;
  rewardPresentationApproved: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [v, setV] = useState<ConfigEditorValue>(initial);
  const [pending, start] = useTransition();
  const set = <K extends keyof ConfigEditorValue>(k: K, val: ConfigEditorValue[K]) => setV((p) => ({ ...p, [k]: val }));
  const setHome = <K extends keyof ConfigEditorValue["homepageContent"]>(k: K, val: ConfigEditorValue["homepageContent"][K]) =>
    setV((p) => ({ ...p, homepageContent: { ...p.homepageContent, [k]: val } }));
  const setReward = <K extends keyof RewardConfig>(k: K, val: RewardConfig[K]) =>
    setV((p) => ({ ...p, rewardConfig: { ...p.rewardConfig, [k]: val } }));
  const items = v.rewardConfig.displayItems;

  function save() {
    start(async () => {
      const r = await saveSessionConfigAction(sessionId, v);
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      toast.success(`Saved as version ${r.data.version}.`);
      router.refresh();
    });
  }

  return (
    <fieldset disabled={disabled || pending} className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="mb-1.5" htmlFor="c-name">Streamer display name</Label>
          <Input id="c-name" value={v.streamerDisplayName} maxLength={60} onChange={(e) => set("streamerDisplayName", e.target.value)} />
        </div>
        <div>
          <Label className="mb-1.5" htmlFor="c-platform">Platform</Label>
          <Input id="c-platform" value={v.platform} maxLength={40} placeholder="YouTube / Facebook" onChange={(e) => set("platform", e.target.value)} />
        </div>
        <div>
          <Label className="mb-1.5">Streamer photo (shown on the homepage)</Label>
          <StreamerImageUpload sessionId={sessionId} value={v.streamerImageUrl} onChange={(url) => set("streamerImageUrl", url)} disabled={disabled || pending} />
        </div>
        <div>
          <Label className="mb-1.5" htmlFor="c-channel">Channel URL</Label>
          <Input id="c-channel" value={v.channelUrl} placeholder="https://youtube.com/@…" onChange={(e) => set("channelUrl", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label className="mb-1.5" htmlFor="c-welcome">Welcome text</Label>
          <Textarea id="c-welcome" rows={2} maxLength={400} value={v.welcomeText} onChange={(e) => set("welcomeText", e.target.value)} />
        </div>
      </div>

      <div className="grid gap-3">
        <div>
          <Label className="mb-1.5" htmlFor="c-head">Headline</Label>
          <Input id="c-head" maxLength={120} value={v.homepageContent.heroHeadline} onChange={(e) => setHome("heroHeadline", e.target.value)} />
        </div>
        <div>
          <Label className="mb-1.5" htmlFor="c-sub">Intro text</Label>
          <Textarea id="c-sub" rows={2} maxLength={400} value={v.homepageContent.heroSubtext} onChange={(e) => setHome("heroSubtext", e.target.value)} />
        </div>
        <div>
          <Label className="mb-1.5" htmlFor="c-steps">How it works (one step per line)</Label>
          <Textarea
            id="c-steps"
            rows={3}
            value={v.homepageContent.howItWorks.join("\n")}
            onChange={(e) => setHome("howItWorks", e.target.value.split("\n").slice(0, 6))}
            onBlur={(e) => setHome("howItWorks", e.target.value.split("\n").map((l) => l.trim()).filter(Boolean))}
          />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium">FAQ</p>
          <div className="space-y-2">
            {v.homepageContent.faqItems.map((f, i) => (
              <div key={i} className="grid gap-2 rounded-lg border border-border p-2 sm:grid-cols-[1fr_2fr_auto]">
                <Input aria-label={`Question ${i + 1}`} value={f.q} maxLength={200} onChange={(e) => setHome("faqItems", v.homepageContent.faqItems.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} />
                <Textarea aria-label={`Answer ${i + 1}`} rows={2} value={f.a} maxLength={800} onChange={(e) => setHome("faqItems", v.homepageContent.faqItems.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} />
                <Button type="button" variant="ghost" size="sm" aria-label="Remove question" onClick={() => setHome("faqItems", v.homepageContent.faqItems.filter((_, j) => j !== i))}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setHome("faqItems", [...v.homepageContent.faqItems, { q: "", a: "" }])}>
              <Plus className="size-4" /> Add question
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border p-4">
        <p className="font-semibold">Reward wheel</p>
        {!rewardPresentationApproved && (
          <p className="mt-1 rounded-md border border-amber-400/40 bg-amber-400/10 p-2 text-xs text-amber-200">
            Draft — the final public reward presentation is still pending supervisor/ethics approval. This wheel can only be shown in TEST
            sessions; a LIVE session can&apos;t be activated until the decision is approved.
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Result is locked: every spin lands on <span className="font-semibold">bKash Reward</span> (recorded as FIXED). The other items
          are display only.
        </p>
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted-foreground">Displayed items (key must be lowercase letters/digits/_ and unique)</p>
          {items.map((it, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1.5fr_1fr_1fr_auto]">
              <Input aria-label="Key" value={it.key} disabled={it.key === BKASH_REWARD_KEY} onChange={(e) => setReward("displayItems", items.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} />
              <Input aria-label="Label" value={it.label} maxLength={60} onChange={(e) => setReward("displayItems", items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <Input aria-label="Sub-label" value={it.sub} maxLength={40} onChange={(e) => setReward("displayItems", items.map((x, j) => (j === i ? { ...x, sub: e.target.value } : x)))} />
              <select
                aria-label="Tier"
                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                value={it.tier}
                onChange={(e) => setReward("displayItems", items.map((x, j) => (j === i ? { ...x, tier: e.target.value as (typeof TIERS)[number] } : x)))}
              >
                {TIERS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <Button type="button" variant="ghost" size="sm" aria-label="Remove item" disabled={items.length <= 1 || it.key === BKASH_REWARD_KEY} onClick={() => setReward("displayItems", items.filter((_, j) => j !== i))}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={items.length >= 12}
            onClick={() => setReward("displayItems", [...items, { key: `item_${items.length + 1}`, label: "New item", sub: "", tier: "common" }])}
          >
            <Plus className="size-4" /> Add item
          </Button>
        </div>
        <div className="mt-3 grid gap-3">
          <div>
            <Label className="mb-1.5" htmlFor="c-rh">Result headline</Label>
            <Input id="c-rh" maxLength={120} value={v.rewardConfig.resultHeadline} onChange={(e) => setReward("resultHeadline", e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5" htmlFor="c-re">Result explanation (shown in the form and on the confirmation)</Label>
            <Textarea id="c-re" rows={3} maxLength={600} value={v.rewardConfig.resultExplanation} onChange={(e) => setReward("resultExplanation", e.target.value)} />
          </div>
        </div>
      </div>

      <Button onClick={save} disabled={pending}>
        {pending ? "Saving…" : "Save as new version"}
      </Button>
    </fieldset>
  );
}
